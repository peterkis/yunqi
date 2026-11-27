//! GB/T 46939-2025 questionnaire and YQ-CONSTITUTION-1.0.0 scoring.
//! The versioned data contains the exact wording, item order and scoring directions
//! from the source questionnaire. Answers are borrowed for one call only.
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::sync::OnceLock;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Questionnaire {
    id: String,
    version: String,
    title: String,
    standard: String,
    source_url: String,
    source_note: String,
    instructions: Vec<String>,
    questions: Vec<Question>,
    scales: Vec<Scale>,
    options: Vec<OptionLabel>,
}

#[derive(Serialize, Deserialize)]
struct OptionLabel {
    value: u8,
    label: String,
}

#[derive(Serialize, Deserialize)]
struct Question {
    id: String,
    text: String,
    sex: String,
}

#[derive(Serialize, Deserialize)]
struct Scale {
    id: String,
    name: String,
    items: Vec<Item>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Item {
    question_id: String,
    reverse: bool,
}

fn definition() -> &'static Questionnaire {
    static DEFINITION: OnceLock<Questionnaire> = OnceLock::new();
    DEFINITION.get_or_init(|| {
        serde_json::from_str(include_str!("questionnaire.json"))
            .expect("the bundled GBT46939-2025 questionnaire must be valid")
    })
}

pub fn questionnaire() -> Value {
    json!(definition())
}

fn invalid(message: &str) -> Value {
    json!({"code":"INVALID_ARGUMENT","message":message,"details":{}})
}

fn issue(path: &str, keyword: &str, message: &str) -> Value {
    json!({"instancePath":path,"keyword":keyword,"message":message})
}

fn validation(issues: Vec<Value>) -> Value {
    json!({"code":"INVALID_ARGUMENT","message":"请求参数无效","details":{"issues":issues}})
}

fn must_be(path: &str, kind: &str) -> Value {
    validation(vec![issue(path, "type", &format!("must be {kind}"))])
}

fn invalid_answers() -> Value {
    invalid("量表提交无效，请检查版本、性别及完整作答")
}

fn answer_key_matches_schema(key: &str) -> bool {
    let bytes = key.as_bytes();
    (1..=32).contains(&bytes.len())
        && bytes[0].is_ascii_lowercase()
        && bytes
            .iter()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || matches!(b, b'_' | b'-'))
}

// Return the same AJV issues and pre-validation precedence as the original API.
// A JSON numeric literal 1.0 is an integer value just as it is in JavaScript.
fn validate(body: &Value) -> Result<(&str, &Map<String, Value>), Value> {
    let body = body.as_object().ok_or_else(|| must_be("", "object"))?;
    let answers = body.get("answers");
    let has_non_number = match answers {
        Some(Value::Object(values)) => values.values().any(|v| !v.is_number()),
        Some(Value::Array(values)) => values.iter().any(|v| !v.is_number()),
        _ => false,
    };
    if has_non_number {
        return Err(invalid("量表分值必须为整数"));
    }
    let keys = ["questionnaireId", "sex", "answers"];
    for key in &keys {
        if !body.contains_key(*key) {
            return Err(validation(vec![issue(
                "",
                "required",
                &format!("must have required property '{key}'"),
            )]));
        }
    }
    if body.keys().any(|key| !keys.contains(&key.as_str())) {
        return Err(validation(vec![issue(
            "",
            "additionalProperties",
            "must NOT have additional properties",
        )]));
    }
    let version = &body["questionnaireId"];
    if version.is_array() || version.is_object() {
        return Err(must_be("/questionnaireId", "string"));
    }
    if version.as_str() != Some(definition().id.as_str()) {
        return Err(validation(vec![issue(
            "/questionnaireId",
            "const",
            "must be equal to constant",
        )]));
    }
    let sex = &body["sex"];
    let sex = match sex.as_str() {
        Some(valid @ ("male" | "female")) => valid,
        _ => {
            let mut issues = Vec::new();
            for _ in 0..2 {
                if sex.is_array() || sex.is_object() {
                    issues.push(issue("/sex", "type", "must be string"));
                }
                issues.push(issue("/sex", "const", "must be equal to constant"));
            }
            issues.push(issue("/sex", "anyOf", "must match a schema in anyOf"));
            return Err(validation(issues));
        }
    };
    let answers = body["answers"]
        .as_object()
        .ok_or_else(|| must_be("/answers", "object"))?;
    if answers.len() > 27 {
        return Err(validation(vec![issue(
            "/answers",
            "maxProperties",
            "must NOT have more than 27 properties",
        )]));
    }
    for (key, value) in answers
        .iter()
        .filter(|(key, _)| answer_key_matches_schema(key))
    {
        let number = value.as_f64().ok_or_else(invalid_answers)?;
        let problem = if number.fract() != 0.0 {
            Some(("type", "must be integer"))
        } else if number > 5.0 {
            Some(("maximum", "must be <= 5"))
        } else if number < 1.0 {
            Some(("minimum", "must be >= 1"))
        } else {
            None
        };
        if let Some((keyword, message)) = problem {
            return Err(validation(vec![issue(
                &format!("/answers/{key}"),
                keyword,
                message,
            )]));
        }
    }
    let applicable = definition()
        .questions
        .iter()
        .filter(|q| q.sex == "all" || q.sex == sex);
    if applicable.clone().count() != answers.len()
        || applicable.into_iter().any(|q| !answers.contains_key(&q.id))
    {
        return Err(invalid_answers());
    }
    Ok((sex, answers))
}

