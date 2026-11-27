//! Independent witnesses carried over from the upstream acceptance matrix;
//! expected values are literals rather than calculations based on the implementation.
use super::*;
use crate::calendar::parse_datetime;
use std::collections::{BTreeMap, BTreeSet};

#[test]
fn annual_labels_match_all_sixty_classical_cases() {
    let groups = [
        (
            "顺化",
            "癸巳 癸亥 甲子 甲午 甲寅 甲申 乙丑 乙未 辛卯 辛酉 壬辰 壬戌",
        ),
        (
            "天刑",
            "己巳 己亥 辛丑 辛未 戊辰 戊戌 庚子 庚午 庚寅 庚申 丁卯 丁酉",
        ),
        (
            "小逆",
            "癸丑 癸未 壬子 壬午 壬寅 壬申 辛巳 辛亥 庚辰 庚戌 己卯 己酉",
        ),
        (
            "不和",
            "乙巳 乙亥 丙子 丙午 丙寅 丙申 丁丑 丁未 癸卯 癸酉 甲辰 甲戌",
        ),
        (
            "天符",
            "丁巳 丁亥 戊子 戊午 戊寅 戊申 己丑 己未 乙卯 乙酉 丙辰 丙戌",
        ),
    ];
    let expected: BTreeMap<_, _> = groups
        .into_iter()
        .flat_map(|(label, list)| list.split_whitespace().map(move |name| (name, label)))
        .collect();
    let mut seen = BTreeSet::new();
    for y in 1984..2044 {
        let ms = parse_datetime(&format!("{y}-06-01T08:00:00")).unwrap();
        let result = learning(ms).unwrap();
        let facts = &result["facts"];
        let name = facts["stemBranch"]["ganzhi"].as_str().unwrap();
        assert!(seen.insert(name.to_owned()), "duplicate {name}");
        assert_eq!(
            result["annualRelation"]["label"], expected[name],
            "{y} {name}"
        );
        assert_eq!(
            facts["sixQi"]["steps"][2]["guestQi"],
            facts["sixQi"]["sitian"]
        );
        assert_eq!(
            facts["sixQi"]["steps"][5]["guestQi"],
            facts["sixQi"]["zaiquan"]
        );
    }
    assert_eq!(seen.len(), 60);
}

#[test]
fn five_movement_tones_for_every_stem() {
    let pairs = [
        ("太角 少徵 太宫 少商 太羽", "太宫 少商 太羽 太角 少徵"),
        ("太角 少徵 太宫 少商 太羽", "少商 太羽 太角 少徵 太宫"),
        ("太角 少徵 太宫 少商 太羽", "太羽 太角 少徵 太宫 少商"),
        ("少角 太徵 少宫 太商 少羽", "少角 太徵 少宫 太商 少羽"),
        ("少角 太徵 少宫 太商 少羽", "太徵 少宫 太商 少羽 少角"),
        ("少角 太徵 少宫 太商 少羽", "少宫 太商 少羽 少角 太徵"),
        ("少角 太徵 少宫 太商 少羽", "太商 少羽 少角 太徵 少宫"),
        ("少角 太徵 少宫 太商 少羽", "少羽 少角 太徵 少宫 太商"),
        ("太角 少徵 太宫 少商 太羽", "太角 少徵 太宫 少商 太羽"),
        ("太角 少徵 太宫 少商 太羽", "少徵 太宫 少商 太羽 太角"),
    ];
    for (i, (host, guest)) in pairs.iter().enumerate() {
        let ms = parse_datetime(&format!("{}-06-01T08:00:00", 1984 + i)).unwrap();
        let result = learning(ms).unwrap();
        let movements = result["movements"].as_array().unwrap();
        let tones = |key: &str| {
            movements
                .iter()
                .map(|m| m[key]["tone"].as_str().unwrap())
                .collect::<Vec<_>>()
                .join(" ")
        };
        assert_eq!(tones("host"), *host);
        assert_eq!(tones("guest"), *guest);
    }
}

#[test]
fn all_52_passages_are_reachable_and_match_their_scope() {
    let mut ids = BTreeSet::new();
    for y in 1984..2044 {
        let facts = year(y).unwrap();
        for step in facts["sixQi"]["steps"].as_array().unwrap() {
            let result = learning(step["start"]["epochMilliseconds"].as_i64().unwrap()).unwrap();
            let annual = result["annualPassages"].as_array().unwrap();
            let current = result["currentPassages"].as_array().unwrap();
            let movement = &facts["suiYun"];
            let sitian = facts["sixQi"]["sitian"].as_str().unwrap();
            assert_eq!(annual.len(), 2);
            assert_eq!(current.len(), 1);
            assert_eq!(
                annual[0]["id"],
                format!(
                    "suwen-69-{}-{}",
                    movement["element"].as_str().unwrap(),
                    movement["state"].as_str().unwrap()
                )
            );
            assert_eq!(annual[1]["id"], format!("suwen-71-{sitian}-annual"));
            assert_eq!(
                current[0]["id"],
                format!("suwen-71-{sitian}-{}", step["index"])
            );
            for p in annual.iter().chain(current) {
                ids.insert(p["id"].as_str().unwrap().to_owned());
                assert!(!p["quote"].as_str().unwrap().is_empty());
                assert_ne!(p["quote"], p["explanation"]);
                assert!(p["sourceUrl"].as_str().unwrap().starts_with("https://"));
            }
        }
    }
    assert_eq!(ids.len(), 52);
}

