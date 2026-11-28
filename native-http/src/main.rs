//! Standalone HTTP entry point. The desktop uses yunqi-core directly.
mod docs;
mod ingress;

use http_body_util::{BodyExt, Full, Limited};
use hyper::{
    body::{Bytes, Incoming},
    header::{CACHE_CONTROL, CONNECTION, CONTENT_TYPE, LOCATION, RETRY_AFTER},
    server::conn::http1,
    service::service_fn,
    Method, Request, Response, StatusCode,
};
use hyper_util::rt::{TokioIo, TokioTimer};
use serde_json::{json, Value};
use std::{
    borrow::Cow, convert::Infallible, env, error::Error, io, net::IpAddr, sync::Arc, time::Instant,
};
use tokio::{
    net::{lookup_host, TcpListener, TcpSocket},
    sync::{OwnedSemaphorePermit, Semaphore},
    task::JoinSet,
};
use tokio_io_timeout::TimeoutStream;
use yunqi_core::{clock_ms, dispatch, dispatch_annual_query};

type HttpReply = Response<Full<Bytes>>;
type Guard = Arc<OwnedSemaphorePermit>;
const JSON: &str = "application/json; charset=utf-8";

struct Payload {
    bytes: Bytes,
    _guard: Guard,
}
impl AsRef<[u8]> for Payload {
    fn as_ref(&self) -> &[u8] {
        &self.bytes
    }
}

// The request slot travels with the response bytes until Hyper releases the buffer.
fn response(status: u16, mime: &str, bytes: Bytes, guard: Option<Guard>) -> HttpReply {
    let data = if let Some(guard) = guard {
        Bytes::from_owner(Payload {
            bytes,
            _guard: guard,
        })
    } else {
        bytes
    };
    let mut reply = Response::new(Full::new(data));
    *reply.status_mut() = StatusCode::from_u16(status).expect("fixed HTTP status");
    reply
        .headers_mut()
        .insert(CONTENT_TYPE, mime.parse().expect("fixed content type"));
    reply
}

fn json_reply(status: u16, value: Value, guard: Option<Guard>) -> HttpReply {
    response(
        status,
        JSON,
        serde_json::to_vec(&value).expect("JSON value").into(),
        guard,
    )
}

fn invalid(guard: Guard, no_store: bool) -> HttpReply {
    let mut reply = json_reply(
        400,
        json!({"code":"INVALID_ARGUMENT","message":"请求参数无效","details":{}}),
        Some(guard),
    );
    if no_store {
        reply
            .headers_mut()
            .insert(CACHE_CONTROL, "no-store".parse().unwrap());
    }
    reply
}

fn busy() -> HttpReply {
    let mut reply = json_reply(
        503,
        json!({"code":"INTERNAL_ERROR","message":"服务繁忙，请稍后重试","details":{}}),
        None,
    );
    reply
        .headers_mut()
        .insert(RETRY_AFTER, "1".parse().unwrap());
    reply
        .headers_mut()
        .insert(CONNECTION, "close".parse().unwrap());
    reply
}

fn internal(guard: Guard) -> HttpReply {
    json_reply(
        500,
        json!({"code":"INTERNAL_ERROR","message":"服务内部错误","details":{}}),
        Some(guard),
    )
}

fn no_store(path: &str) -> bool {
    path.starts_with("/api/v1/yunqi/learning/") || path.starts_with("/api/v1/constitution/")
}

fn has_post(path: &str) -> bool {
    matches!(
        path,
        "/api/v1/yunqi/calculate"
            | "/api/v1/yunqi/learning/calculate"
            | "/api/v1/yunqi/learning/birth-comparison"
            | "/api/v1/yunqi/learning/birth-year-comparison"
            | "/api/v1/yunqi/learning/birth-date-preview"
            | "/api/v1/constitution/assess"
    )
}

// Mirror Fastify's safe JSON reader ahead of the route's schema validation.
fn allowed_fields(value: &Value) -> bool {
    match value {
        Value::Array(items) => items.iter().all(allowed_fields),
        Value::Object(fields) => {
            !fields.contains_key("__proto__")
                && !fields
                    .get("constructor")
                    .is_some_and(|v| v.get("prototype").is_some())
                && fields.values().all(allowed_fields)
        }
        _ => true,
    }
}

async fn read_payload(req: Request<Incoming>) -> Result<Value, ()> {
    let content_type = req
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|h| h.to_str().ok())
        .map(|s| {
            s.split(';')
                .next()
                .unwrap_or("")
                .trim()
                .to_ascii_lowercase()
        });
    let body = req.into_body();
    // Limit the streamed representation, including requests without Content-Length.
    // Reading up to the accepted limit lets clients receive the normal 400 envelope.
    let bytes = Limited::new(body, ingress::MAX_BODY)
        .collect()
        .await
        .map_err(|_| ())?
        .to_bytes();
    match content_type.as_deref() {
        None if bytes.is_empty() => Ok(Value::Null),
        Some("application/json") => {
            // Fastify's JSON reader removes one UTF-8 BOM only at the start.
            let json = bytes.strip_prefix(b"\xef\xbb\xbf").unwrap_or(&bytes);
            let value = serde_json::from_slice(json).map_err(|_| ())?;
            if allowed_fields(&value) {
                Ok(value)
            } else {
                Err(())
            }
        }
        Some("text/plain") => Ok(Value::String(String::from_utf8_lossy(&bytes).into_owned())),
        _ => Err(()),
    }
}

