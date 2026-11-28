//! These assets are the offline Swagger UI and OpenAPI snapshots from the reference service.
use hyper::{
    body::Bytes,
    header::{
        ACCEPT_ENCODING, ACCEPT_RANGES, CACHE_CONTROL, CONTENT_ENCODING, CONTENT_LENGTH,
        CONTENT_RANGE, CONTENT_SECURITY_POLICY, ETAG, IF_MATCH, IF_NONE_MATCH, IF_RANGE, RANGE,
        VARY,
    },
    HeaderMap,
};
use std::{cmp::Ordering, ops::Range};

#[derive(Clone, Copy)]
struct Representation {
    bytes: &'static [u8],
    tag: &'static str,
}

pub struct Asset {
    identity: Representation,
    gzip: Option<Representation>,
    pub mime: &'static str,
}

macro_rules! asset {
    ($name:literal, $mime:literal) => {
        Asset {
            identity: Representation {
                bytes: include_bytes!(concat!("../assets/", $name)),
                tag: include_str!(concat!(env!("OUT_DIR"), "/etag-", $name)),
            },
            gzip: None,
            mime: $mime,
        }
    };
    ($name:literal, $mime:literal, gzip) => {{
        static IDENTITY: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/", $name));
        Asset {
            identity: Representation {
                bytes: IDENTITY,
                tag: include_str!(concat!(env!("OUT_DIR"), "/etag-", $name)),
            },
            gzip: Some(Representation {
                bytes: include_bytes!(concat!("../assets/", $name, ".gz")),
                tag: include_str!(concat!(env!("OUT_DIR"), "/etag-", $name, ".gz")),
            }),
            mime: $mime,
        }
    }};
}

// The HTTP build can serve gzip or identity for its precompressed Swagger assets.
pub fn prefers_gzip(headers: &HeaderMap) -> bool {
    let (mut gzip, mut identity, mut wildcard) = (None, None, None);
    for value in headers.get_all(ACCEPT_ENCODING) {
        let Ok(value) = value.to_str() else { continue };
        for item in value.split(',') {
            let (coding, params) = item.trim().split_once(';').unwrap_or((item.trim(), ""));
            let weight = if params.is_empty() {
                1.0
            } else {
                params
                    .trim()
                    .split_once('=')
                    .filter(|(name, _)| name.trim().eq_ignore_ascii_case("q"))
                    .and_then(|(_, v)| v.trim().parse::<f32>().ok())
                    .filter(|q| (0.0..=1.0).contains(q))
                    .unwrap_or(0.0)
            };
            let coding = coding.trim();
            if coding.eq_ignore_ascii_case("gzip") || coding.eq_ignore_ascii_case("x-gzip") {
                gzip = Some(weight);
            } else if coding.eq_ignore_ascii_case("identity") {
                identity = Some(weight);
            } else if coding == "*" {
                wildcard = Some(weight);
            }
        }
    }
    let weight = gzip.or(wildcard).unwrap_or(0.0);
    weight > 0.0 && weight >= identity.unwrap_or(0.0)
}

pub fn get(path: &str) -> Option<Asset> {
    Some(match path {
        "/docs" => asset!("index.html", "text/html; charset=utf-8"),
        "/docs/" => asset!("index-slash.html", "text/html; charset=utf-8"),
        "/docs/json" => asset!("json", "application/json; charset=utf-8"),
        "/docs/yaml" => asset!("yaml", "application/x-yaml"),
        "/docs/static/swagger-initializer.js" => asset!(
            "swagger-initializer.js",
            "application/javascript; charset=utf-8",
            gzip
        ),
        "/docs/static/swagger-ui-bundle.js" => asset!(
            "swagger-ui-bundle.js",
            "application/javascript; charset=utf-8",
            gzip
        ),
        "/docs/static/swagger-ui-standalone-preset.js" => asset!(
            "swagger-ui-standalone-preset.js",
            "application/javascript; charset=utf-8",
            gzip
        ),
        "/docs/static/swagger-ui.js" => asset!(
            "swagger-ui.js",
            "application/javascript; charset=utf-8",
            gzip
        ),
        "/docs/static/swagger-ui.css" => asset!("swagger-ui.css", "text/css; charset=utf-8", gzip),
        "/docs/static/index.css" => asset!("index.css", "text/css; charset=utf-8", gzip),
        "/docs/static/oauth2-redirect.js" => asset!(
            "oauth2-redirect.js",
            "application/javascript; charset=utf-8",
            gzip
        ),
        "/docs/static/oauth2-redirect.html" => {
            asset!("oauth2-redirect.html", "text/html; charset=utf-8")
        }
        "/docs/static/favicon-16x16.png" => asset!("favicon-16x16.png", "image/png"),
        "/docs/static/favicon-32x32.png" => asset!("favicon-32x32.png", "image/png"),
        "/docs/static/logo.svg" => asset!("logo.svg", "image/svg+xml"),
        _ => return None,
    })
}
pub struct AssetReply {
    pub status: u16,
    pub body: Bytes,
    pub headers: HeaderMap,
}

