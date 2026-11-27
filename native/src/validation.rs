//! Input validation follows the published TypeBox order, including AJV's scalar
//! coercion and its first-error response. Array-to-scalar coercion is disabled.
use regex::{Regex, RegexBuilder};
use serde_json::{json, Value};
use std::sync::LazyLock;

pub(crate) const DATETIME: &str =
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|\+08:00)?$";
const DATE: &str = r"^\d{4}-\d{2}-\d{2}$";
const TIME: &str = r"^\d{2}:\d{2}:\d{2}$";
static PATTERNS: LazyLock<[Regex; 3]> = LazyLock::new(|| {
    [DATETIME, DATE, TIME].map(|p| {
        RegexBuilder::new(p)
            .unicode(false)
            .build()
            .expect("static contract pattern")
    })
});

fn issue(path: &str, keyword: &str, message: &str) -> Value {
    json!({"instancePath":path,"keyword":keyword,"message":message})
}
fn invalid(issues: Vec<Value>) -> Value {
    json!({"code":"INVALID_ARGUMENT","message":"请求参数无效","details":{"issues":issues}})
}
fn error(path: &str, keyword: &str, message: &str) -> Value {
    invalid(vec![issue(path, keyword, message)])
}

// ECMAScript's StringNumericLiteral accepts its own whitespace set. In particular,
// a byte order mark is whitespace; U+0085 NEXT LINE is part of the string.
fn numeric_string(input: &str) -> Option<f64> {
    let s = input.trim_matches(|c| {
        matches!(c,
            '\u{0009}'..='\u{000d}' | ' ' | '\u{00a0}' | '\u{1680}'
            | '\u{2000}'..='\u{200a}' | '\u{2028}' | '\u{2029}'
            | '\u{202f}' | '\u{205f}' | '\u{3000}' | '\u{feff}'
        )
    });
    if s.is_empty() {
        return Some(0.0);
    }
    let radix = match s.as_bytes() {
        [b'0', b'x' | b'X', ..] => 16,
        [b'0', b'o' | b'O', ..] => 8,
        [b'0', b'b' | b'B', ..] => 2,
        _ => return s.parse().ok(),
    };
    let digits = &s[2..];
    if digits.is_empty() {
        return None;
    }
    digits.chars().try_fold(0.0, |n, digit| {
        digit
            .to_digit(radix)
            .map(|d| n * f64::from(radix) + f64::from(d))
    })
}

pub fn integer(value: &Value, name: &str, min: i32, max: i32) -> Result<i32, Value> {
    let n = match value {
        Value::Number(v) => v.as_f64(),
        Value::String(v) if !v.is_empty() => numeric_string(v),
        Value::Bool(v) => Some(i32::from(*v) as f64),
        Value::Null => Some(0.0),
        _ => None,
    }
    .filter(|n| n.is_finite() && n.fract() == 0.0)
    .ok_or_else(|| error(name, "type", "must be integer"))?;
    if n > max as f64 {
        return Err(error(name, "maximum", &format!("must be <= {max}")));
    }
    if n < min as f64 {
        return Err(error(name, "minimum", &format!("must be >= {min}")));
    }
    Ok(n as i32)
}

fn text_field(value: &Value) -> Option<String> {
    match value {
        Value::String(s) => Some(s.clone()),
        Value::Number(_) | Value::Bool(_) => Some(value.to_string()),
        Value::Null => Some(String::new()),
        _ => None,
    }
}
pub fn request(body: &Value, schema: &str) -> Result<Value, Value> {
    let (required, optional): (&[&str], &[&str]) = match schema {
        "CalculateRequest" => (&["dateTime"], &[]),
        "BirthRequest" => (&["birthDate"], &["birthTime"]),
        "BirthYearRequest" => (&["year"], &[]),
        "BirthDatePreviewRequest" => (&["year", "calendar", "month", "day"], &["leap"]),
        _ => unreachable!("registration must name a known input schema"),
    };
    let obj = body
        .as_object()
        .ok_or_else(|| error("", "type", "must be object"))?;
    for key in required {
        if !obj.contains_key(*key) {
            return Err(error(
                "",
                "required",
                &format!("must have required property '{key}'"),
            ));
        }
    }
    if obj
        .keys()
        .any(|k| !required.contains(&k.as_str()) && !optional.contains(&k.as_str()))
    {
        return Err(error(
            "",
            "additionalProperties",
            "must NOT have additional properties",
        ));
    }
    let mut normalized = serde_json::Map::with_capacity(obj.len());
    for &key in required.iter().chain(optional.iter()) {
        let Some(value) = obj.get(key) else {
            continue;
        };
        let path = format!("/{key}");
        let field = match key {
            "year" => json!(integer(value, &path, 1900, 2100)?),
            "month" => json!(integer(value, &path, 1, 12)?),
            "day" => json!(integer(value, &path, 1, 31)?),
            "calendar" => {
                if !matches!(value.as_str(), Some("solar" | "lunar")) {
                    let mut issues = vec![];
                    for _ in 0..2 {
                        if text_field(value).is_none() {
                            issues.push(issue(&path, "type", "must be string"));
                        }
                        issues.push(issue(&path, "const", "must be equal to constant"));
                    }
                    issues.push(issue(&path, "anyOf", "must match a schema in anyOf"));
                    return Err(invalid(issues));
                }
                value.clone()
            }
            "leap" => match value {
                Value::Bool(_) => value.clone(),
                Value::Null => json!(false),
                Value::String(s) if s == "true" || s == "false" => json!(s == "true"),
                Value::Number(n) if matches!(n.as_f64(), Some(0.0 | 1.0)) => {
                    json!(n.as_f64() == Some(1.0))
                }
                _ => return Err(error(&path, "type", "must be boolean")),
            },
            _ => {
                let pattern = match key {
                    "dateTime" => 0,
                    "birthDate" => 1,
                    _ => 2,
                };
                let s = text_field(value).ok_or_else(|| error(&path, "type", "must be string"))?;
                if !PATTERNS[pattern].is_match(&s) {
                    return Err(error(
                        &path,
                        "pattern",
                        &format!("must match pattern \"{}\"", PATTERNS[pattern].as_str()),
                    ));
                }
                json!(s)
            }
        };
        normalized.insert(key.to_owned(), field);
    }
    Ok(Value::Object(normalized))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn integer_coercion_uses_javascript_whitespace_and_radix_rules() {
        let year = |s: &str| integer(&json!(s), "/year", 1900, 2100);
        for s in [
            "\u{feff}2024\u{feff}",
            "\u{2028}0X7E8\u{2029}",
            "0o3750",
            "0b11111101000",
        ] {
            assert_eq!(year(s), Ok(2024));
        }
        for s in ["\u{0085}2024", "0x+7e8", "0o+3750", "0b", "0x７Ｅ８"] {
            assert_eq!(
                year(s).unwrap_err()["details"]["issues"][0]["keyword"],
                "type",
                "{s}"
            );
        }
        assert_eq!(
            year("0x10000000000000000").unwrap_err()["details"]["issues"][0]["keyword"],
            "maximum"
        );
    }
}
