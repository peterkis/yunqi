//! Fixed Gregorian Beijing standard time. All astronomical values come from 6tail's
//! tyme4rs. No machine time zone or historical DST enters business calculations.
use serde_json::{json, Value};
use std::{cmp::Ordering, sync::OnceLock};
use tyme4rs::tyme::{
    lunar::{LunarYear, LUNAR_DAY_NAMES, LUNAR_MONTH_NAMES},
    solar::{SolarDay, SolarTerm},
    Culture,
};

pub mod birth;

pub const DAY_MS: i64 = 86_400_000;
const OFFSET_MS: i64 = 8 * 3_600_000;
const INVALID_DATE: &str =
    "dateTime 必须是固定北京时间或等价 UTC，格式为 YYYY-MM-DDTHH:mm:ss[.SSS]、+08:00 或 Z";
const TERMS: [&str; 9] = [
    "大寒", "春分", "小满", "芒种", "大暑", "处暑", "秋分", "立冬", "小雪",
];
const FIRST_PROVIDER_YEAR: i32 = 1899;
const LAST_PROVIDER_YEAR: i32 = 2102;

#[derive(Clone, Copy, Eq, Ord, PartialEq, PartialOrd)]
struct LocalFields {
    year: i32,
    month: u32,
    day: u32,
    hour: u32,
    minute: u32,
    second: u32,
    millisecond: u32,
}

impl LocalFields {
    // Proleptic Gregorian days relative to 1970-01-01, March-based 400-year eras,
    // exactly as in domain/calendar/time.ts; no cutover or locale delegation.
    fn day_number(self) -> i64 {
        let month = i64::from(self.month);
        let year = i64::from(self.year) - i64::from(month <= 2);
        let era = year.div_euclid(400);
        let year_in_era = year.rem_euclid(400);
        let shifted_month = month + if month > 2 { -3 } else { 9 };
        let day_in_year = (153 * shifted_month + 2) / 5 + i64::from(self.day) - 1;
        era * 146_097 + year_in_era * 365 + year_in_era / 4 - year_in_era / 100 + day_in_year
            - 719_468
    }

    fn valid(self) -> bool {
        let leap = self.year % 4 == 0 && (self.year % 100 != 0 || self.year % 400 == 0);
        let max_day = match self.month {
            2 if leap => 29,
            2 => 28,
            4 | 6 | 9 | 11 => 30,
            1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
            _ => return false,
        };
        (1..=max_day).contains(&self.day)
            && self.hour < 24
            && self.minute < 60
            && self.second < 60
            && self.millisecond < 1000
    }

    fn epoch(self) -> i64 {
        self.day_number() * DAY_MS
            + i64::from(self.hour) * 3_600_000
            + i64::from(self.minute) * 60_000
            + i64::from(self.second) * 1000
            + i64::from(self.millisecond)
            - OFFSET_MS
    }

    fn from_epoch(epoch: i64) -> Self {
        let day = local_day_number(epoch) + 719_468;
        let era = day.div_euclid(146_097);
        let day_in_era = day.rem_euclid(146_097);
        let year_in_era =
            (day_in_era - day_in_era / 1460 + day_in_era / 36_524 - day_in_era / 146_096) / 365;
        let day_in_year = day_in_era - (365 * year_in_era + year_in_era / 4 - year_in_era / 100);
        let shifted_month = (5 * day_in_year + 2) / 153;
        let month = shifted_month + if shifted_month < 10 { 3 } else { -9 };
        let ms = (epoch.rem_euclid(DAY_MS) + OFFSET_MS) % DAY_MS;
        Self {
            year: (era * 400 + year_in_era + i64::from(month <= 2)) as i32,
            month: month as u32,
            day: (day_in_year - (153 * shifted_month + 2) / 5 + 1) as u32,
            hour: (ms / 3_600_000) as u32,
            minute: (ms / 60_000 % 60) as u32,
            second: (ms / 1000 % 60) as u32,
            millisecond: (ms % 1000) as u32,
        }
    }