struct Score<'a> {
    scale: &'a Scale,
    raw: u32,
    count: u32,
}

impl Score<'_> {
    fn numerator(&self) -> u32 {
        (self.raw - self.count) * 100
    }

    fn denominator(&self) -> u32 {
        self.count * 4
    }

    fn at_least(&self, threshold: u32) -> bool {
        self.numerator() >= threshold * self.denominator()
    }

    fn classify(&self, all: &[Score]) -> Status {
        if self.scale.id == "balanced" {
            if !self.at_least(60) {
                return Status::No;
            }
            let mut biased = all.iter().filter(|s| s.scale.id != "balanced");
            if biased.clone().any(|s| s.at_least(40)) {
                return Status::No;
            }
            if biased.any(|s| s.at_least(30)) {
                return Status::Basically;
            }
            return Status::Yes;
        }
        if self.at_least(40) {
            Status::Yes
        } else if self.at_least(30) {
            Status::Tendency
        } else {
            Status::No
        }
    }
}

#[derive(Clone, Copy, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
enum Status {
    Yes,
    Basically,
    Tendency,
    No,
}

impl Status {
    fn label(self) -> &'static str {
        match self {
            Self::Yes => "是",
            Self::Basically => "基本是",
            Self::Tendency => "倾向是",
            Self::No => "否",
        }
    }
}