fn matches_tag_list(mut raw: &[u8], tag: &[u8], weak_match: bool) -> bool {
    raw = raw.trim_ascii();
    if raw == b"*" {
        return true;
    }
    let mut matched = false;
    while !raw.is_empty() {
        if let Some(rest) = raw.strip_prefix(b",") {
            raw = rest.trim_ascii_start();
            continue;
        }
        let weak = raw.starts_with(b"W/");
        if weak {
            raw = &raw[2..];
        }
        let Some(opaque) = raw.strip_prefix(b"\"") else {
            return false;
        };
        let Some(last) = opaque.iter().position(|&byte| byte == b'"') else {
            return false;
        };
        if !opaque[..last]
            .iter()
            .all(|byte| *byte == 0x21 || (0x23..=0x7e).contains(byte) || *byte >= 0x80)
        {
            return false;
        }
        matched |= (weak_match || !weak) && &raw[..last + 2] == tag;
        raw = raw[last + 2..].trim_ascii_start();
        if !raw.is_empty() && !raw.starts_with(b",") {
            return false;
        }
    }
    matched
}

enum RequestedRange {
    Ignore,
    Unsatisfiable,
    Satisfiable(Range<usize>),
}

fn decimal(raw: &str) -> Option<&str> {
    (!raw.is_empty() && raw.bytes().all(|byte| byte.is_ascii_digit()))
        .then(|| raw.trim_start_matches('0'))
}

fn compare_decimal(left: &str, right: &str) -> Ordering {
    left.len().cmp(&right.len()).then_with(|| left.cmp(right))
}

fn offset(digits: &str) -> usize {
    if digits.is_empty() {
        0
    } else {
        digits.parse().unwrap_or(usize::MAX)
    }
}

fn byte_range(raw: &str, len: usize) -> RequestedRange {
    use RequestedRange::*;
    let Some((unit, spec)) = raw.trim().split_once('=') else {
        return Ignore;
    };
    if !unit.eq_ignore_ascii_case("bytes") || spec.contains(',') || len == 0 {
        return Ignore;
    }
    let Some((start, end)) = spec.split_once('-') else {
        return Ignore;
    };
    if start.is_empty() {
        let Some(suffix) = decimal(end) else {
            return Ignore;
        };
        let suffix = offset(suffix);
        return if suffix == 0 {
            Unsatisfiable
        } else {
            Satisfiable(len.saturating_sub(suffix)..len)
        };
    }
    let Some(first) = decimal(start) else {
        return Ignore;
    };
    let end = if end.is_empty() {
        len
    } else {
        let Some(last) = decimal(end) else {
            return Ignore;
        };
        if compare_decimal(first, last) == Ordering::Greater {
            return Ignore;
        }
        offset(last).saturating_add(1).min(len)
    };
    let start = offset(first);
    if start >= len {
        Unsatisfiable
    } else {
        Satisfiable(start..end)
    }
}

impl Asset {
    pub fn respond(&self, request: &HeaderMap, head: bool, cacheable: bool) -> AssetReply {
        let gzip = self.gzip.filter(|_| prefers_gzip(request));
        let variant = gzip.unwrap_or(self.identity);
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_SECURITY_POLICY, "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; frame-ancestors 'self'".parse().unwrap());
        if self.gzip.is_some() {
            headers.insert(VARY, "accept-encoding".parse().unwrap());
        }