    fn iso(self) -> String {
        let Self {
            year,
            month,
            day,
            hour,
            minute,
            second,
            millisecond,
        } = self;
        let fraction = if millisecond == 0 {
            String::new()
        } else {
            format!(".{millisecond:03}")
        };
        format!("{year:04}-{month:02}-{day:02}T{hour:02}:{minute:02}:{second:02}{fraction}+08:00")
    }
}

pub fn local_day_number(epoch: i64) -> i64 {
    epoch.div_euclid(DAY_MS) + (epoch.rem_euclid(DAY_MS) + OFFSET_MS) / DAY_MS
}

pub fn local_year(epoch: i64) -> i32 {
    LocalFields::from_epoch(epoch).year
}

/// Domain boundary ownership follows Gregorian field ordering in fixed Beijing time.
pub fn compare_local(left: i64, right: i64) -> Ordering {
    LocalFields::from_epoch(left).cmp(&LocalFields::from_epoch(right))
}

pub fn format_time(epoch: i64) -> Value {
    json!({"localTime":LocalFields::from_epoch(epoch).iso(), "epochMilliseconds":epoch,
           "offset":"+08:00","calendarTimeStandard":"BeijingStandardTime+08:00"})
}

fn digits(input: &[u8]) -> Option<u32> {
    input.iter().try_fold(0_u32, |n, &c| {
        c.is_ascii_digit().then(|| n * 10 + u32::from(c - b'0'))
    })
}

/// Only the API grammar is accepted: YYYY-MM-DDTHH:mm:ss[.SSS] with no
/// suffix, +08:00 or Z. Leap seconds and automatically rolled dates are invalid.
pub fn parse_datetime(input: &str) -> Result<i64, String> {
    let utc = input.ends_with('Z');
    let body = input
        .strip_suffix('Z')
        .or_else(|| input.strip_suffix("+08:00"))
        .unwrap_or(input)
        .as_bytes();
    if !matches!(body.len(), 19 | 23)
        || body[4] != b'-'
        || body[7] != b'-'
        || body[10] != b'T'
        || body[13] != b':'
        || body[16] != b':'
    {
        return Err(INVALID_DATE.into());
    }
    let ms = if body.len() == 23 {
        if body[19] != b'.' {
            return Err(INVALID_DATE.into());
        }
        digits(&body[20..23]).ok_or(INVALID_DATE)?
    } else {
        0
    };
    let fields = LocalFields {
        year: digits(&body[0..4]).ok_or(INVALID_DATE)? as i32,
        month: digits(&body[5..7]).ok_or(INVALID_DATE)?,
        day: digits(&body[8..10]).ok_or(INVALID_DATE)?,
        hour: digits(&body[11..13]).ok_or(INVALID_DATE)?,
        minute: digits(&body[14..16]).ok_or(INVALID_DATE)?,
        second: digits(&body[17..19]).ok_or(INVALID_DATE)?,
        millisecond: ms,
    };
    if !fields.valid() {
        return Err(INVALID_DATE.into());
    }
    Ok(fields.epoch() + if utc { OFFSET_MS } else { 0 })
}

pub fn solar_term(year: i32, name: &str) -> Result<i64, String> {
    // Bounded cache for supported years and both adjacent endpoints. The lookup
    // avoids repeated astronomical calculation across annual, learning and birth views.
    const COUNT: usize = (LAST_PROVIDER_YEAR - FIRST_PROVIDER_YEAR + 1) as usize * TERMS.len();
    static CACHE: [OnceLock<i64>; COUNT] = [const { OnceLock::new() }; COUNT];
    if !(FIRST_PROVIDER_YEAR..=LAST_PROVIDER_YEAR).contains(&year) {
        return Err(format!("节气查询年份超出范围：{year}"));
    }
    let term_index = TERMS
        .iter()
        .position(|&term| term == name)
        .ok_or_else(|| format!("未知节气：{name}"))?;
    let cell = &CACHE[(year - FIRST_PROVIDER_YEAR) as usize * TERMS.len() + term_index];
    if let Some(time) = cell.get() {
        return Ok(*time);
    }
    let term = SolarTerm::new(year as isize, name)?;
    let time = term.get_julian_day().get_solar_time();
    if term.get_year() != year as isize
        || term.get_name() != name
        || time.get_year() != year as isize
    {
        return Err(format!("节气查询结果与请求不一致：{year} {name}"));
    }
    let local = LocalFields {
        year,
        month: time.get_month() as u32,
        day: time.get_day() as u32,
        hour: time.get_hour() as u32,
        minute: time.get_minute() as u32,
        second: time.get_second() as u32,
        millisecond: 0,
    };
    if !local.valid() {
        return Err(format!("节气时间无效：{year} {name}"));
    }
    Ok(*cell.get_or_init(|| local.epoch()))
}

