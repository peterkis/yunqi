//! Curated text and source references shared by annual, period and birth results.
//! selectors identify the actual annual movement or (sitian, period), independently of civil year.
use serde_json::{json, Value};

#[derive(Clone, Copy)]
pub(super) struct Source {
    pub id: &'static str,
    pub work: &'static str,
    pub chapter: &'static str,
    pub url: &'static str,
}

impl Source {
    pub fn reference(self) -> Value {
        json!({"id":self.id,"title":format!("《{}》{}",self.work,self.chapter),"url":self.url})
    }
}

enum Selector {
    AnnualMovement(&'static str, &'static str),
    AnnualQi(&'static str),
    Period(&'static str, usize),
}

struct Passage {
    id: &'static str,
    source: Source,
    section: &'static str,
    selector: Selector,
    quote: &'static str,
    explanation: &'static str,
}

impl Passage {
    fn dto(&self) -> Value {
        let scope = match self.selector {
            Selector::AnnualMovement(..) => "annual-movement",
            Selector::AnnualQi(..) => "annual-qi",
            Selector::Period(..) => "qi-period",
        };
        json!({"id":self.id,"work":self.source.work,"chapter":self.source.chapter,"section":self.section,
            "scope":scope,"quote":self.quote,"explanation":self.explanation,"sourceUrl":self.source.url})
    }
}

include!("reading_data.rs");

pub(super) fn for_stage(
    element: &str,
    state: &str,
    sitian: &str,
    period: usize,
) -> (Vec<Value>, Vec<Value>) {
    let mut annual = Vec::with_capacity(2);
    let mut current = Vec::with_capacity(1);
    for p in &PASSAGES {
        match &p.selector {
            Selector::AnnualMovement(e, s) if *e == element && *s == state => annual.push(p.dto()),
            Selector::AnnualQi(q) if *q == sitian => annual.push(p.dto()),
            Selector::Period(q, i) if *q == sitian && *i == period => current.push(p.dto()),
            _ => {}
        }
    }
    (annual, current)
}
