//! Validate production dispatch against the repository's immutable freeze in Cargo alone.
//! No Node service, network resolver or generated schema copy participates in this gate.
use serde_json::{json, Map, Value};
use std::collections::BTreeSet;
use yunqi_core::dispatch;

const FIXED_NOW: i64 = 1_794_801_600_000;
const FREEZE: &str =
    include_str!("../../packages/yunqi-contracts/contract/YQ-API-CONTRACT-1.4.0.freeze.json");
const REGISTRY: &str = include_str!("../../packages/yunqi-contracts/contract/registry.json");

fn validator(contract: &Value, schema: &Value) -> jsonschema::Validator {
    // Keep the document-local OpenAPI reference addresses from the frozen schema.
    // All references are fragments; default HTTP/file resolution is disabled.
    let mut root = schema.clone();
    root["$schema"] = json!("https://json-schema.org/draft/2020-12/schema");
    root["components"] = json!({"schemas": contract["schemas"]});
    jsonschema::validator_for(&root).expect("frozen JSON schema compiles")
}

fn check(schema: &jsonschema::Validator, value: &Value, context: &str) {
    if let Err(e) = schema.validate(value) {
        panic!(
            "schema mismatch on {context}: {:?} at {}",
            e.kind(),
            e.instance_path()
        );
    }
}

#[test]
fn every_frozen_operation_validates_its_native_request_and_serialized_response() {
    let contract: Value = serde_json::from_str(FREEZE).unwrap();
    let registry: Value = serde_json::from_str(REGISTRY).unwrap();
    assert_eq!(contract["contractId"], "YQ-API-CONTRACT-1.4.0");
    assert_eq!(
        registry["contractIds"].as_array().unwrap().last(),
        Some(&contract["contractId"])
    );
    let form = dispatch(
        "GET",
        "/api/v1/constitution/questionnaire",
        &Value::Null,
        FIXED_NOW,
    )
    .body;
    let form = &form["data"];
    let answers: Map<_, _> = form["questions"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|q| matches!(q["sex"].as_str(), Some("male" | "all")))
        .map(|q| (q["id"].as_str().unwrap().to_owned(), json!(2)))
        .collect();
    let timestamp = json!({"dateTime":"2026-11-18T08:44:00.123+08:00"});
    let cases = [
        ("GET", "/api/v1/yunqi/year/{year}", Value::Null),
        ("GET", "/api/v1/yunqi/current", Value::Null),
        ("GET", "/api/v1/yunqi/learning/current", Value::Null),
        ("GET", "/api/v1/constitution/questionnaire", Value::Null),
        ("POST", "/api/v1/yunqi/calculate", timestamp.clone()),
        ("POST", "/api/v1/yunqi/learning/calculate", timestamp),
        (
            "POST",
            "/api/v1/yunqi/learning/birth-date-preview",
            json!({"calendar":"lunar","year":2023,"month":2,"day":1}),
        ),
        (
            "POST",
            "/api/v1/yunqi/learning/birth-comparison",
            json!({"birthDate":"2024-01-20"}),
        ),
        (
            "POST",
            "/api/v1/yunqi/learning/birth-year-comparison",
            json!({"year":1991}),
        ),
        (
            "POST",
            "/api/v1/constitution/assess",
            json!({"questionnaireId":form["id"],"sex":"male","answers":answers}),
        ),
    ];
    let covered: BTreeSet<_> = cases
        .iter()
        .map(|(method, path, _)| (path.to_string(), method.to_ascii_lowercase()))
        .collect();
    let frozen: BTreeSet<_> = contract["paths"]
        .as_object()
        .unwrap()
        .iter()
        .flat_map(|(path, operations)| {
            operations
                .as_object()
                .unwrap()
                .keys()
                .map(move |method| (path.clone(), method.clone()))
        })
        .collect();
    assert_eq!(
        covered, frozen,
        "every declared method/path must have a real call"
    );
    for (method, template, body) in cases {
        let path = template.replace("{year}", "2026");
        let op = &contract["paths"][template][method.to_ascii_lowercase()];
        let response_validator = |status: &str| {
            validator(
                &contract,
                &op["responses"][status]["content"]["application/json"]["schema"],
            )
        };
        if method == "POST" {
            let req_validator = validator(
                &contract,
                &op["requestBody"]["content"]["application/json"]["schema"],
            );
            check(&req_validator, &body, &path);
            let invalid = json!({"unrecognizedParameter":true});
            assert!(!req_validator.is_valid(&invalid));
            let rejected = dispatch(method, &path, &invalid, FIXED_NOW);
            assert_eq!(rejected.status, 400);
            check(&response_validator("400"), &rejected.body, &path);
        } else if template.ends_with("{year}") {
            let param = validator(&contract, &op["parameters"][0]["schema"]);
            assert!(param.is_valid(&json!(2026)));
            assert!(!param.is_valid(&json!(1899)));
            let rejected = dispatch(method, "/api/v1/yunqi/year/1899", &body, FIXED_NOW);
            assert_eq!(rejected.status, 400);
            check(&response_validator("400"), &rejected.body, &path);
        }
        let reply = dispatch(method, &path, &body, FIXED_NOW);
        assert_eq!(reply.status, 200, "{path}");
        let decoded: Value =
            serde_json::from_slice(&serde_json::to_vec(&reply.body).unwrap()).unwrap();
        let response = response_validator("200");
        check(&response, &decoded, &path);
        // Prove that closed envelopes and linked nested DTO constraints are enforced.
        let mut extra_field = decoded.clone();
        extra_field["unexpected"] = json!(true);
        assert!(!response.is_valid(&extra_field), "{path}");
        if template == "/api/v1/yunqi/learning/current" {
            let mut invalid_nested = decoded;
            invalid_nested["data"]["facts"]["currentStepProgress"]["elapsedRatio"] = json!(1);
            assert!(
                !response.is_valid(&invalid_nested),
                "exclusiveMaximum in nested DTO"
            );
        }
    }
}
