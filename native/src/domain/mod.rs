//! Native implementation of the frozen YunQi and learning rules. Public functions return
//! the service DTO (the transport's success/error envelope is applied by the caller).
mod readings;
mod relations;
mod rules;

use crate::calendar::{
    compare_local, format_time, local_day_number, local_year, solar_term, DAY_MS,
};
use rules::*;
use serde_json::{json, Value};
use std::cmp::Ordering;

pub use relations::compare_elements;
pub const RULE_VERSION: &str = "YQ-MVP-RULES-1.1.0";
pub const LEARNING_RULE_VERSION: &str = "YQ-LEARNING-RULES-1.3.0";

pub fn qi_element(qi: &str) -> &'static str {
    QI_NAMES
        .iter()
        .position(|name| *name == qi)
        .map_or("", |i| ELEMENTS[QI_ELEMENTS[i]])
}

const YEAR_RANGE_MESSAGE: &str = "年份必须是 1900 到 2100 的整数";

struct Annual {
    year: i32,
    stem: usize,
    branch: usize,
    // Seven ordered boundaries delimit six left-inclusive, right-exclusive periods.
    bounds: [i64; 7],
}

fn validate_bounds(bounds: &[i64]) -> Result<(), String> {
    if bounds
        .windows(2)
        .all(|pair| compare_local(pair[0], pair[1]) == Ordering::Less)
    {
        Ok(())
    } else {
        Err("历法服务暂时不可用".into())
    }
}

fn stage_at(bounds: &[i64], ms: i64) -> Result<usize, String> {
    bounds
        .windows(2)
        .position(|p| {
            compare_local(p[0], ms) != Ordering::Greater
                && compare_local(ms, p[1]) == Ordering::Less
        })
        .ok_or_else(|| "请求时点无效".to_owned())
}

impl Annual {
    fn new(year: i32, range_message: &str) -> Result<Self, String> {
        if !(1900..=2100).contains(&year) {
            return Err(range_message.into());
        }
        let cycle = (year - 1984).rem_euclid(60) as usize;
        let mut bounds = [0; 7];
        for (i, term) in TERMS.iter().enumerate() {
            bounds[i] = solar_term(year, term)?;
        }
        bounds[6] = solar_term(year + 1, TERMS[0])?;
        validate_bounds(&bounds)?;
        Ok(Self {
            year,
            stem: cycle % 10,
            branch: cycle % 12,
            bounds,
        })
    }
    fn at(ms: i64, civil_range_message: &str, year_range_message: &str) -> Result<Self, String> {
        let civil_year = local_year(ms);
        if !(1900..=2101).contains(&civil_year) {
            return Err(civil_range_message.into());
        }
        let first = solar_term(civil_year, "大寒")?;
        let year = if compare_local(ms, first) == Ordering::Less {
            civil_year - 1
        } else {
            civil_year
        };
        Self::new(year, year_range_message)
    }
    fn sitian(&self) -> usize {
        (self.branch + 1) % 6
    }
    fn guest_qi(&self, i: usize) -> usize {
        (self.sitian() + 4 + i) % 6
    }
    fn step(&self, i: usize) -> Value {
        let host = HOST_QI[i];
        let guest = self.guest_qi(i);
        json!({"index":i+1, "name":STEP_NAMES[i], "start":format_time(self.bounds[i]),
            "end":format_time(self.bounds[i+1]), "startTerm":TERMS[i], "endTerm":TERMS[(i+1)%6],
            "hostQi":QI_NAMES[host], "guestQi":QI_NAMES[guest],"relation":qi_relation(host,guest)})
    }
    fn dto(&self) -> Value {
        let year = self.year;
        let stem = STEMS[self.stem];
        let branch = BRANCHES[self.branch];
        let sitian = QI_NAMES[self.sitian()];
        let zaiquan = QI_NAMES[self.guest_qi(5)];
        let movement = Movement::annual(self.stem);
        let start = format_time(self.bounds[0]);
        let end = format_time(self.bounds[6]);
        let from = start["localTime"].as_str().expect("calendar time DTO");
        let until = end["localTime"].as_str().expect("calendar time DTO");
        let explanations = [
            format!("{year} 运气年以北京时间 {year} 年大寒实际交节时刻为起点。"),
            format!("该运气年的实际区间为 {from} 至 {until}（左闭右开）。"),
            format!(
                "年干{stem}按规则表对应{}运{}（{}）。",
                movement.name(),
                movement.state(),
                movement.tone()
            ),
            format!("年支{branch}按规则表对应司天{sitian}、在泉{zaiquan}。"),
            format!("三之气客气与司天同为{sitian}。"),
            format!("终之气客气与在泉同为{zaiquan}。"),
        ];
        json!({"ruleVersion":RULE_VERSION,"year":year,"stemBranch":{"ganzhi":format!("{stem}{branch}"),"stem":stem,"branch":branch},
            "interval":{"start":start,"end":end},"suiYun":movement.dto(),
            "sixQi":{"sitian":sitian,"zaiquan":zaiquan,"steps":(0..6).map(|i|self.step(i)).collect::<Vec<_>>()},
            "explanations":explanations})
    }
    fn facts_at(&self, ms: i64, idx: usize) -> Value {
        let mut result = self.dto();
        result["input"] = format_time(ms);
        result["currentStep"] = result["sixQi"]["steps"][idx].clone();
        result["currentStepProgress"] = progress(self.bounds[idx], self.bounds[idx + 1], ms);
        result
    }
    fn movement_bounds(&self) -> Result<[i64; 6], String> {
        let mut bounds = [0; 6];
        bounds[0] = self.bounds[0];
        bounds[5] = self.bounds[6];
        for (i, (term, days)) in MOVEMENT_OFFSETS.iter().enumerate() {
            bounds[i + 1] = solar_term(self.year, term)? + days * DAY_MS;
        }
        validate_bounds(&bounds)?;
        Ok(bounds)
    }
}
fn progress(start: i64, end: i64, ms: i64) -> Value {
    let ratio =
        ((((ms - start) as f64 / (end - start) as f64) * 1000.0).round() / 1000.0).min(0.999);
    let days = local_day_number(end) - local_day_number(ms);
    json!({"elapsedRatio":ratio, "remainingCalendarDays":days,"endsOnInputDate":days==0})
}

