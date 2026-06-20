# 既知の問題 (Known Issues)

## 既知の問題一覧

### Issue-001: Worker は最小実装のまま

**影響度**: Medium

**説明**: worker は起動と設定読込のみで、実際の Instagram 投稿実行フローは未実装

**根本原因**: ローカル MVP では TASK-036 以降の実装範囲が未着手

**回避策**: backend API と DB 永続化の確認用途に限定して利用する

**修正予定**: 投稿 Worker 実装時

**ステータス**: Open

---

### Issue-002: Redis は起動基盤中心で、業務ロジックには未接続

**影響度**: Low

**説明**: Redis コンテナは起動するが、現時点では backend / worker の主要フローでキャッシュやジョブ制御に未使用

**根本原因**: Scheduler / Worker 実装前段のため

**回避策**: Redis は接続確認用途として扱う

**修正予定**: Scheduler / Worker 実装時

**ステータス**: Open

---

### Issue-003: データベース設計書と実装にはローカル MVP 拡張差分がある

**影響度**: High

**説明**: 現行 API を PostgreSQL へ接続するため、設計書の基本テーブルに加えて補助カラムと `content_versions` を追加している

**根本原因**: 先に UI / API 契約を動かすためのローカル MVP 差分を許容しているため

**回避策**: `03_architecture/database-design.md` と `infra/migrations/0002_local_mvp_extensions.sql` を合わせて参照する

**修正予定**: ドメイン確定後の DB 設計再整理時

**ステータス**: Open

---

### Issue-004: seed 再投入は既存ローカルデータを初期化する

**影響度**: Medium

**説明**: `./scripts/local-db.sh seed` は `seed.sql` 内で `TRUNCATE ... CASCADE` を実行するため、手元で追加したデータが消える

**根本原因**: ローカル検証の再現性を優先しているため

**回避策**: 必要なデータは再投入前に退避し、通常の確認では `migrate` のみを使う

**修正予定**: 将来の fixture / differential seed 整備時

**ステータス**: Open

---

### Issue-005: GUI 接続時は host 側ポート変更に注意が必要

**影響度**: Low

**説明**: frontend / backend は 3100 / 4100 に変更して起動することがあるが、PostgreSQL は通常 5432 のままのため、GUI 接続時に混同しやすい

**根本原因**: Docker Compose の host 側ポート上書き運用

**回避策**: `infra/.env` の `POSTGRES_PORT` を確認し、GUI クライアントにはその値を設定する

**修正予定**: なし

**ステータス**: Open

---

## 修正完了した問題

現時点ではなし

---

## 問題報告方法

問題を発見した場合:

1. 既知の問題を確認
2. GitHub Issues で新しい Issue を作成
3. サポートメールに送信: support@example.com
