# Spec follow-up: final LF removal

确认无语义改动，新增发现0。

对两个当前文件分别补回恰好一个LF后，SHA256均与原spec-review.json记录完全一致；暂存内容也与当前文件相同。原审查文件未改写。

- `packages/yunqi-domain/tests/fixtures/classical-reading-witnesses.ts`：最终SHA256 `86e9fb989c7a0e9a30f4da8d23757d65ecc9440681e9bb228fb944fa0b750507`。
- `rules/CLASSICAL_READING_V1_1.md`：最终SHA256 `53ec4c3f86b8f612739ad9ca35cb87ee33ba72bc3262d73c34994cb33c46647a`。

仅核对本次两处尾部换行，不重审全树，不构建或执行测试。详细证明与原审查哈希绑定见spec-review-followup-newline.json。
