//! Date-only birthdays are half-open intervals. A solar-term day can be ambiguous.
use super::{format_time, parse_datetime, resolve_lunar_birthday, solar_term, YunQiCalendarTime};
use crate::domain::{compare_elements, learning, qi_element};
use serde_json::{json, Value};

const INVALID: &str = "请求参数无效";
const KNOWN: &str =
    "按所填公历出生时刻计算，统一采用固定北京时间 UTC+08；不依据生日判定九种体质或个体疾病风险。";
const AMBIGUOUS: &str = "出生时间不详，所填日期跨运气交界；请按真实出生时间核对以下候选，不能任选一个作为确定结论。区间左闭右开。";
const UNAMBIGUOUS: &str =
    "出生时间不详；所填日期已发生的时段归属一致。下列区间用于核对，不是推定的出生时刻。";

fn supported_day_start(start: YunQiCalendarTime) -> Result<YunQiCalendarTime, String> {
    if start.year() != 1900 {
        return Ok(start);
    }
    let minimum = solar_term(1900, "大寒")?;
    if minimum >= start.add_days(1) {
        return Err("出生日期早于支持范围".into());
    }
    Ok(if start < minimum { minimum } else { start })
}

fn scalar<'a>(value: &'a Value, pointer: &str) -> Result<&'a str, String> {
    value
        .pointer(pointer)
        .and_then(Value::as_str)
        .ok_or_else(|| format!("教学结果字段无效 {pointer}"))
}

fn steps<'a>(value: &'a Value, pointer: &str) -> Result<&'a Vec<Value>, String> {
    value
        .pointer(pointer)
        .and_then(Value::as_array)
        .ok_or_else(|| format!("教学结果字段无效 {pointer}"))
}

fn asked_year(body: &Value) -> Result<i32, String> {
    body["year"]
        .as_i64()
        .filter(|y| (1900..=2100).contains(y))
        .map(|y| y as i32)
        .ok_or_else(|| "年份必须是 1900 到 2100 的整数".into())
}

fn comparisons(birth: &Value, current: &Value, annual_only: bool) -> Result<Vec<Value>, String> {
    let dimensions = [
        ("中运对照", "/facts/suiYun/element", false),
        ("司天对照", "/facts/sixQi/sitian", true),
        ("在泉对照", "/facts/sixQi/zaiquan", true),
        ("客运对照", "/currentMovement/guest/element", false),
        ("客气对照", "/facts/currentStep/guestQi", true),
    ];
    dimensions[..if annual_only { 3 } else { 5 }]
        .iter()
        .map(|&(title, path, qi)| {
            let left = scalar(birth, path)?;
            let right = scalar(current, path)?;
            Ok(compare_elements(
                title,
                if qi { qi_element(left) } else { left },
                if qi { qi_element(right) } else { right },
            ))
        })
        .collect()
}

pub fn year(body: &Value, now: YunQiCalendarTime) -> Result<Value, String> {
    let year = asked_year(body)?;
    let this_year = now.year();
    if year > this_year {
        return Err("出生年份不能晚于当前年份".into());
    }
    let start = parse_datetime(&format!("{year}-01-01T00:00:00"))?;
    let boundary = solar_term(year, "大寒")?;
    let until = if year == this_year {
        now.shift_milliseconds(1)
    } else {
        parse_datetime(&format!("{}-01-01T00:00:00", year + 1))?
    };
    let current = learning(now)?;
    let mut candidates = Vec::new();
    for (label, from, end) in [
        ("大寒交节前", start, boundary.min(until)),
        ("大寒交节起", boundary, until),
    ] {
        if from >= end || (year == 1900 && from == start) {
            continue;
        }
        let birth = learning(from)?;
        let facts = &birth["facts"];
        candidates.push(json!({"label":label,"from":format_time(from),"until":format_time(end),
            "year":facts["year"],"ganzhi":facts["stemBranch"]["ganzhi"],"suiYun":facts["suiYun"],
            "sitian":facts["sixQi"]["sitian"],"zaiquan":facts["sixQi"]["zaiquan"],
            "annualPassages":birth["annualPassages"], "comparisons":comparisons(&birth,&current,true)?}));
    }
    let mut result = json!({"birthPrecision":"year","current":null,"candidates":null,
        "message":if year==1900 {"仅年份对照 · 可计算范围从 1900 年大寒交节起"} else {"仅年份对照 · 按大寒交节划分可能归属"}});
    result["current"] = current;
    result["candidates"] = Value::Array(candidates);
    Ok(result)
}