struct LunarPeriod {
    first_day: i64,
    month: u8,
    days: u8,
    leap: bool,
}

type BirthYear = Box<[LunarPeriod]>;

// The first day, length, leap status and name are calculated by tyme4rs. Keep
// only periods that intersect the requested civil year. This also preserves
// the order when an ordinary lunar date occurs twice in the same Gregorian year.
fn birth_year(year: i32) -> BirthYear {
    let y = year as isize;
    let start = SolarDay::from_ymd(y, 1, 1);
    let end = SolarDay::from_ymd(y, 12, 31);
    let first = start.get_lunar_day().get_year();
    let last = end.get_lunar_day().get_year();
    let mut months = Vec::with_capacity(14);
    for lunar_year in first..=last {
        for period in LunarYear::from_year(lunar_year).get_months() {
            let solar = period.get_first_day().get_solar_day();
            let days = period.get_day_count() as u8;
            if solar.is_after(end) || start.subtract(solar) >= days as isize {
                continue;
            }
            let midnight = LocalFields {
                year: solar.get_year() as i32,
                month: solar.get_month() as u32,
                day: solar.get_day() as u32,
                hour: 0,
                minute: 0,
                second: 0,
                millisecond: 0,
            }
            .epoch();
            months.push(LunarPeriod {
                month: period.get_month() as u8,
                first_day: midnight,
                days,
                leap: period.is_leap(),
            });
        }
    }
    months.into_boxed_slice()
}

/// A reported birth *year* is Gregorian even when month and day are lunar.
/// Preserve all regular/leap occurrences falling within that Gregorian year.
pub fn resolve_lunar_birthday(year: i32, month: u32, day: u32, leap: Option<bool>) -> Vec<Value> {
    static YEARS: [OnceLock<BirthYear>; 201] = [const { OnceLock::new() }; 201];
    if !(1900..=2100).contains(&year) || !(1..=12).contains(&month) || !(1..=30).contains(&day) {
        return Vec::new();
    }
    let months = YEARS[(year - 1900) as usize].get_or_init(|| birth_year(year));
    let mut matches = Vec::new();
    for period in months.iter() {
        if u32::from(period.month) != month
            || leap.is_some_and(|l| l != period.leap)
            || day > u32::from(period.days)
        {
            continue;
        }
        // Day 1 anchors the exact converted month; under fixed +08 a day is 86,400,000 ms.
        let solar = LocalFields::from_epoch(period.first_day + i64::from(day - 1) * DAY_MS);
        if solar.year == year {
            matches.push(json!({
                "birthDate":format!("{year:04}-{:02}-{:02}",solar.month,solar.day),
                "lunarLabel":format!("{}{}{}",if period.leap { "闰" } else { "" },
                    LUNAR_MONTH_NAMES[month as usize-1],LUNAR_DAY_NAMES[day as usize-1]),
                "leap":period.leap
            }));
        }
    }
    matches
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn adapter_matches_original_pinned_observations() {
        for (year, name, ms) in [
            (2024, "大寒", 1_705_759_642_000),
            (2024, "春分", 1_710_903_985_000),
            (2024, "小满", 1_716_209_971_000),
            (2024, "大暑", 1_721_634_266_000),
            (2024, "秋分", 1_727_009_022_000),
            (2024, "小雪", 1_732_218_991_000),
            (2025, "大寒", 1_737_316_808_000),
            (1991, "小满", 674_832_014_000),
            (1991, "大暑", 680_256_668_000),
        ] {
            assert_eq!(solar_term(year, name).unwrap(), ms, "{year} {name}");
        }
    }

    #[test]
    fn fixed_beijing_roundtrip_and_api_grammar() {
        for day in ["1900-02-28", "1991-07-01", "2000-02-29", "2101-01-01"] {
            let s = format!("{day}T00:00:00.001+08:00");
            assert_eq!(format_time(parse_datetime(&s).unwrap())["localTime"], s);
        }
        assert_eq!(
            parse_datetime("2024-01-20T14:07:22Z"),
            parse_datetime("2024-01-20T22:07:22")
        );
        for invalid in [
            "1900-02-29T12:00:00",
            "2024-02-30T12:00:00",
            "2024-01-01T24:00:00",
            "2024-01-01T23:59:60",
            "2024-01-01T00:00:00.1",
            "2024-01-01T00:00:00+07:00",
            "2024-01-01T00:00:00+08:00Z",
            "2024-01-01 00:00:00",
            "😀😀😀😀😀",
        ] {
            assert!(parse_datetime(invalid).is_err(), "{invalid}");
        }
    }

    #[test]
    fn lunar_leap_filter_and_missing_day() {
        let both = resolve_lunar_birthday(2023, 2, 1, None);
        assert_eq!(
            both.iter()
                .map(|r| r["birthDate"].as_str().unwrap())
                .collect::<Vec<_>>(),
            ["2023-02-20", "2023-03-22"]
        );
        assert_eq!(
            resolve_lunar_birthday(2023, 2, 1, Some(true)),
            vec![both[1].clone()]
        );
        assert_eq!(
            resolve_lunar_birthday(2023, 2, 1, Some(false)),
            vec![both[0].clone()]
        );
        assert!(resolve_lunar_birthday(2023, 2, 31, None).is_empty());
    }
}

