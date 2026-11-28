use std::{
    env, fs,
    io::{self, Seek, SeekFrom, Write},
    os::windows::fs::OpenOptionsExt,
    path::{Path, PathBuf},
    process,
    time::Duration,
};

use serde::Serialize;
use tauri::{Emitter, Manager, WebviewWindow};
use tokio::sync::{watch, Mutex};

use crate::{
    update_protocol::{
        clear_authorization, invalid, remove, verify_file, Envelope, Release, Source, CHUNK,
        METADATA_LIMIT,
    },
    update_windows::{cpu_times, open_parent, resources_available, wait_parent, watch_lock},
};

const CHANGE: &str = "desktop-update-changed";
const UPDATER_ARG: &str = "--yunqi-install-update";
const CHECK_LATER: Duration = Duration::from_secs(900);

pub struct Updater {
    source: Source,
    root: PathBuf,
    operation: Mutex<()>,
}

#[derive(Serialize, Default)]
pub struct Status {
    version: Option<String>,
    digest: Option<String>,
    scheduled: bool,
    failed: bool,
}

fn record(file: &Path, bytes: &[u8]) -> io::Result<()> {
    let temporary = file.with_extension("tmp");
    fs::write(&temporary, bytes)?;
    fs::rename(temporary, file)
}

fn inspect(file: &Path, source: &Source) -> io::Result<(Envelope, Release)> {
    if fs::metadata(file)?.len() > METADATA_LIMIT {
        return Err(invalid());
    }
    let envelope = serde_json::from_slice(&fs::read(file)?).map_err(|_| invalid())?;
    let release = source.release(&envelope)?.ok_or_else(invalid)?;
    Ok((envelope, release))
}

fn webview_satisfies(release: &Release) -> bool {
    release.supports_webview(
        tauri::webview_version()
            .ok()
            .and_then(|version| version.split('.').next()?.parse::<u32>().ok()),
    )
}

fn open_cached_package(path: &Path, expected: u64) -> io::Result<(fs::File, u64)> {
    let mut file = fs::OpenOptions::new()
        .create(true)
        .truncate(false)
        .write(true)
        .open(path)?;
    let length = file.metadata()?.len();
    let offset = if length == expected {
        length
    } else if length < expected {
        length / CHUNK * CHUNK
    } else {
        0
    };
    if offset != length {
        file.set_len(offset)?;
    }
    file.seek(SeekFrom::Start(offset))?;
    Ok((file, offset))
}

fn randomized_delay(minimum: u8, spread: u8) -> Duration {
    let mut sample = [0];
    let _ = getrandom::fill(&mut sample);
    Duration::from_secs(u64::from(minimum + sample[0] % spread))
}

impl Updater {
    fn ready(&self) -> io::Result<Release> {
        inspect(&self.root.join("ready.json"), &self.source).map(|(_, release)| release)
    }

    fn scheduled(&self, release: &Release) -> bool {
        fs::read_to_string(self.root.join("next.txt"))
            .is_ok_and(|digest| release.matches_manifest(&digest))
    }

    fn status(&self) -> Status {
        let ready = self.ready().ok();
        Status {
            scheduled: ready
                .as_ref()
                .is_some_and(|release| self.scheduled(release)),
            digest: ready
                .as_ref()
                .map(|release| release.manifest_digest.clone()),
            version: ready.map(|release| release.version),
            failed: self.root.join("failed.txt").is_file(),
        }
    }

    async fn download(
        &self,
        window: &WebviewWindow,
        locked: &watch::Receiver<bool>,
    ) -> io::Result<()> {
        let _operation = self.operation.lock().await;
        let mut ready = self.ready().ok();
        let check = self
            .source
            .check_manifest(&self.root, ready.as_ref())
            .await?;
        if check.revoked {
            ready = None;
            let _ = window.emit(CHANGE, ());
        }
        let Some((envelope, release)) = check.installable else {
            return Ok(());
        };
        if !webview_satisfies(&release) {
            if ready.is_some() {
                self.clear_authorization(window)?;
            }
            return Ok(());
        }
        if ready
            .as_ref()
            .is_some_and(|ready| release.matches_manifest(&ready.manifest_digest))
        {
            return Ok(());
        }

        let candidate = self.root.join("candidate.json");
        let package = self.root.join("package.exe");
        let cached = inspect(&candidate, &self.source)
            .ok()
            .map(|(_, release)| release);
        if !cached
            .as_ref()
            .is_some_and(|cached| release.matches_manifest(&cached.manifest_digest))
        {
            remove(&self.root.join("failed.txt"))?;
            self.clear_authorization(window)?;
            // Consent and readiness are manifest-specific; signed package bytes
            // can still be reused when the package and its chunk layout agree.
            if !cached
                .as_ref()
                .is_some_and(|cached| release.can_reuse_package(cached))
            {
                remove(&package)?;
            }
            record(&candidate, &serde_json::to_vec(&envelope)?)?;
        } else if ready.is_some() {
            self.clear_authorization(window)?;
        }

        let (mut file, mut offset) = open_cached_package(&package, release.length)?;
        while offset < release.length {
            if !*locked.borrow() {
                return Ok(());
            }
            let bytes = self
                .source
                .chunk(&release, (offset / CHUNK) as usize)
                .await?;
            // Commit only a verified part, as one synchronous local write. No await can
            // abandon the write while the next download is opening the same file.
            file.write_all(&bytes)?;
            offset += bytes.len() as u64;
        }
        drop(file);
        if let Err(error) = verify_file(&package, &release).await {
            remove(&package)?;
            return Err(error);
        }
        record(
            &self.root.join("ready.json"),
            &serde_json::to_vec(&envelope)?,
        )?;
        let _ = window.emit(CHANGE, ());
        Ok(())
    }