fn annual_label(learning: &Value) -> Result<String, String> {
    Ok(format!(
        "{}年 · {}运{}",
        scalar(learning, "/facts/stemBranch/ganzhi")?,
        scalar(learning, "/facts/suiYun/element")?,
        scalar(learning, "/facts/suiYun/state")?
    ))
}

fn day_boundaries(first: &Value, last: &Value, date: &str) -> Result<Vec<Value>, String> {
    let mut result = Vec::<Value>::new();
    let mut add = |label: String, at: &Value| {
        if at["localTime"]
            .as_str()
            .is_some_and(|s| s.starts_with(date))
        {
            let event = json!({"label":label,"at":at});
            if let Some(existing) = result.iter_mut().find(|item| item["label"] == label) {
                *existing = event;
            } else {
                result.push(event);
            }
        }
    };
    for value in [first, last] {
        add("大寒交运气年".into(), &value["facts"]["interval"]["start"]);
        for (prefix, path) in [("交气", "/facts/sixQi/steps"), ("交运", "/movements")] {
            for step in steps(value, path)? {
                add(
                    format!("{prefix} · {}", scalar(step, "/name")?),
                    &step["start"],
                );
            }
        }
    }
    Ok(result)
}

pub fn preview(body: &Value, now: YunQiCalendarTime) -> Result<Value, String> {
    let year = asked_year(body)?;
    let calendar = body["calendar"].as_str().ok_or(INVALID)?;
    let month = body["month"]
        .as_u64()
        .filter(|m| (1..=12).contains(m))
        .ok_or(INVALID)? as u32;
    let day = body["day"]
        .as_u64()
        .filter(|d| (1..=31).contains(d))
        .ok_or(INVALID)? as u32;
    let leap = body
        .get("leap")
        .map(|v| v.as_bool().ok_or(INVALID))
        .transpose()?;
    if year > now.year() || (calendar == "solar" && leap.is_some()) {
        return Err("出生日期或历法选项无效".into());
    }
    let dates = match calendar {
        "lunar" => resolve_lunar_birthday(year, month, day, leap),
        "solar" => vec![
            json!({"birthDate":format!("{year:04}-{month:02}-{day:02}"),"lunarLabel":"","leap":false}),
        ],
        _ => return Err(INVALID.into()),
    };
    let mut matches = Vec::new();
    for mut date in dates {
        let birth_date = scalar(&date, "/birthDate")?;
        let start = parse_datetime(&format!("{birth_date}T00:00:00"))?;
        if now < start {
            continue;
        }
        let end = start.add_days(1);
        if year == 1900 && solar_term(1900, "大寒")? >= end {
            continue;
        }
        let first = learning(supported_day_start(start)?)?;
        let last = learning(end.shift_milliseconds(-1))?;
        let mut labels = vec![annual_label(&first)?];
        let last_label = if now < end {
            annual_label(&learning(now)?)?
        } else {
            annual_label(&last)?
        };
        if labels[0] != last_label {
            labels.push(last_label);
        }
        let boundaries = day_boundaries(&first, &last, birth_date)?;
        date["annualLabels"] = json!(labels);
        date["boundaries"] = Value::Array(boundaries);
        matches.push(date);
    }
    let mut result = json!({});
    result["matches"] = Value::Array(matches);
    Ok(result)
}