#[cfg(test)]
mod cross_language {
    use super::*;

    const ORACLE: &str = include_str!("fixtures/tyme4ts-1.5.2.csv");

    #[test]
    fn every_supported_year_matches_typescript_term_instants() {
        assert_eq!(ORACLE.lines().count(), 202);
        for line in ORACLE.lines().skip(1) {
            let fields: Vec<_> = line.split(',').collect();
            let year = fields[0].parse().unwrap();
            for (term, expected) in TERMS.iter().zip(&fields[3..]) {
                assert_eq!(
                    solar_term(year, term).unwrap(),
                    expected.parse::<i64>().unwrap(),
                    "{year} {term}"
                );
            }
        }
    }

    // Includes non-existent dates, regular and leap-month labels, stable candidate order,
    // and the Gregorian-year filter. Fixtures use the original TS adapter, not Rust.
    #[test]
    fn all_supported_lunar_queries_match_typescript_per_year_digests() {
        for line in ORACLE.lines().skip(1) {
            let fields: Vec<_> = line.split(',').collect();
            let year = fields[0].parse().unwrap();
            let mut hash = 14_695_981_039_346_656_037u64;
            let mut count = 0;
            for month in 1..=12 {
                for day in 1..=31 {
                    let matches = resolve_lunar_birthday(year, month, day, None);
                    count += matches.len();
                    let values = matches
                        .iter()
                        .map(|r| {
                            format!(
                                "{}/{}/{}",
                                r["birthDate"].as_str().unwrap(),
                                r["lunarLabel"].as_str().unwrap(),
                                u8::from(r["leap"].as_bool().unwrap())
                            )
                        })
                        .collect::<Vec<_>>();
                    for byte in values.join("|").bytes().chain(std::iter::once(b'\n')) {
                        hash = (hash ^ u64::from(byte)).wrapping_mul(1_099_511_628_211);
                    }
                }
            }
            assert_eq!(
                count,
                fields[1].parse::<usize>().unwrap(),
                "{year} match count"
            );
            assert_eq!(
                format!("{hash:016x}"),
                fields[2],
                "{year} lunar birthday digest"
            );
        }
    }
}
