//! JavaScript's \\d in the public TypeBox patterns admits ASCII digits only.
use serde_json::json;
use yunqi_core::dispatch;

#[test]
fn fullwidth_numerals_fail_at_the_schema_boundary() {
    let tests = [
        (
            "calculate",
            json!({"dateTime":"２０２６-11-18T08:44:00"}),
            "/dateTime",
        ),
        (
            "learning/birth-comparison",
            json!({"birthDate":"１９９０-03-21"}),
            "/birthDate",
        ),
        (
            "learning/birth-comparison",
            json!({"birthDate":"1990-03-21","birthTime":"０８:15:00"}),
            "/birthTime",
        ),
    ];
    for (endpoint, body, path) in tests {
        let response = dispatch("POST", &format!("/api/v1/yunqi/{endpoint}"), &body, 0);
        assert_eq!(response.status, 400);
        let issues = response.body["details"]["issues"].as_array().unwrap();
        assert_eq!(issues.len(), 1);
        assert_eq!(issues[0]["instancePath"], path);
        assert_eq!(issues[0]["keyword"], "pattern");
    }
}
