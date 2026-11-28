//! Embed both encodings and stable, representation-specific validators.
use flate2::read::GzDecoder;
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    env,
    ffi::{OsStr, OsString},
    fs,
    io::{self, Read},
    path::{Path, PathBuf},
};

fn write_tag(out_dir: &Path, name: &OsStr, digest: &str) -> io::Result<()> {
    let mut tag_file = OsString::from("etag-");
    tag_file.push(name);
    fs::write(out_dir.join(tag_file), format!("\"{digest}\""))
}

fn invalid(message: impl Into<String>) -> io::Error {
    io::Error::new(io::ErrorKind::InvalidData, message.into())
}

fn revisions() -> io::Result<BTreeMap<&'static str, (&'static str, &'static str)>> {
    let mut revisions = BTreeMap::new();
    for line in include_str!("assets-revisions.txt").lines().map(str::trim) {
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let fields = line.split('|').map(str::trim).collect::<Vec<_>>();
        let [digest, date, name] = fields.as_slice() else {
            return Err(invalid(format!("Invalid asset revision row: {line}")));
        };
        let parsed = httpdate::parse_http_date(date)
            .map_err(|_| invalid(format!("Invalid asset revision date: {line}")))?;
        if httpdate::fmt_http_date(parsed) != *date
            || revisions.insert(*name, (*digest, *date)).is_some()
        {
            return Err(invalid(format!(
                "Invalid or duplicate asset revision row: {line}"
            )));
        }
    }
    Ok(revisions)
}

fn write_last_modified(out_dir: &Path, name: &OsStr, date: &str) -> io::Result<()> {
    let mut destination = OsString::from("last-modified-");
    destination.push(name);
    fs::write(out_dir.join(destination), date)
}

fn main() -> io::Result<()> {
    // Watch the directory so newly added or removed assets also rerun this build step.
    println!("cargo:rerun-if-changed=assets");
    println!("cargo:rerun-if-changed=assets-revisions.txt");
    let mut revisions = revisions()?;
    let out_dir = PathBuf::from(env::var_os("OUT_DIR").expect("Cargo build output directory"));
    for entry in fs::read_dir("assets")? {
        let entry = entry?;
        if !entry.file_type()?.is_file() {
            continue;
        }
        let path = entry.path();
        let bytes = fs::read(&path)?;
        let filename = entry.file_name();
        let (expected, date) = filename
            .to_str()
            .and_then(|name| revisions.remove(name))
            .ok_or_else(|| {
                invalid(format!(
                    "{} needs a row in assets-revisions.txt",
                    path.display()
                ))
            })?;
        let digest = format!("{:x}", Sha256::digest(&bytes));
        if digest != expected {
            return Err(invalid(format!(
                "{} changed; update its digest and revision time in assets-revisions.txt",
                path.display()
            )));
        }
        write_tag(&out_dir, &filename, &digest)?;
        write_last_modified(&out_dir, &filename, date)?;
        if path.extension().is_some_and(|ext| ext == "gz") {
            let mut identity = Vec::new();
            GzDecoder::new(bytes.as_slice())
                .read_to_end(&mut identity)
                .map_err(|error| {
                    io::Error::new(error.kind(), format!("{}: {error}", path.display()))
                })?;
            let name = path.file_stem().expect("gzip asset name");
            fs::write(out_dir.join(name), &identity)?;
            write_tag(&out_dir, name, &format!("{:x}", Sha256::digest(&identity)))?;
            write_last_modified(&out_dir, name, date)?;
        }
    }
    if let Some((name, _)) = revisions.first_key_value() {
        return Err(invalid(format!(
            "Asset revision has no matching source file: {name}"
        )));
    }
    Ok(())
}
