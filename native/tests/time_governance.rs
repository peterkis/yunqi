//! Business time comes from explicitly supplied Beijing local fields and the fixed
//! offset. Only the outer transport may read "now". Run with `cargo test --locked`.
use serde_json::{json, Value};
use std::fs;
use std::io::Write;
use std::path::Path;
use std::process::{Command, Stdio};

fn check_sources(path: &Path) {
    for entry in fs::read_dir(path).unwrap() {
        let path = entry.unwrap().path();
        if path.is_dir() {
            check_sources(&path);
            continue;
        }
        if path.extension().and_then(|x| x.to_str()) != Some("rs") {
            continue;
        }
        let source = fs::read_to_string(&path).unwrap();
        // Forbid clock and machine-zone capabilities in native business modules.
        // Fixtures and standalone benchmarks remain outside these directories.
        for token in [
            "SystemTime",
            "chrono::Local",
            "chrono_tz",
            "Local::now",
            "Utc::now",
            "Instant::now",
            "std::env::var",
            "env::var(",
            "localtime(",
            "localtime_r(",
            "localtime_s(",
            "Asia/Shanghai",
        ] {
            assert!(
                !source.contains(token),
                "host time capability {token:?} in {}",
                path.display()
            );
        }
    }
}

#[test]
fn business_modules_have_no_host_clock_or_machine_zone_dependencies() {
    let src = Path::new(env!("CARGO_MANIFEST_DIR")).join("src");
    for module in ["domain", "calendar", "constitution"] {
        check_sources(&src.join(module));
    }
}

fn probe(timezone: &str) -> Vec<Value> {
    let now = 1_794_801_600_000_i64;
    let q = |path: &str, date: &str| json!({"method":"POST", "path":path, "body":{"dateTime":date},"nowMs":now});
    let learning = "/api/v1/yunqi/learning/calculate";
    let requests = [
        // China observed DST in 1991. Business clocks must still use fixed UTC+08.
        q(learning, "1991-07-01T00:30:00.001"),
        q(learning, "1991-06-30T16:30:00.001Z"),
        // Actual 2024 Dahan boundary with a one millisecond step on either side.
        q(learning, "2024-01-20T22:07:21.999"),
        q(learning, "2024-01-20T22:07:22.000"),
        json!({"method":"GET","path":"/api/v1/yunqi/current","nowMs":now}),
        json!({"method":"POST","path":"/api/v1/yunqi/learning/birth-date-preview","body":{"year":2023,"calendar":"lunar","month":2,"day":1},"nowMs":now}),
    ];
    let mut child = Command::new(env!("CARGO_BIN_EXE_yunqi-probe"))
        .env("TZ", timezone)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .unwrap();
    {
        let mut stdin = child.stdin.take().unwrap();
        for request in &requests {
            writeln!(stdin, "{request}").unwrap();
        }
    }
    let result = child.wait_with_output().unwrap();
    assert!(result.status.success(), "probe failed for {timezone}");
    let responses: Vec<Value> = String::from_utf8(result.stdout)
        .unwrap()
        .lines()
        .map(|line| serde_json::from_str::<Value>(line).unwrap())
        .collect();
    assert_eq!(responses.len(), requests.len());
    assert!(responses.iter().all(|r| r["status"] == 200), "{timezone}");
    responses
}

#[test]
fn same_fixed_beijing_results_in_different_host_time_zones() {
    let utc = probe("UTC");
    assert_eq!(
        utc[0], utc[1],
        "fixed Beijing input and equivalent UTC input"
    );
    assert_eq!(utc[2]["body"]["data"]["facts"]["year"], 2023);
    assert_eq!(utc[3]["body"]["data"]["facts"]["year"], 2024);
    for zone in ["Asia/Shanghai", "America/Los_Angeles", "Pacific/Auckland"] {
        assert_eq!(utc, probe(zone), "{zone}");
    }
}
