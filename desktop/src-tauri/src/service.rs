use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    io::{self, Write},
    sync::Mutex,
    time::{Duration, Instant},
};
use tokio::sync::Semaphore;

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Request {
    method: String,
    path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    body: Option<Value>,
}

const REQUEST_LIMIT: usize = 64 * 1024;

struct RemainingBytes(usize);

impl Write for RemainingBytes {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        self.0 = self
            .0
            .checked_sub(bytes.len())
            .ok_or(io::ErrorKind::FileTooLarge)?;
        Ok(bytes.len())
    }

    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

#[derive(Serialize)]
pub struct Reply {
    status: u16,
    data: Value,
}

impl Request {
    fn fits_size_limit(&self) -> bool {
        serde_json::to_writer(RemainingBytes(REQUEST_LIMIT), self).is_ok()
    }

    fn supported(&self) -> bool {
        match self.method.as_str() {
            "GET" => {
                self.body.is_none()
                    && (matches!(
                        self.path.as_str(),
                        "/api/v1/yunqi/current"
                            | "/api/v1/yunqi/learning/current"
                            | "/api/v1/constitution/questionnaire"
                    ) || self
                        .path
                        .strip_prefix("/api/v1/yunqi/year/")
                        .is_some_and(|y| {
                            !y.is_empty() && y.len() <= 10 && y.bytes().all(|b| b.is_ascii_digit())
                        }))
            }
            "POST" => matches!(
                self.path.as_str(),
                "/api/v1/yunqi/calculate"
                    | "/api/v1/yunqi/learning/calculate"
                    | "/api/v1/yunqi/learning/birth-comparison"
                    | "/api/v1/yunqi/learning/birth-date-preview"
                    | "/api/v1/yunqi/learning/birth-year-comparison"
                    | "/api/v1/constitution/assess"
            ),
            _ => false,
        }
    }
}

pub struct Service {
    // The original worker's single local peer had a 20-requests/second budget.
    budget: Mutex<(Instant, u32)>,
    active: Semaphore,
}
impl Service {
    pub fn new() -> Self {
        Self {
            budget: Mutex::new((Instant::now(), 0)),
            active: Semaphore::new(32),
        }
    }
    fn accept(&self) -> bool {
        let mut budget = self.budget.lock().unwrap_or_else(|p| p.into_inner());
        if budget.1 == 0 || budget.0.elapsed() >= Duration::from_secs(1) {
            *budget = (Instant::now(), 0);
        }
        if budget.1 >= 20 {
            return false;
        }
        budget.1 += 1;
        true
    }
}

#[tauri::command]
pub async fn calculate(
    service: tauri::State<'_, Service>,
    request: Request,
) -> Result<Reply, &'static str> {
    if !request.supported() {
        return Err("不支持此操作");
    }
    if !request.fits_size_limit() {
        return Err("请求过大");
    }
    let body = request.body.unwrap_or(Value::Null);
    let busy = || Reply {
        status: 503,
        data: json!({"code":"INTERNAL_ERROR","message":"服务繁忙，请稍后重试","details":{}}),
    };
    let Ok(_permit) = service.active.try_acquire() else {
        return Ok(busy());
    };
    if !service.accept() {
        return Ok(busy());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let reply = yunqi_core::dispatch(
            &request.method,
            &request.path,
            &body,
            yunqi_core::clock_ms(),
        );
        Reply {
            status: reply.status,
            data: reply.body,
        }
    })
    .await
    .map_err(|_| "本地计算失败")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compact_request_limit_counts_bytes_including_escapes_and_envelope() {
        let mut request = Request {
            method: "POST".into(),
            path: "/api/v1/yunqi/calculate".into(),
            body: Some(json!("时点\n\"")),
        };
        let base_len = serde_json::to_vec(&request).unwrap().len();
        let Value::String(value) = request.body.as_mut().unwrap() else {
            unreachable!()
        };
        value.extend(std::iter::repeat_n('a', REQUEST_LIMIT - base_len));
        assert!(request.fits_size_limit());
        let Value::String(value) = request.body.as_mut().unwrap() else {
            unreachable!()
        };
        value.push('b');
        assert!(!request.fits_size_limit());
    }
}
