//! These assets are the offline Swagger UI and OpenAPI snapshots from the reference service.
use hyper::{
    body::Bytes,
    header::{ACCEPT_ENCODING, CONTENT_ENCODING, CONTENT_LENGTH, CONTENT_SECURITY_POLICY, VARY},
    HeaderMap,
};

pub struct Asset {
    identity: &'static [u8],
    gzip: Option<&'static [u8]>,
    pub mime: &'static str,
}

macro_rules! asset {
    ($name:literal, $mime:literal) => {
        Asset {
            identity: include_bytes!(concat!("../assets/", $name)),
            gzip: None,
            mime: $mime,
        }
    };
    ($name:literal, $mime:literal, gzip) => {{
        static IDENTITY: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/", $name));
        Asset {
            identity: IDENTITY,
            gzip: Some(include_bytes!(concat!("../assets/", $name, ".gz"))),
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
impl Asset {
    pub fn payload(&self, accept_gzip: bool, head: bool, headers: &mut HeaderMap) -> Bytes {
        headers.insert(CONTENT_SECURITY_POLICY, "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; frame-ancestors 'self'".parse().unwrap());
        if let Some(gzip) = self.gzip {
            headers.insert(VARY, "accept-encoding".parse().unwrap());
            if accept_gzip {
                headers.insert(CONTENT_ENCODING, "gzip".parse().unwrap());
                return Bytes::from_static(gzip);
            }
            if head {
                headers.insert(CONTENT_LENGTH, self.identity.len().into());
                return Bytes::new();
            }
        }
        Bytes::from_static(self.identity)
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
            let mut headers = HeaderMap::new();
            let first = asset.payload(false, false, &mut headers);
            let second = get(&path)
                .unwrap()
                .payload(false, false, &mut HeaderMap::new());
            assert!(!first.is_empty(), "{path}");
            assert_eq!(
                first.as_ptr(),
                second.as_ptr(),
                "{path} reuses identity data"
            );
            assert_eq!(headers[VARY], "accept-encoding");
            assert!(!headers.contains_key(CONTENT_ENCODING));
            assert!(headers.contains_key(CONTENT_SECURITY_POLICY));

            let mut headers = HeaderMap::new();
            let head = asset.payload(false, true, &mut headers);
            assert!(head.is_empty());
            assert_eq!(headers[CONTENT_LENGTH], first.len().to_string());

            let mut headers = HeaderMap::new();
            let gzip = asset.payload(true, false, &mut headers);
            assert_eq!(headers[CONTENT_ENCODING], "gzip");
            assert_eq!(headers[VARY], "accept-encoding");
            // The original single-member gzip trailer independently gives the identity length.
            let size = u32::from_le_bytes(*gzip.last_chunk::<4>().unwrap());
            assert_eq!(first.len(), size as usize, "{path}");
        }
    }
}