        let mut status = 200;
        let mut bytes = variant.bytes;
        if cacheable {
            let tag = variant.tag;
            let len = bytes.len();
            headers.insert(CACHE_CONTROL, "public, max-age=0".parse().unwrap());
            headers.insert(ETAG, tag.parse().unwrap());
            headers.insert(ACCEPT_RANGES, "bytes".parse().unwrap());

            let any_tag = |name, weak_match| {
                request
                    .get_all(name)
                    .iter()
                    .any(|value| matches_tag_list(value.as_bytes(), tag.as_bytes(), weak_match))
            };
            if request.contains_key(IF_MATCH) && !any_tag(IF_MATCH, false) {
                return AssetReply {
                    status: 412,
                    body: Bytes::new(),
                    headers,
                };
            }
            if any_tag(IF_NONE_MATCH, true) {
                return AssetReply {
                    status: 304,
                    body: Bytes::new(),
                    headers,
                };
            }

            // RFC 9110 defines the Range request header for GET only.
            // Dates are not validators here: the embedded bytes have no stable mtime.
            let values = request.get_all(IF_RANGE);
            let mut if_range = values.iter();
            if !head
                && if_range
                    .next()
                    .is_none_or(|value| value.as_bytes().trim_ascii() == tag.as_bytes())
                && if_range.next().is_none()
            {
                let values = request.get_all(RANGE);
                let mut ranges = values.iter();
                if let Some(raw) = ranges
                    .next()
                    .filter(|_| ranges.next().is_none())
                    .and_then(|value| value.to_str().ok())
                {
                    match byte_range(raw, len) {
                        RequestedRange::Ignore => {}
                        RequestedRange::Unsatisfiable => {
                            headers
                                .insert(CONTENT_RANGE, format!("bytes */{len}").parse().unwrap());
                            return AssetReply {
                                status: 416,
                                body: Bytes::new(),
                                headers,
                            };
                        }
                        RequestedRange::Satisfiable(range) => {
                            headers.insert(
                                CONTENT_RANGE,
                                format!("bytes {}-{}/{len}", range.start, range.end - 1)
                                    .parse()
                                    .unwrap(),
                            );
                            status = 206;
                            bytes = &bytes[range];
                        }
                    }
                }
            }
        }
        if gzip.is_some() {
            headers.insert(CONTENT_ENCODING, "gzip".parse().unwrap());
        }
        let body = if head {
            headers.insert(CONTENT_LENGTH, bytes.len().into());
            Bytes::new()
        } else {
            Bytes::from_static(bytes)
        };
        AssetReply {
            status,
            body,
            headers,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gzip_obeys_weights_and_specific_exclusions() {
        for (value, expected) in [
            ("gzip;q=0.8, identity;q=0.5", true),
            ("gzip;q=0.2, identity;q=1", false),
            ("gzip;q=0, *;q=1", false),
            ("*;q=0.5", true),
            ("GZip ; Q=1", true),
            ("br", false),
            ("", false),
        ] {
            let mut headers = HeaderMap::new();
            headers.insert(ACCEPT_ENCODING, value.parse().unwrap());
            assert_eq!(prefers_gzip(&headers), expected, "{value}");
        }
    }

    #[test]
    fn identity_responses_reuse_the_same_bytes_and_head_reports_the_get_length() {
        for name in [
            "swagger-initializer.js",
            "swagger-ui-bundle.js",
            "swagger-ui-standalone-preset.js",
            "swagger-ui.js",
            "swagger-ui.css",
            "index.css",
            "oauth2-redirect.js",
        ] {
            let path = format!("/docs/static/{name}");
            let asset = get(&path).unwrap();
            let req = HeaderMap::new();
            let AssetReply {
                body: first,
                headers,
                ..
            } = asset.respond(&req, false, true);
            let second = get(&path).unwrap().respond(&req, false, true).body;
            assert!(!first.is_empty(), "{path}");
            assert_eq!(
                first.as_ptr(),
                second.as_ptr(),
                "{path} reuses identity data"
            );
            assert_eq!(headers[VARY], "accept-encoding");
            assert!(!headers.contains_key(CONTENT_ENCODING));
            assert!(headers.contains_key(CONTENT_SECURITY_POLICY));

            let head = asset.respond(&req, true, true);
            assert!(head.body.is_empty());
            assert_eq!(head.headers[CONTENT_LENGTH], first.len().to_string());

            let mut req = HeaderMap::new();
            req.insert(ACCEPT_ENCODING, "gzip".parse().unwrap());
            let AssetReply {
                body: gzip,
                headers,
                ..
            } = asset.respond(&req, false, true);
            assert_eq!(headers[CONTENT_ENCODING], "gzip");
            assert_eq!(headers[VARY], "accept-encoding");
            // The original single-member gzip trailer independently gives the identity length.
            let size = u32::from_le_bytes(*gzip.last_chunk::<4>().unwrap());
            assert_eq!(first.len(), size as usize, "{path}");
        }
    }
}