fn partition_day(
    first: &Value,
    last: &Value,
    from: YunQiCalendarTime,
    until: YunQiCalendarTime,
) -> Result<Vec<YunQiCalendarTime>, String> {
    let mut points = vec![from, until];
    for value in [first, last] {
        for at in steps(value, "/facts/sixQi/steps")?
            .iter()
            .map(|s| &s["start"])
            .chain(std::iter::once(&value["facts"]["interval"]["end"]))
            .chain(steps(value, "/movements")?.iter().map(|s| &s["start"]))
        {
            let boundary = parse_datetime(scalar(at, "/localTime")?)?;
            if from < boundary && boundary < until {
                points.push(boundary);
            }
        }
    }
    points.sort_unstable();
    points.dedup();
    Ok(points)
}

pub fn comparison(body: &Value, now: YunQiCalendarTime) -> Result<Value, String> {
    let date = body["birthDate"].as_str().ok_or(INVALID)?;
    let time = body
        .get("birthTime")
        .map(|v| v.as_str().ok_or(INVALID))
        .transpose()?;
    let start = parse_datetime(&format!("{date}T{}", time.unwrap_or("00:00:00")))?;
    let from = if time.is_some() {
        start
    } else {
        supported_day_start(start)?
    };
    if now < from {
        return Err("出生时间不能晚于当前时点".into());
    }
    let current = learning(now)?;
    let initial = learning(from)?;
    let (points, precision, message) = if time.is_some() {
        (vec![from, from], "time", KNOWN)
    } else {
        let until = start.add_days(1).min(now.shift_milliseconds(1));
        let last = learning(until.shift_milliseconds(-1))?;
        let points = partition_day(&initial, &last, from, until)?;
        let message = if points.len() > 2 {
            AMBIGUOUS
        } else {
            UNAMBIGUOUS
        };
        (points, "date", message)
    };
    let ambiguous = points.len() > 2;
    let mut result = json!({"ruleVersion":initial["ruleVersion"],"birthPrecision":precision,
        "ambiguous":ambiguous,"message":message});
    let mut initial = Some(initial);
    let mut candidates = Vec::with_capacity(points.len() - 1);
    for (i, pair) in points.windows(2).enumerate() {
        let sample = match initial.take() {
            Some(first) => first,
            None => learning(pair[0])?,
        };
        let label = if time.is_some() {
            "已知出生时刻".into()
        } else if ambiguous {
            format!("可能归属 {}", i + 1)
        } else {
            "当日已知时段归属一致".into()
        };
        let mut candidate = json!({"label":label,"from":format_time(pair[0]),
            "until":format_time(pair[1]),"learning":null,
            "comparisons":comparisons(&sample,&current,false)?});
        candidate["learning"] = sample;
        candidates.push(candidate);
    }
    result["current"] = current;
    result["candidates"] = Value::Array(candidates);
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dahan_day_all_ownerships_use_half_open_ranges() {
        let now = parse_datetime("2026-01-21T00:00:00").unwrap();
        let result = comparison(&json!({"birthDate":"2024-01-20"}), now).unwrap();
        let candidates = result["candidates"].as_array().unwrap();
        assert_eq!(candidates.len(), 2);
        assert_eq!(candidates[0]["until"], candidates[1]["from"]);
        assert_eq!(
            candidates[1]["from"]["epochMilliseconds"],
            1_705_759_642_000_i64
        );
        assert_eq!(candidates[0]["learning"]["facts"]["year"], 2023);
        assert_eq!(candidates[1]["learning"]["facts"]["year"], 2024);
    }

    #[test]
    fn day_precision_clips_at_the_present_and_supported_lower_endpoint() {
        let now = parse_datetime("2024-01-20T12:00:00.007").unwrap();
        let result = comparison(&json!({"birthDate":"2024-01-20"}), now).unwrap();
        assert_eq!(result["candidates"].as_array().unwrap().len(), 1);
        assert_eq!(
            result["candidates"][0]["until"]["epochMilliseconds"],
            now.shift_milliseconds(1).epoch()
        );
        let cutoff = solar_term(1900, "大寒").unwrap();
        let date = format_time(cutoff)["localTime"].as_str().unwrap()[..10].to_owned();
        let result = comparison(&json!({"birthDate":date}), now).unwrap();
        assert_eq!(
            result["candidates"][0]["from"]["epochMilliseconds"],
            cutoff.epoch()
        );
    }
}