    async fn download_when_idle(&self, window: &WebviewWindow, mut locked: watch::Receiver<bool>) {
        loop {
            if locked.wait_for(|state| *state).await.is_err() {
                return;
            }
            let mut delay = randomized_delay(5, 21);
            while *locked.borrow_and_update() {
                tokio::select! {
                    _ = tokio::time::sleep(delay) => {}
                    _ = locked.changed() => break,
                }
                if !*locked.borrow() {
                    break;
                }
                let Some(previous) = cpu_times() else {
                    delay = CHECK_LATER;
                    continue;
                };
                tokio::select! {
                    _ = tokio::time::sleep(Duration::from_secs(2)) => {}
                    _ = locked.changed() => break,
                }
                let Some(mut times) =
                    cpu_times().filter(|current| resources_available(previous, *current))
                else {
                    delay = randomized_delay(20, 30);
                    continue;
                };
                let polling = async {
                    loop {
                        tokio::time::sleep(Duration::from_secs(2)).await;
                        let Some(current) =
                            cpu_times().filter(|current| resources_available(times, *current))
                        else {
                            break;
                        };
                        times = current;
                    }
                };
                let current_lock = locked.clone();
                tokio::select! {
                    biased;
                    _ = locked.changed() => break,
                    _ = polling => delay = randomized_delay(20, 30),
                    outcome = self.download(window, &current_lock) => {
                        delay = if outcome.is_ok() { CHECK_LATER } else { randomized_delay(15, 35) };
                    }
                }
            }
        }
    }

    async fn install(&self, window: &WebviewWindow, requested: Option<&str>) -> io::Result<bool> {
        let _operation = self.operation.lock().await;
        let Ok(release) = self.ready() else {
            return Ok(false);
        };
        if !requested.map_or_else(
            || self.scheduled(&release),
            |digest| release.matches_manifest(digest),
        ) || !webview_satisfies(&release)
        {
            return Ok(false);
        }

        // If the source is unavailable, skip disk hashing and open the installed
        // version promptly. Repeat the challenge close to the hand-off.
        if !self.source.approve(&release).await? {
            self.clear_authorization(window)?;
            return Ok(false);
        }
        let package = self.root.join("package.exe");
        if let Err(error) = verify_file(&package, &release).await {
            self.clear_authorization(window)?;
            remove(&package)?;
            return Err(error);
        }
        if !self.source.approve(&release).await? {
            self.clear_authorization(window)?;
            return Ok(false);
        }

        remove(&self.root.join("next.txt"))?;
        remove(&self.root.join("failed.txt"))?;
        remove(&self.root.join("armed.txt"))?;
        let original = env::current_exe()?;
        let helper = self.root.join("install-helper.exe");
        fs::copy(&original, &helper)?;
        let mut child = process::Command::new(&helper)
            .arg(UPDATER_ARG)
            .arg(process::id().to_string())
            .arg(original)
            .arg(&release.manifest_digest)
            .spawn()?;

        let armed = self.root.join("armed.txt");
        if tokio::time::timeout(Duration::from_secs(2), async {
            while !armed.is_file() {
                if child.try_wait()?.is_some() {
                    return Err(invalid());
                }
                tokio::time::sleep(Duration::from_millis(25)).await;
            }
            Ok::<_, io::Error>(())
        })
        .await
        .is_ok_and(|result| result.is_ok())
        {
            window.app_handle().exit(0);
            Ok(true)
        } else {
            let _ = child.kill();
            let _ = child.wait();
            Err(invalid())
        }
    }

    fn clear_authorization(&self, window: &WebviewWindow) -> io::Result<()> {
        clear_authorization(&self.root)?;
        let _ = window.emit(CHANGE, ());
        Ok(())
    }
}

#[tauri::command]
pub fn update_status(window: WebviewWindow) -> Status {
    window
        .try_state::<Updater>()
        .map_or_else(Status::default, |updater| updater.status())
}

#[tauri::command]
pub async fn update_action(
    window: WebviewWindow,
    digest: String,
    action: String,
) -> Result<(), &'static str> {
    let updater = window.try_state::<Updater>().ok_or("更新源尚未配置")?;
    let result = match action.as_str() {
        "now" => updater.install(&window, Some(&digest)).await,
        "next" => {
            let _operation = updater.operation.lock().await;
            match updater.ready() {
                Ok(release) if release.matches_manifest(&digest) && webview_satisfies(&release) => {
                    record(
                        &updater.root.join("next.txt"),
                        release.manifest_digest.as_bytes(),
                    )
                    .map(|_| true)
                }
                _ => Ok(false),
            }
        }
        _ => Ok(false),
    };
    let _ = window.emit(CHANGE, ());
    match result {
        Ok(true) => Ok(()),
        _ => Err("更新暂不可安装，当前版本可继续使用"),
    }
}

