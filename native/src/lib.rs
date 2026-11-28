//! Shared engine for the Tauri desktop command and the HTTP service.
pub mod calendar;
pub mod constitution;
pub mod domain;
mod validation;

use serde::Serialize;
use serde_json::{json, Value};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Serialize)]
pub struct Reply {
    pub status: u16,
    pub body: Value,
    pub headers: Value,
}

pub fn clock_ms() -> i64 {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(elapsed) => elapsed.as_millis() as i64,
        Err(before) => -(before.duration().as_millis() as i64),
    }
}
const YUNQI: &str = "/api/v1/yunqi/";
const LEARNING: &str = "/api/v1/yunqi/learning/";
const SCALE: &str = "/api/v1/constitution/";

fn business_error(message: String) -> Value {
    if message == "历法服务暂时不可用"
        || message.starts_with("节气查询")
        || message.starts_with("节气时间无效")
    {
        json!({"code":"CALENDAR_PROVIDER_UNAVAILABLE","message":"历法服务暂时不可用","details":{}})
    } else {
        json!({"code":"INVALID_ARGUMENT","message":message,"details":{}})
    }
}

fn invoke(method: &str, path: &str, body: &Value, now: i64) -> Option<Result<Value, Value>> {
    if method == "GET" && path == "/health" {
        return Some(Ok(json!({"status":"ok","apiVersion":"v1"})));
    }
    let endpoint = path.strip_prefix(YUNQI);
    let clock = || calendar::YunQiCalendarTime::from_clock_epoch(now);
    let data = match (method, endpoint) {
        ("GET", Some(year))
            if year
                .strip_prefix("year/")
                .is_some_and(|y| !y.is_empty() && !y.contains('/')) =>
        {
            validation::integer(&json!(&year[5..]), "/year", 1900, 2100)
                .and_then(|y| domain::year(y).map_err(business_error))
        }
        ("GET", Some("current")) => domain::current(clock()).map_err(business_error),
        ("GET", Some("learning/current")) => domain::learning(clock()).map_err(business_error),
        ("POST", Some(op @ ("calculate" | "learning/calculate"))) => {
            validation::request(body, "CalculateRequest").and_then(|b| {
                let time = calendar::parse_datetime(b["dateTime"].as_str().unwrap())
                    .map_err(business_error)?;
                (if op == "calculate" {
                    domain::current(time)
                } else {
                    domain::learning(time)
                })
                .map_err(business_error)
            })
        }
        ("POST", Some("learning/birth-comparison")) => validation::request(body, "BirthRequest")
            .and_then(|b| calendar::birth::comparison(&b, clock()).map_err(business_error)),
        ("POST", Some("learning/birth-year-comparison")) => {
            validation::request(body, "BirthYearRequest")
                .and_then(|b| calendar::birth::year(&b, clock()).map_err(business_error))
        }
        ("POST", Some("learning/birth-date-preview")) => {
            validation::request(body, "BirthDatePreviewRequest")
                .and_then(|b| calendar::birth::preview(&b, clock()).map_err(business_error))
        }
        ("GET", None) if path == "/api/v1/constitution/questionnaire" => {
            Ok(constitution::questionnaire())
        }
        ("POST", None) if path == "/api/v1/constitution/assess" => constitution::assess(body),
        _ => return None,
    };
    Some(data)
}

pub fn dispatch(method: &str, path: &str, body: &Value, now: i64) -> Reply {
    let headers = if path.starts_with(LEARNING) || path.starts_with(SCALE) {
        json!({"cache-control":"no-store"})
    } else {
        json!({})
    };
    match invoke(method, path, body, now) {
        Some(Ok(data)) => {
            let mut body = json!({"code":"SUCCESS","message":""});
            body["data"] = data;
            Reply {
                status: 200,
                body,
                headers,
            }
        }
        Some(Err(body)) => Reply {
            status: if body["code"] == "CALENDAR_PROVIDER_UNAVAILABLE" {
                503
            } else {
                400
            },
            body,
            headers,
        },
        None => Reply {
            status: 404,
            body: json!({"message":format!("Route {method}:{path} not found"),"error":"Not Found","statusCode":404}),
            headers: json!({}),
        },
    }
}