#[test]
fn original_2026_progress_and_boundary_witness() {
    let result = learning(parse_datetime("2026-11-18T08:44:00").unwrap()).unwrap();
    assert_eq!(result["ruleVersion"], "YQ-LEARNING-RULES-1.3.0");
    assert_eq!(result["facts"]["ruleVersion"], "YQ-MVP-RULES-1.1.0");
    assert_eq!(result["facts"]["currentStep"]["name"], "五之气");
    assert_eq!(
        result["facts"]["currentStepProgress"],
        json!({"elapsedRatio":0.929,"remainingCalendarDays":4,"endsOnInputDate":false})
    );
    assert_eq!(result["currentMovement"]["name"], "终运");
    assert_eq!(
        result["currentMovement"]["relation"]["traditionalLabel"],
        "相得 · 客生主"
    );
    assert_eq!(
        result["currentMovementProgress"],
        json!({"elapsedRatio":0.095,"remainingCalendarDays":63,"endsOnInputDate":false})
    );
    let edge = 1_800_430_190_000;
    let prev = learning(edge - 1).unwrap();
    let next = learning(edge).unwrap();
    assert_eq!(prev["facts"]["year"], 2026);
    assert_eq!(prev["currentMovementProgress"]["elapsedRatio"], 0.999);
    assert_eq!(
        prev["facts"]["currentStepProgress"]["remainingCalendarDays"],
        0
    );
    assert_eq!(next["facts"]["year"], 2027);
    assert_eq!(next["currentMovement"]["index"], 1);
    assert_eq!(next["currentMovementProgress"]["elapsedRatio"], 0.0);
    assert_eq!(next["facts"]["currentStepProgress"]["elapsedRatio"], 0.0);
}

#[test]
fn beijing_midnight_and_gregorian_centuries_use_calendar_days() {
    for (y, days, ratio) in [
        (1900, 1, 0.333),
        (2000, 2, 0.2),
        (2024, 2, 0.2),
        (2100, 1, 0.333),
    ] {
        let start = parse_datetime(&format!("{y}-02-28T00:00:00")).unwrap();
        let end = parse_datetime(&format!("{y}-03-01T12:00:00")).unwrap();
        let actual = progress(start, end, start + DAY_MS / 2);
        assert_eq!(actual["remainingCalendarDays"], days);
        assert_eq!(actual["elapsedRatio"], ratio);
    }
    let start = parse_datetime("2026-11-21T00:00:00").unwrap();
    assert_eq!(
        progress(start, start + DAY_MS, start + DAY_MS - 1),
        json!({"elapsedRatio":0.999,"remainingCalendarDays":1,"endsOnInputDate":false})
    );
}

#[test]
fn twin_fires_preserve_identity_in_both_directions() {
    assert_eq!(relations::current_qi(2, 3, 1)["label"], "顺 · 君位臣");
    assert_eq!(relations::current_qi(1, 1, 3)["label"], "逆 · 臣位君");
    for (host, guest) in [(1, 3), (3, 1)] {
        assert_eq!(
            qi_relation(host, guest),
            json!({"qiRelation":"DIFFERENT_QI","elementRelation":"SAME_ELEMENT","direction":"NONE","traditionalLabel":"同属火，六气不同"})
        );
    }
}

#[test]
fn learning_and_core_preserve_distinct_supported_range_errors() {
    let last = solar_term(2101, "大寒").unwrap();
    let first = solar_term(1900, "大寒").unwrap();
    for ms in [first - 1, last, last + 1] {
        assert_eq!(learning(ms).unwrap_err(), "请求时点无效");
        assert_eq!(current(ms).unwrap_err(), "年份必须是 1900 到 2100 的整数");
    }
    let ms = parse_datetime("2102-01-01T00:00:00").unwrap();
    assert_eq!(learning(ms).unwrap_err(), "请求时点超出支持范围");
    assert_eq!(
        current(ms).unwrap_err(),
        "dateTime 对应的运气年不在 1900 到 2100 支持范围内"
    );
}