pub fn assess(body: &Value) -> Result<Value, Value> {
    let (sex, answers) = validate(body)?;
    let form = definition();
    let scores: Vec<_> = form
        .scales
        .iter()
        .map(|scale| {
            let mut score = Score {
                scale,
                raw: 0,
                count: 0,
            };
            for item in &scale.items {
                if let Some(answer) = answers.get(&item.question_id).and_then(Value::as_f64) {
                    let points = answer as u32;
                    score.count += 1;
                    score.raw += if item.reverse { 6 - points } else { points };
                }
            }
            score
        })
        .collect();

    let mut matched = Vec::new();
    let mut tendencies = Vec::new();
    let mut basically_balanced = false;
    let results: Vec<_> = scores.iter().map(|score| {
        let status = score.classify(&scores);
        match status {
            Status::Yes => matched.push(score.scale),
            Status::Tendency => tendencies.push(score.scale),
            Status::Basically => basically_balanced = true,
            Status::No => (),
        }
        json!({
            "id":score.scale.id, "name":score.scale.name, "itemCount":score.count,
            "rawScore":score.raw, "score":f64::from(score.numerator()) / f64::from(score.denominator()),
            "status":status, "label":status.label(),
        })
    }).collect();
    let names = |scales: &[&Scale]| {
        scales
            .iter()
            .map(|s| s.name.as_str())
            .collect::<Vec<_>>()
            .join("、")
    };
    let mut summary = if basically_balanced {
        "量表判定：基本是平和质".to_owned()
    } else if matched.is_empty() {
        "本次量表未达到明确类型判定条件".to_owned()
    } else {
        format!(
            "量表判定：{}{}",
            names(&matched),
            if matched.len() > 1 {
                "（兼夹）"
            } else {
                ""
            }
        )
    };
    if !tendencies.is_empty() {
        summary.push_str(&format!("；存在{}倾向", names(&tendencies)));
    }
    summary.push('。');

    Ok(json!({
        "questionnaireId":form.id, "version":form.version, "sex":sex, "results":results,
        "matchedTypes":matched.iter().map(|s| &s.id).collect::<Vec<_>>(),
        "tendencyTypes":tendencies.iter().map(|s| &s.id).collect::<Vec<_>>(),
        "summary":summary,
        "boundaryNote":"结果基于近一年自报体验及所选量表规则，供医师复核；不等同于诊断、先天禀赋或个人疾病风险，不能替代四诊与临床评估。",
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn input(sex: &str) -> Value {
        let mut answers: Map<_, _> = definition()
            .questions
            .iter()
            .filter(|q| q.sex == "all" || q.sex == sex)
            .map(|q| (q.id.clone(), json!(1)))
            .collect();
        answers.insert("energy".into(), json!(5));
        json!({"questionnaireId":"GBT46939-2025","sex":sex,"answers":answers})
    }

    #[test]
    fn scoring_uses_sex_specific_denominator_and_preserves_ties() {
        for (sex, item) in [("male", "damp_scrotum"), ("female", "yellow_discharge")] {
            let mut body = input(sex);
            assert_eq!(body["answers"].as_object().unwrap().len(), 26);
            let balanced = assess(&body).unwrap();
            assert_eq!(balanced["matchedTypes"], json!(["balanced"]));
            assert_eq!(balanced["results"][0]["rawScore"], 20);
            for id in [
                "body_heat",
                "dry_skin_lips",
                "flushed_cheeks",
                "oily_face",
                "dark_urine",
                item,
            ] {
                body["answers"][id] = json!(3);
            }
            let result = assess(&body).unwrap();
            assert_eq!(result["results"][5]["itemCount"], 3);
            assert_eq!(result["results"][5]["score"].as_f64(), Some(50.0));
            assert_eq!(result["summary"], "量表判定：阴虚质、湿热质（兼夹）。");
        }
    }

    #[test]
    fn unrounded_thresholds_and_reverse_item() {
        let mut body = input("female");
        body["answers"]["fatigue"] = json!(5.0);
        let result = assess(&body).unwrap();
        assert_eq!(result["results"][0]["rawScore"], 16);
        assert_eq!(result["results"][1]["score"].as_f64(), Some(100.0 / 3.0));
        assert_eq!(
            result["summary"],
            "量表判定：基本是平和质；存在气虚质倾向。"
        );
        body["answers"]["short_breath"] = json!(2);
        assert_eq!(
            assess(&body).unwrap()["matchedTypes"],
            json!(["qi_deficiency"])
        );
    }

    #[test]
    fn incomplete_inapplicable_and_invalid_answers_return_errors() {
        let original = input("female");
        for id in original["answers"].as_object().unwrap().keys() {
            let mut body = original.clone();
            body["answers"].as_object_mut().unwrap().remove(id);
            assert!(assess(&body).is_err());
        }
        let mut body = original.clone();
        body["answers"]["damp_scrotum"] = json!(1);
        assert!(assess(&body).is_err());
        for invalid in [
            json!(0),
            json!(6),
            json!(1.5),
            json!("1"),
            Value::Null,
            json!([1]),
            json!(true),
        ] {
            let mut body = original.clone();
            body["answers"]["energy"] = invalid;
            assert!(assess(&body).is_err());
        }
    }
}