fn decode_segment(segment: &str) -> Result<Cow<'_, str>, ()> {
    let mut bytes = segment.bytes();
    while let Some(byte) = bytes.next() {
        if byte == b'%'
            && !matches!((bytes.next(), bytes.next()), (Some(a), Some(b))
                if a.is_ascii_hexdigit() && b.is_ascii_hexdigit())
        {
            return Err(());
        }
    }
    percent_encoding::percent_decode_str(segment)
        .decode_utf8()
        .map_err(|_| ())
}

const ANNUAL_PREFIX: &str = "/api/v1/yunqi/year/";

enum RoutePath<'a> {
    Static(Cow<'a, str>),
    Annual(Cow<'a, str>),
}

fn route_path(path: &str, annual: bool) -> Result<RoutePath<'_>, ()> {
    if !path.contains('%') {
        if let Some(year) = path.strip_prefix(ANNUAL_PREFIX) {
            if annual && !year.contains('/') {
                return Ok(RoutePath::Annual(Cow::Borrowed(year)));
            }
        }
        return Ok(RoutePath::Static(Cow::Borrowed(path)));
    }
    let mut canonical = String::with_capacity(path.len());
    let mut segments = path.split('/').peekable();
    while let Some(segment) = segments.next() {
        let decoded = decode_segment(segment)?;
        if annual && canonical == ANNUAL_PREFIX && segments.peek().is_none() {
            return Ok(RoutePath::Annual(decoded));
        }
        // An encoded slash is a character in this segment, not a route separator.
        canonical.push_str(if decoded.contains('/') {
            segment
        } else {
            &decoded
        });
        if segments.peek().is_some() {
            canonical.push('/');
        }
    }
    Ok(RoutePath::Static(Cow::Owned(canonical)))
}

async fn handle(
    req: Request<Incoming>,
    peer: IpAddr,
    ingress: Arc<ingress::Ingress>,
) -> Result<HttpReply, Infallible> {
    let Some(permit) = ingress.admit(peer, Instant::now()) else {
        return Ok(busy());
    };
    let guard = Arc::new(permit);
    let raw_method = req.method().clone();
    let method = if raw_method == Method::HEAD {
        Method::GET
    } else {
        raw_method.clone()
    };
    let uri = req.uri().clone();
    let (path, annual) = match route_path(uri.path(), method == Method::GET) {
        Ok(RoutePath::Static(path)) => (path, None),
        Ok(RoutePath::Annual(year)) => (Cow::Borrowed(""), Some(year)),
        Err(()) => {
            return Ok(json_reply(
                400,
                json!({
                    "error":"Bad Request","code":"FST_ERR_BAD_URL",
                    "message":format!("'{uri}' is not a valid url component"),"statusCode":400
                }),
                Some(guard),
            ));
        }
    };
    let mut reply = if method == Method::GET && path == "/docs/static/index.html" {
        let mut redirect = response(302, "text/plain", Bytes::new(), Some(guard));
        redirect
            .headers_mut()
            .insert(LOCATION, "/docs/".parse().unwrap());
        redirect
    } else if let Some(asset) = docs::get(&path).filter(|_| method == Method::GET) {
        // Fastify's static middleware revalidates bundled files, not its generated initializer.
        let cacheable =
            path.starts_with("/docs/static/") && path != "/docs/static/swagger-initializer.js";
        let result = asset.respond(req.headers(), raw_method == Method::HEAD, cacheable);
        let mut reply = response(result.status, asset.mime, result.body, Some(guard));
        if result.status == 304 {
            reply.headers_mut().remove(CONTENT_TYPE);
        }
        reply.headers_mut().extend(result.headers);
        reply
    } else {
        let payload = if method == Method::POST && has_post(&path) {
            match read_payload(req).await {
                Ok(body) => body,
                Err(()) => return Ok(invalid(guard, no_store(&path))),
            }
        } else {
            Value::Null
        };
        let path = path.into_owned();
        let annual = annual.map(Cow::into_owned);
        let task_guard = guard.clone();
        let outcome=tokio::task::spawn_blocking(move ||{
            let _permit=task_guard; // stays active even if the caller disconnects during CPU work
            let mut reply = if let Some(year) = annual {
                dispatch_annual_query(&year)
            } else {
                dispatch(method.as_str(), &path, &payload, clock_ms())
            };
            if reply.status==404 {
                reply.body=json!({"message":format!("Route {}:{} not found",raw_method,uri),"error":"Not Found","statusCode":404});
            }
            reply
        }).await;
        match outcome {
            Ok(value) => {
                let mut r = json_reply(value.status, value.body, Some(guard));
                if value.status != 404
                    && value
                        .headers
                        .get("cache-control")
                        .is_some_and(|v| v == "no-store")
                {
                    r.headers_mut()
                        .insert(CACHE_CONTROL, "no-store".parse().unwrap());
                }
                r
            }
            Err(_) => internal(guard),
        }
    };
    reply
        .headers_mut()
        .insert("x-content-type-options", "nosniff".parse().unwrap());
    Ok(reply)
}