pub fn start(window: &WebviewWindow) -> bool {
    let Some(source) = Source::configured() else {
        return false;
    };
    let Ok(data) = window.path().app_local_data_dir() else {
        return false;
    };
    let root = data.join("updates");
    if fs::create_dir_all(&root).is_err() {
        return false;
    }
    let locked = window
        .hwnd()
        .ok()
        .and_then(|handle| watch_lock(handle.0).ok());
    let updater = Updater {
        source,
        root,
        operation: Mutex::new(()),
    };
    let scheduled = updater
        .ready()
        .is_ok_and(|release| updater.scheduled(&release));
    window.manage(updater);
    let window = window.clone();
    tauri::async_runtime::spawn(async move {
        let updater = window.state::<Updater>();
        if scheduled {
            if updater
                .install(&window, None)
                .await
                .is_ok_and(|applied| applied)
            {
                return;
            }
            let _ = window.show();
        }
        if let Some(locked) = locked {
            updater.download_when_idle(&window, locked).await;
        }
    });
    scheduled
}

fn exclusive(path: &Path) -> io::Result<fs::File> {
    fs::OpenOptions::new()
        .create(true)
        .truncate(false)
        .write(true)
        .share_mode(0)
        .open(path)
}

pub fn installing() -> bool {
    env::var_os("LOCALAPPDATA").is_some_and(|data| {
        let path = PathBuf::from(data)
            .join("cn.yunqi.offlinepilot")
            .join("updates/install.lock");
        matches!(exclusive(&path), Err(error) if error.raw_os_error() == Some(32))
    })
}

fn handoff(pid: u32, original: &Path, manifest_digest: &str) -> io::Result<()> {
    let helper = env::current_exe()?;
    let root = helper.parent().ok_or_else(invalid)?;
    if helper.file_name().and_then(|name| name.to_str()) != Some("install-helper.exe") {
        return Err(invalid());
    }
    let lock = exclusive(&root.join("install.lock"))?;
    let source = Source::configured().ok_or_else(invalid)?;
    let (_, release) = inspect(&root.join("ready.json"), &source)?;
    if !release.matches_manifest(manifest_digest) {
        return Err(invalid());
    }
    let parent = open_parent(pid)?;
    let armed = fs::write(root.join("armed.txt"), []);
    if !wait_parent(parent) || armed.is_err() {
        return Err(invalid());
    }
    let package = root.join("package.exe");
    let success = tauri::async_runtime::block_on(verify_file(&package, &release)).is_ok()
        && webview_satisfies(&release)
        && process::Command::new(&package)
            .args(["/S", "/UPDATE"])
            .status()
            .is_ok_and(|status| status.success());
    if success {
        let _ = remove(&root.join("ready.json"));
        let _ = remove(&root.join("candidate.json"));
        let _ = remove(&package);
    } else {
        let _ = record(&root.join("failed.txt"), release.version.as_bytes());
    }
    let _ = remove(&root.join("armed.txt"));
    drop(lock);
    process::Command::new(original).spawn()?;
    Ok(())
}

pub fn handle_helper() -> bool {
    let mut args = env::args_os().skip(1);
    if args.next().is_none_or(|arg| arg != UPDATER_ARG) {
        return false;
    }
    if let (Some(pid), Some(original), Some(manifest_digest)) =
        (args.next(), args.next(), args.next())
    {
        if let (Some(pid), Some(manifest_digest)) = (
            pid.to_str().and_then(|pid| pid.parse().ok()),
            manifest_digest.to_str(),
        ) {
            let _ = handoff(pid, Path::new(&original), manifest_digest);
        }
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cached_package_reuses_complete_parts_after_a_partial_write() {
        let mut nonce = [0; 16];
        getrandom::fill(&mut nonce).unwrap();
        let path = env::temp_dir().join(format!("yunqi-cache-{}.tmp", hex::encode(nonce)));
        let mut initial = fs::OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&path)
            .unwrap();
        initial.write_all(b"MZ").unwrap();
        initial.set_len(CHUNK + 1).unwrap();
        drop(initial);

        let result = (|| -> io::Result<(u64, Vec<u8>)> {
            let (mut file, offset) = open_cached_package(&path, CHUNK + 4)?;
            file.write_all(b"tail")?;
            drop(file);
            Ok((offset, fs::read(&path)?))
        })();
        remove(&path).unwrap();
        let (offset, bytes) = result.expect("resume on Windows");
        assert_eq!(offset, CHUNK);
        assert_eq!(bytes.len(), CHUNK as usize + 4);
        assert_eq!(&bytes[..2], b"MZ");
        assert_eq!(&bytes[CHUNK as usize..], b"tail");
    }
}