pub fn year(year: i32) -> Result<Value, String> {
    Ok(Annual::new(year, YEAR_RANGE_MESSAGE)?.dto())
}
pub fn current(ms: i64) -> Result<Value, String> {
    let annual = Annual::at(
        ms,
        "dateTime 对应的运气年不在 1900 到 2100 支持范围内",
        YEAR_RANGE_MESSAGE,
    )?;
    Ok(annual.facts_at(ms, stage_at(&annual.bounds, ms)?))
}

const MOVEMENT_OFFSETS: [(&str, i64); 4] = [("春分", 13), ("芒种", 10), ("处暑", 7), ("立冬", 4)];
const MOVEMENT_NAMES: [&str; 5] = ["初运", "二运", "三运", "四运", "终运"];
fn movement_label(i: usize) -> String {
    if i == 0 || i == 5 {
        return "大寒".into();
    }
    let (term, days) = MOVEMENT_OFFSETS[i - 1];
    format!("{term}后{days}日")
}
fn movement_dto(annual: &Annual, bounds: &[i64; 6], i: usize) -> Value {
    let host = Movement::host(annual.stem, i);
    let annual_movement = Movement::annual(annual.stem);
    let guest = Movement::host(annual.stem, (annual_movement.element + i) % 5);
    json!({"index":i+1,"name":MOVEMENT_NAMES[i],"start":format_time(bounds[i]),"end":format_time(bounds[i+1]),
        "startLabel":movement_label(i),"endLabel":movement_label(i+1),"host":host.dto(),"guest":guest.dto(),
        "relation":movement_relation(host,guest),"boundaryMethod":"节气交节时刻加整日（教学口径，待专家确认）",
        "explanation":"主运按木火土金水排列，客运从当年中运起排；太少采用《素问·六元正纪大论》所列五音次序。交运采用节气时刻加整日，不等同于古代每运七十三日五刻定长法。"})
}

pub fn learning(ms: i64) -> Result<Value, String> {
    let annual = Annual::at(ms, "请求时点超出支持范围", "请求时点无效")?;
    let qi_index = stage_at(&annual.bounds, ms)?;
    let bounds = annual.movement_bounds()?;
    let move_index = stage_at(&bounds, ms)?;
    let movements: Vec<_> = (0..5).map(|i| movement_dto(&annual, &bounds, i)).collect();
    let yun = Movement::annual(annual.stem);
    let sitian = annual.sitian();
    let (annual_passages, current_passages) =
        readings::for_stage(yun.name(), yun.state(), QI_NAMES[sitian], qi_index + 1);
    Ok(
        json!({"ruleVersion":LEARNING_RULE_VERSION,"facts":annual.facts_at(ms,qi_index),
        "annualRelation":relations::annual(yun.element,QI_ELEMENTS[sitian]),
        "currentQi":relations::current_qi(qi_index,HOST_QI[qi_index],annual.guest_qi(qi_index)),
        "currentMovement":movements[move_index],"currentMovementProgress":progress(bounds[move_index],bounds[move_index+1],ms),
        "movements":movements,"annualPassages":annual_passages,"currentPassages":current_passages,
        "notes":[
            "传统理论学习提示，须结合实际气候、症状及医师辨识；不作个人疾病预测。",
            "五步运采用节气交节后整日偏移的教学口径：春分后13日、芒种后10日、处暑后7日、立冬后4日。不是古代定长计刻法，交界判断待专家确认。",
            "经典摘录数据版本：YQ-CLASSICAL-READING-1.1.0。病候是原文内容，工程释义另列；摘录已核对电子文本，疑字待校勘，尚待专家审校。"
        ]}),
    )
}
#[cfg(test)]
mod tests;
