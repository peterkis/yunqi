//! Deterministic replay entry point for development. The desktop application uses the system clock.
use serde::Deserialize;
use serde_json::Value;
use std::io::{self, BufRead, Write};
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Call {
    method: String,
    path: String,
    #[serde(default)]
    body: Value,
    now_ms: i64,
}
fn main() -> io::Result<()> {
    let mut out = io::BufWriter::new(io::stdout().lock());
    for line in io::stdin().lock().lines() {
        let request = serde_json::from_str::<Call>(&line?)?;
        let reply = yunqi_core::dispatch(
            &request.method,
            &request.path,
            &request.body,
            request.now_ms,
        );
        serde_json::to_writer(&mut out, &reply)?;
        out.write_all(b"\n")?;
        out.flush()?;
    }
    Ok(())
}
