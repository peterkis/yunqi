//! Teaching labels and explanations are part of the versioned response contract.
use super::readings::{Source, FIVE_ELEMENTS, SUWEN_LIUWEI, SUWEN_ZHIZHEN, YIZONGJINJIAN_35};
use super::rules::{Direction, ELEMENTS, QI_ELEMENTS, QI_NAMES, STEP_NAMES};
use serde_json::{json, Value};

fn mapped(
    title: &str,
    label: &str,
    relation: String,
    explanation: &str,
    sources: &[Source],
) -> Value {
    json!({"title":title,"label":label,"relation":relation,"explanation":explanation,
        "sourceIds":sources.iter().map(|s|s.id).collect::<Vec<_>>(),
        "sources":sources.iter().map(|s|s.reference()).collect::<Vec<_>>()})
}

pub(super) fn annual(yun_idx: usize, qi_idx: usize) -> Value {
    let yun = ELEMENTS[yun_idx];
    let qi = ELEMENTS[qi_idx];
    let (label, relation, explanation) = match Direction::of(qi_idx, yun_idx) {
        Direction::Same => (
            "天符",
            format!("司天{qi}与中运{yun}同五行"),
            "司天与中运五行相同。此处只判断天符，不据此判断岁会、平气或疾病。",
        ),
        Direction::HostGenerates => (
            "顺化",
            format!("司天{qi}生中运{yun}"),
            "司天之气生中运，传统称顺化；这是年度运气相合的关系名称。",
        ),
        Direction::HostControls => (
            "天刑",
            format!("司天{qi}克中运{yun}"),
            "司天之气克中运，传统称天刑；不能把名称当作个体病情或疾病风险。",
        ),
        Direction::GuestGenerates => (
            "小逆",
            format!("中运{yun}生司天{qi}"),
            "中运生司天之气，传统称小逆。这里仍是相生关系，与当步客主气顺逆的比较对象不同。",
        ),
        Direction::GuestControls => (
            "不和",
            format!("中运{yun}克司天{qi}"),
            "中运克司天之气，传统称不和；用于理解年度结构，不表示个人必然患病。",
        ),
    };
    mapped(
        "全年 · 司天与中运",
        label,
        relation,
        explanation,
        &[YIZONGJINJIAN_35],
    )
}

pub(super) fn current_qi(index: usize, host: usize, guest: usize) -> Value {
    let h = ELEMENTS[QI_ELEMENTS[host]];
    let g = ELEMENTS[QI_ELEMENTS[guest]];
    let (label, relation, explanation) = match (
        host,
        guest,
        Direction::of(QI_ELEMENTS[host], QI_ELEMENTS[guest]),
    ) {
        (3, 1, _) => (
            "顺 · 君位臣",
            "客少阴君火加临主少阳相火".into(),
            "君火与相火同属火，但为不同六气；按“君位臣则顺”解释，不合并为同气。",
        ),
        (1, 3, _) => (
            "逆 · 臣位君",
            "客少阳相火加临主少阴君火".into(),
            "君火与相火同属火，但为不同六气；按“臣位君则逆”解释，不合并为同气。",
        ),
        (_, _, Direction::HostGenerates) => (
            "相生 · 相得",
            format!("主{h}生客{g}"),
            "主气生客气，保留方向并说明相得；不将所有相生关系强行分成顺逆。",
        ),
        (_, _, Direction::GuestGenerates) => (
            "相生 · 相得",
            format!("客{g}生主{h}"),
            "客气生主气，保留方向并说明相得；相得不是个体健康结论。",
        ),
        (_, _, Direction::HostControls) => (
            "逆 · 主胜客",
            format!("主{h}克客{g}"),
            "按“主胜逆”解释当步关系；此处的逆不等于病情严重或一定患病。",
        ),
        (_, _, Direction::GuestControls) => (
            "顺 · 客胜主",
            format!("客{g}克主{h}"),
            "按“客胜从”解释，界面以顺（从）帮助理解；五行仍然相克，不能误读为相生。",
        ),
        (_, _, Direction::Same) => (
            "同气",
            format!("主客均为{}", QI_NAMES[host]),
            "主气与客气名称相同；只说明客主气结构，不推断个人体质或疾病。",
        ),
    };
    mapped(
        &format!("{} · 客主加临", STEP_NAMES[index]),
        label,
        relation,
        explanation,
        &[SUWEN_ZHIZHEN, SUWEN_LIUWEI],
    )
}

pub fn compare_elements(title: &str, birth: &str, current: &str) -> Value {
    let element = |name: &str| {
        ELEMENTS
            .iter()
            .position(|e| *e == name)
            .expect("comparison uses validated internal elements")
    };
    let (label, relation) = match Direction::of(element(birth), element(current)) {
        Direction::Same => ("同五行", format!("出生{birth}与当前{current}同五行")),
        Direction::HostGenerates => ("出生生当前", format!("出生{birth}生当前{current}")),
        Direction::GuestGenerates => ("当前生出生", format!("当前{current}生出生{birth}")),
        Direction::HostControls => ("出生克当前", format!("出生{birth}克当前{current}")),
        Direction::GuestControls => ("当前克出生", format!("当前{current}克出生{birth}")),
    };
    mapped(
        title,
        label,
        relation,
        "同一维度的传统五行关系，供结合实际症状和体质辨识互参；不换算九种体质或疾病概率。",
        &[FIVE_ELEMENTS],
    )
}
