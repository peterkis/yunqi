//! Build both encodings from the tracked offline Swagger assets.
use flate2::read::GzDecoder;
use std::{env, fs, io, path::PathBuf};

fn main() -> io::Result<()> {
    // Watch the directory so newly added or removed assets also rerun this build step.
    println!("cargo:rerun-if-changed=assets");
    let out_dir = PathBuf::from(env::var_os("OUT_DIR").expect("Cargo build output directory"));
    for entry in fs::read_dir("assets")? {
        let path = entry?.path();
        if path.extension().is_none_or(|ext| ext != "gz") {
            continue;
        }
        let mut gzip = GzDecoder::new(fs::File::open(&path)?);
        let mut identity =
            fs::File::create(out_dir.join(path.file_stem().expect("gzip asset name")))?;
        io::copy(&mut gzip, &mut identity).map_err(|error| {
            io::Error::new(error.kind(), format!("{}: {error}", path.display()))
        })?;
    }
    Ok(())
}
