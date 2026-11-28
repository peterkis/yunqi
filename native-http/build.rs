//! Embed both encodings and stable, representation-specific validators.
use flate2::read::GzDecoder;
use sha2::{Digest, Sha256};
use std::{
    env,
    ffi::{OsStr, OsString},
    fs,
    io::{self, Read},
    path::{Path, PathBuf},
};

fn write_tag(out_dir: &Path, name: &OsStr, bytes: &[u8]) -> io::Result<()> {
    let mut tag_file = OsString::from("etag-");
    tag_file.push(name);
    fs::write(
        out_dir.join(tag_file),
        format!("\"{:x}\"", Sha256::digest(bytes)),
    )
}

fn main() -> io::Result<()> {
    // Watch the directory so newly added or removed assets also rerun this build step.
    println!("cargo:rerun-if-changed=assets");
    let out_dir = PathBuf::from(env::var_os("OUT_DIR").expect("Cargo build output directory"));
    for entry in fs::read_dir("assets")? {
        let entry = entry?;
        if !entry.file_type()?.is_file() {
            continue;
        }
        let path = entry.path();
        let bytes = fs::read(&path)?;
        write_tag(&out_dir, &entry.file_name(), &bytes)?;
        if path.extension().is_some_and(|ext| ext == "gz") {
            let mut identity = Vec::new();
            GzDecoder::new(bytes.as_slice())
                .read_to_end(&mut identity)
                .map_err(|error| {
                    io::Error::new(error.kind(), format!("{}: {error}", path.display()))
                })?;
            let name = path.file_stem().expect("gzip asset name");
            fs::write(out_dir.join(name), &identity)?;
            write_tag(&out_dir, name, &identity)?;
        }
    }
    Ok(())
}
