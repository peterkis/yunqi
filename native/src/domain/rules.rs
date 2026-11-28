//! Frozen rules, anchored at the 1984 甲子 year. Qi indices follow the guest sequence.
use serde_json::{json, Value};

pub(super) const STEMS: [&str; 10] = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
pub(super) const BRANCHES: [&str; 12] = [
    "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥",
];
pub(super) const QI_NAMES: [&str; 6] = [
    "厥阴风木",
    "少阴君火",
    "太阴湿土",
    "少阳相火",
    "阳明燥金",
    "太阳寒水",
];
pub(super) const HOST_QI: [usize; 6] = [0, 1, 3, 2, 4, 5];
pub(super) const STEP_NAMES: [&str; 6] =
    ["初之气", "二之气", "三之气", "四之气", "五之气", "终之气"];
pub(super) const TERMS: [&str; 6] = ["大寒", "春分", "小满", "大暑", "秋分", "小雪"];
pub(super) const ELEMENTS: [&str; 5] = ["木", "火", "土", "金", "水"];
pub(super) const QI_ELEMENTS: [usize; 6] = [0, 1, 2, 1, 3, 4];
const STEM_ELEMENTS: [usize; 10] = [2, 3, 4, 0, 1, 2, 3, 4, 0, 1];
const TONES: [[&str; 2]; 5] = [
    ["太角", "少角"],
    ["太徵", "少徵"],
    ["太宫", "少宫"],
    ["太商", "少商"],
    ["太羽", "少羽"],
];
const FIRST_HOST_EXCESS: [bool; 10] = [
    true, true, true, false, false, false, false, false, true, true,
];

#[derive(Clone, Copy)]
pub(super) struct Movement {
    pub element: usize,
    pub excess: bool,
}
impl Movement {
    pub fn annual(stem: usize) -> Self {
        Self {
            element: STEM_ELEMENTS[stem],
            excess: stem % 2 == 0,
        }
    }
    pub fn host(stem: usize, position: usize) -> Self {
        Self {
            element: position,
            excess: FIRST_HOST_EXCESS[stem] == (position % 2 == 0),
        }
    }
    pub fn name(self) -> &'static str {
        ELEMENTS[self.element]
    }
    pub fn state(self) -> &'static str {
        if self.excess {
            "太过"
        } else {
            "不及"
        }
    }
    pub fn tone(self) -> &'static str {
        TONES[self.element][usize::from(!self.excess)]
    }
    pub fn dto(self) -> Value {
        json!({"element":self.name(), "state":self.state(), "tone":self.tone()})
    }
}

#[derive(PartialEq, Eq, Copy, Clone)]
pub(super) enum Direction {
    Same,
    HostGenerates,
    GuestGenerates,
    HostControls,
    GuestControls,
}
impl Direction {
    pub fn of(host: usize, guest: usize) -> Self {
        // In 木火土金水 order, the next element is generated and the one after that is controlled.
        match (guest + 5 - host) % 5 {
            0 => Self::Same,
            1 => Self::HostGenerates,
            2 => Self::HostControls,
            3 => Self::GuestControls,
            _ => Self::GuestGenerates,
        }
    }
    fn code(self) -> &'static str {
        match self {
            Self::Same => "NONE",
            Self::HostGenerates => "HOST_GENERATES_GUEST",
            Self::GuestGenerates => "GUEST_GENERATES_HOST",
            Self::HostControls => "HOST_CONTROLS_GUEST",
            Self::GuestControls => "GUEST_CONTROLS_HOST",
        }
    }
    fn element_relation(self) -> &'static str {
        if self == Self::Same {
            "SAME_ELEMENT"
        } else {
            "DIFFERENT_ELEMENT"
        }
    }
}

pub(super) fn qi_relation(host: usize, guest: usize) -> Value {
    let direction = Direction::of(QI_ELEMENTS[host], QI_ELEMENTS[guest]);
    let label = match direction {
        Direction::Same if host == guest => "同气",
        Direction::Same => "同属火，六气不同",
        Direction::HostGenerates => "主生客，相得",
        Direction::GuestGenerates => "客生主，相得",
        Direction::HostControls => "主克客",
        Direction::GuestControls => "客克主",
    };
    json!({"qiRelation":if host==guest {"SAME_QI"} else {"DIFFERENT_QI"},
        "elementRelation":direction.element_relation(), "direction":direction.code(),"traditionalLabel":label})
}

pub(super) fn movement_relation(host: Movement, guest: Movement) -> Value {
    let direction = Direction::of(host.element, guest.element);
    let label = match direction {
        Direction::Same => format!(
            "同属{}运 · 太少{}",
            host.name(),
            if host.excess == guest.excess {
                "相同"
            } else {
                "不同"
            }
        ),
        Direction::HostGenerates => "相得 · 主生客".into(),
        Direction::GuestGenerates => "相得 · 客生主".into(),
        Direction::HostControls => "逆 · 主胜客".into(),
        Direction::GuestControls => "顺 · 客胜主".into(),
    };
    json!({"elementRelation":direction.element_relation(), "direction":direction.code(),"traditionalLabel":label})
}