async fn bind_listeners(host: &str, mut port: u16) -> io::Result<Vec<TcpListener>> {
    if !host.eq_ignore_ascii_case("localhost") {
        return Ok(vec![TcpListener::bind((host, port)).await?]);
    }

    let mut listeners = Vec::new();
    let mut seen = Vec::new();
    for mut addr in lookup_host((host, port)).await? {
        // Never expand localhost to an externally reachable address.
        if !addr.ip().is_loopback() || seen.contains(&addr.ip()) {
            continue;
        }
        seen.push(addr.ip());
        addr.set_port(port);
        match TcpListener::bind(addr).await {
            Ok(listener) => {
                // With PORT=0 the first bind chooses the port for every family.
                port = listener.local_addr()?.port();
                listeners.push(listener);
            }
            Err(error)
                if matches!(
                    error.kind(),
                    io::ErrorKind::AddrNotAvailable | io::ErrorKind::Unsupported
                ) => {}
            Err(error) => {
                // Rust does not always classify a disabled address family as Unsupported.
                // Only skip the address if creating a fresh socket fails the same way;
                // a busy port (or other bind failure on an available family) is fatal.
                let socket = if addr.is_ipv4() {
                    TcpSocket::new_v4()
                } else {
                    TcpSocket::new_v6()
                };
                if !socket.is_err_and(|creation| {
                    creation.raw_os_error().is_some()
                        && creation.raw_os_error() == error.raw_os_error()
                }) {
                    return Err(error);
                }
            }
        }
    }
    if listeners.is_empty() {
        return Err(io::Error::new(
            io::ErrorKind::AddrNotAvailable,
            "no available localhost address",
        ));
    }
    Ok(listeners)
}

#[tokio::main(worker_threads = 2)]
async fn main() -> Result<(), Box<dyn Error>> {
    let host = env::var("HOST").unwrap_or_default();
    let host = if host.trim().is_empty() {
        "127.0.0.1"
    } else {
        host.trim()
    };
    let port = env::var("PORT").unwrap_or_else(|_| "3000".into());
    if port.is_empty() || !port.bytes().all(|c| c.is_ascii_digit()) {
        return Err("PORT 必须是 0 到 65535 的整数".into());
    }
    let port: u16 = port.parse().map_err(|_| "PORT 必须是 0 到 65535 的整数")?;
    let listeners = bind_listeners(host, port).await?;
    let ingress = Arc::new(ingress::Ingress::new());
    let slots = Arc::new(Semaphore::new(ingress::CONNECTIONS));
    let mut tasks = JoinSet::new();
    for listener in listeners {
        println!("Server listening at http://{}", listener.local_addr()?);
        tasks.spawn(serve(listener, ingress.clone(), slots.clone()));
    }
    // A listener task should never exit while the service is up.
    if let Some(result) = tasks.join_next().await {
        result?;
    }
    Ok(())
}

async fn serve(listener: TcpListener, ingress: Arc<ingress::Ingress>, slots: Arc<Semaphore>) {
    loop {
        let (tcp, peer) = match listener.accept().await {
            Ok(connection) => connection,
            Err(error)
                if matches!(
                    error.kind(),
                    std::io::ErrorKind::Interrupted | std::io::ErrorKind::ConnectionAborted
                ) =>
            {
                continue
            }
            Err(error) => {
                eprintln!("HTTP accept failed: {error}");
                tokio::time::sleep(std::time::Duration::from_millis(200)).await;
                continue;
            }
        };
        let Ok(slot) = slots.clone().try_acquire_owned() else {
            continue;
        };
        let deadline = tokio::time::Instant::now() + ingress::CONNECTION_LIFETIME;
        let ingress = ingress.clone();
        tokio::spawn(async move {
            let _connection_slot = slot;
            let mut io = TimeoutStream::new(tcp);
            io.set_read_timeout(Some(ingress::IDLE));
            io.set_write_timeout(Some(ingress::IDLE));
            let service = service_fn(move |request| handle(request, peer.ip(), ingress.clone()));
            let mut http = http1::Builder::new();
            http.timer(TokioTimer::new())
                .max_headers(100)
                .max_buf_size(16_384)
                .header_read_timeout(ingress::CONNECTION_LIFETIME);
            let connection = http.serve_connection(TokioIo::new(Box::pin(io)), service);
            // One absolute socket lifetime covers headers, body, writes and keep-alive reuse.
            let _ = tokio::time::timeout_at(deadline, connection).await;
        });
    }
}
