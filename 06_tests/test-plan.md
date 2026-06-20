# テスト計画

## テスト戦略

### テストレベル

1. **ユニットテスト**: 個別の関数・メソッドの動作確認
2. **統合テスト**: コンポーネント間の連携確認
3. **E2Eテスト**: ユーザーシナリオ全体の動作確認
4. **パフォーマンステスト**: 負荷テスト、レスポンスタイム確認

## テストカバレッジ目標

- ユニットテスト: 80%以上
- 統合テスト: 重要な機能は100%
- E2Eテスト: ユーザーシナリオは100%

## テスト環境

- frontend / backend / worker / PostgreSQL / Redis を Docker Compose で起動する
- backend は PostgreSQL を参照する
- ローカル DB 初期化は `./scripts/local-db.sh bootstrap` を使用する
- frontend は既定で backend API を `http://localhost:4000/api` に接続する
- ポート競合時は `infra/.env` で host 側ポートを変更する

## テストデータ

- `05_source_code/infra/seed.sql` を標準の初期データとする
- seed データには user 1件を含む
- seed データには instagram account 1件を含む
- seed データには media assets 3件を含む
- seed データには content 1件を含む
- seed データには schedule 1件を含む
- seed データには posting jobs 2件を含む
- seed データには audit log 1件を含む

## 最小確認項目

### 起動確認

1. `./scripts/local-stack.sh up` が成功する
2. `./scripts/local-db.sh bootstrap` が成功する
3. `curl http://localhost:4000/api/health` が `{"status":"ok"}` を返す

### backend 確認

1. `GET /api/integrations/instagram/status` が seed データを返す
2. `GET /api/contents` が seed コンテンツを返す
3. `GET /api/jobs/logs` が posting_jobs の seed データを返す
4. `GET /api/audit-logs` が audit_logs の seed データを返す
5. `GET /api/dashboard/summary` が KPI、失敗一覧、未実行一覧、要再認可アカウントを返す

### 開発品質確認

1. backend: `npm run typecheck`
2. frontend: `npm run typecheck`
3. worker: `npm run typecheck`

### 要件 6 の確認

1. ダッシュボードで投稿実行率、週次投稿本数、失敗件数、未実行件数が表示される
2. ダッシュボードで失敗投稿一覧と KPI 未達アラートが表示される
3. カレンダー画面で Day / Week / Month の切替と予約イベント表示を確認できる
4. Playwright の `e2e/operations-visibility.spec.ts` が成功する

## テストスケジュール

- ユニットテスト: 開発中継続
- 統合テスト: 機能完成時
- E2Eテスト: リリース前
- パフォーマンステスト: リリース前
