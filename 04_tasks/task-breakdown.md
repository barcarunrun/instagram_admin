# タスク分解

## タスク分解の方針

- 現時点ではクラウド基盤は前提にせず、まずはローカルで起動・確認できるソースコードを完成させる。
- 初期タスクは「ローカル起動できる API / UI / Worker / DB 接続」を優先し、クラウド移行用の整備は後段へ寄せる。
- 要件ごとに、API、Worker、UI、運用、テストまで分けてタスク化する。
- 実装順は [04_tasks/implementation-order.md](04_tasks/implementation-order.md) に合わせる。
- 担当者は個人名ではなく担当ロールで記載し、アサイン時に具体名へ置換する。
- TASK-ID の完了条件には、対象ブランチの push または PR 更新によって GitHub Actions CI を実行し、成功を確認することを含める。

## 共通基盤（ローカル開発優先）

関連ドキュメント: [01_requirements/prd.md](01_requirements/prd.md), [03_architecture/architecture.md](03_architecture/architecture.md), [04_tasks/implementation-order.md](04_tasks/implementation-order.md)

**分解されたタスク:**

1. **TASK-001**: 開発基盤セットアップ
   - 説明: frontend / backend / worker の責務を確定し、まずはローカルで起動できる雛形コード、Lint、Formatter、型チェック、環境変数テンプレートを整備する。
   - ステータス: 完了（2026-06-20）
   - ストーリーポイント: 5
   - 担当者: Platform
   - 依存タスク: なし
   - 関連PR: 未定

2. **TASK-002**: ローカル起動基盤の実装
   - 説明: frontend、backend、worker、PostgreSQL、Redis をローカルでまとめて起動できる開発用設定と起動スクリプトを整備する。
   - 補足: 完了時点で PostgreSQL の schema / migration / seed 手順と、backend からの PostgreSQL 接続確認まで実装済み。
   - ステータス: 完了（2026-06-20）
   - ストーリーポイント: 5
   - 担当者: Platform
   - 依存タスク: TASK-001
   - 関連PR: 未定

3. **TASK-003**: 外部依存モック・ローカル接続基盤整備
   - 説明: Instagram Graph API、通知チャネル、認証コールバックをローカルで検証できるモックまたはスタブを用意し、DB / Redis 接続とあわせて開発手順をドキュメント化する。
   - ストーリーポイント: 3
   - 担当者: Infra
   - 依存タスク: TASK-001
   - 関連PR: 未定

4. **TASK-004**: 共通認証・操作者識別基盤の実装
   - 説明: 管理画面ログイン、Application API 認証、監査ログ用の操作者ID受け渡しを、まずはローカル開発で動作確認できる形で実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-001, TASK-002
   - 関連PR: 未定

### 要件 1: Instagramアカウント連携管理

関連ドキュメント: [01_requirements/functional-requirements.md](01_requirements/functional-requirements.md), [01_requirements/acceptance-criteria.md](01_requirements/acceptance-criteria.md), [01_requirements/user-stories.md](01_requirements/user-stories.md), [01_requirements/edge-cases.md](01_requirements/edge-cases.md), [02_design/screen-list.md](02_design/screen-list.md)

**分解されたタスク:**


5. **TASK-009**: トークン期限監視・再認可導線実装
   - 説明: 期限前アラート、期限切れ状態遷移、再認可URL生成、要再認可通知を実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-007
   - 関連PR: 未定

6. **TASK-010**: 連携画面UI実装
   - 説明: ログイン / アカウント連携画面で OAuth 開始、対象選択、状態表示、再認可導線を実装し、ローカル画面から一連の確認を可能にする。
   - ストーリーポイント: 5
   - 担当者: Frontend
   - 依存タスク: TASK-005, TASK-006, TASK-008, TASK-009
   - 関連PR: 未定

7. **TASK-011**: アカウント連携受入テスト実装
   - 説明: 連携成功、権限不足、トークン期限切れ、再認可復旧のシナリオをテスト化する。
   - ストーリーポイント: 3
   - 担当者: QA
   - 依存タスク: TASK-010
   - 関連テスト: [06_tests/test-cases.md](06_tests/test-cases.md), [06_tests/e2e-tests.md](06_tests/e2e-tests.md)

### 要件 2: 投稿コンテンツ管理（下書き・資産管理）

関連ドキュメント: [01_requirements/functional-requirements.md](01_requirements/functional-requirements.md), [01_requirements/acceptance-criteria.md](01_requirements/acceptance-criteria.md), [01_requirements/user-stories.md](01_requirements/user-stories.md), [01_requirements/edge-cases.md](01_requirements/edge-cases.md), [02_design/screen-list.md](02_design/screen-list.md)

**分解されたタスク:**

1. **TASK-011**: メディアアップロードAPI実装
   - 説明: 画像・動画を受け付けるアップロードAPIと保存先連携を実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-003
   - 関連PR: 未定

2. **TASK-012**: メディア仕様検証モジュール実装
   - 説明: 形式、サイズ、動画尺、アスペクト比を種別ごとに検証できる共通モジュールを実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-011
   - 関連PR: 未定

3. **TASK-013**: メディア資産再利用モデル実装
   - 説明: media_assets の重複保存抑止、参照関係、再利用可能な保存構造を実装する。
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-011
   - 関連PR: 未定

4. **TASK-014**: 下書き作成・更新API実装
   - 説明: キャプション、ハッシュタグ、ラベル、投稿種別、添付メディアを保存する API を実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-012, TASK-013
   - 関連PR: 未定

5. **TASK-015**: 下書き複製・検索・一覧API実装
   - 説明: ラベル、状態、投稿種別で絞り込み可能な一覧APIと複製APIを実装する。
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-014
   - 関連PR: 未定

6. **TASK-016**: バージョン履歴・変更差分保存実装
   - 説明: 下書き更新時に差分と更新者を保存し、履歴追跡できるようにする。
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-014
   - 関連PR: 未定

7. **TASK-017**: コンテンツ一覧画面UI実装
   - 説明: 下書き、予約済み、要対応を検索・絞り込みできる一覧画面を実装する。
   - ストーリーポイント: 5
   - 担当者: Frontend
   - 依存タスク: TASK-015
   - 関連PR: 未定

8. **TASK-018**: コンテンツ編集画面UI実装
   - 説明: メディア登録、キャプション入力、ラベル編集、検証結果表示を行う編集画面を実装する。
   - ストーリーポイント: 5
   - 担当者: Frontend
   - 依存タスク: TASK-014, TASK-016
   - 関連PR: 未定

9. **TASK-019**: 下書き管理受入テスト実装
   - 説明: 画像、動画、メディア不正、複製、履歴保存のシナリオをテスト化する。
   - ストーリーポイント: 3
   - 担当者: QA
   - 依存タスク: TASK-017, TASK-018
   - 関連テスト: [06_tests/test-cases.md](06_tests/test-cases.md), [06_tests/regression-test.md](06_tests/regression-test.md)

### 要件 3: 投稿種別別の作成支援

関連ドキュメント: [01_requirements/functional-requirements.md](01_requirements/functional-requirements.md), [01_requirements/acceptance-criteria.md](01_requirements/acceptance-criteria.md), [01_requirements/user-stories.md](01_requirements/user-stories.md), [01_requirements/edge-cases.md](01_requirements/edge-cases.md)

**分解されたタスク:**

1. **TASK-020**: 投稿種別定義スキーマ実装
   - 説明: 画像フィード、動画フィード、カルーセル、リールの必須項目と制約をスキーマとして定義する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-012, TASK-014
   - 関連PR: 未定

2. **TASK-021**: 種別別バリデーション実装
   - 説明: 投稿種別ごとの必須項目チェックとエラーメッセージ生成を実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-020
   - 関連PR: 未定

3. **TASK-022**: 標準ペイロード正規化層実装
   - 説明: UI入力をInstagram Graph API投稿形式へ変換する共通正規化レイヤーを実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-020, TASK-021
   - 関連PR: 未定

4. **TASK-023**: カルーセル順序管理実装
   - 説明: 複数メディアの並び順保持、一部メディア不正時の特定表示用データを実装する。
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-021
   - 関連PR: 未定

5. **TASK-024**: リール拡張設定実装
   - 説明: カバー画像などリール固有の設定値を保存・検証する。
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-021
   - 関連PR: 未定

6. **TASK-025**: 新投稿種別追加用の設定駆動拡張ポイント実装
   - 説明: 将来の API 追加種別をコード改修最小で取り込める構成にする。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-022
   - 関連PR: 未定

7. **TASK-026**: 種別切替UI実装
   - 説明: コンテンツ編集画面で種別切替に応じて入力項目と注意事項が変化するUIを実装する。
   - ストーリーポイント: 5
   - 担当者: Frontend
   - 依存タスク: TASK-020, TASK-021, TASK-024
   - 関連PR: 未定

8. **TASK-027**: 投稿種別対応受入テスト実装
   - 説明: 画像フィード、動画フィード、カルーセル、リール、新種別拡張性のシナリオをテスト化する。
   - ストーリーポイント: 3
   - 担当者: QA
   - 依存タスク: TASK-026
   - 関連テスト: [06_tests/test-cases.md](06_tests/test-cases.md), [06_tests/e2e-tests.md](06_tests/e2e-tests.md)

### 要件 4: 予約投稿管理

関連ドキュメント: [01_requirements/functional-requirements.md](01_requirements/functional-requirements.md), [01_requirements/acceptance-criteria.md](01_requirements/acceptance-criteria.md), [01_requirements/user-stories.md](01_requirements/user-stories.md), [01_requirements/edge-cases.md](01_requirements/edge-cases.md), [02_design/screen-list.md](02_design/screen-list.md)

**分解されたタスク:**

1. **TASK-028**: 予約入力バリデーション実装
   - 説明: 過去日時、タイムゾーン、連携状態、承認状態、重複予約の検証を実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-014, TASK-006
   - 関連PR: 未定

2. **TASK-029**: 予約登録・更新・取消API実装
   - 説明: schedules と posting_jobs を生成・更新・取消する API を実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-028
   - 関連PR: 未定

3. **TASK-030**: 予約重複防止制約実装
   - 説明: 同一コンテンツ・同一アカウント・同一時刻の重複予約を防止する制約とエラーハンドリングを実装する。
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-029
   - 関連PR: 未定

4. **TASK-031**: 予約設定モーダルUI実装
   - 説明: 投稿日時、タイムゾーン、公開先アカウントを指定する予約UIを実装する。
   - ストーリーポイント: 3
   - 担当者: Frontend
   - 依存タスク: TASK-029
   - 関連PR: 未定

5. **TASK-032**: 予約確認・編集導線UI実装
   - 説明: 予約済み情報の確認、スケジュール変更、取消を行うUIを実装する。
   - ストーリーポイント: 3
   - 担当者: Frontend
   - 依存タスク: TASK-031
   - 関連PR: 未定

6. **TASK-033**: カレンダー反映API実装
   - 説明: 予約データと投稿実績を統合して日 / 週 / 月で返す API を実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-029
   - 関連PR: 未定

7. **TASK-034**: 予約投稿受入テスト実装
   - 説明: 未来時刻予約、過去日時エラー、重複予約、予約取消のシナリオをテスト化する。
   - ストーリーポイント: 3
   - 担当者: QA
   - 依存タスク: TASK-031, TASK-032, TASK-033
   - 関連テスト: [06_tests/test-cases.md](06_tests/test-cases.md), [06_tests/regression-test.md](06_tests/regression-test.md)

### 要件 5: 投稿実行・再試行・障害回復

関連ドキュメント: [01_requirements/functional-requirements.md](01_requirements/functional-requirements.md), [01_requirements/acceptance-criteria.md](01_requirements/acceptance-criteria.md), [01_requirements/user-stories.md](01_requirements/user-stories.md), [01_requirements/edge-cases.md](01_requirements/edge-cases.md), [03_architecture/architecture.md](03_architecture/architecture.md)

**分解されたタスク:**

1. **TASK-035**: Scheduler実装
   - 説明: まずはローカル単体で動作確認できる形で、時刻到達ジョブの抽出、キュー投入、排他制御を行う Scheduler を実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-029, TASK-003
   - 関連PR: 未定

2. **TASK-036**: 投稿Worker実装
   - 説明: 正規化済みペイロードを使って Instagram Graph API またはローカルモックへ投稿し、結果を保存する Worker を実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-022, TASK-035
   - 関連PR: 未定

3. **TASK-037**: 実行状態遷移モデル実装
   - 説明: 予約済み、実行中、成功、失敗、再試行中、要対応、要再認可の状態遷移を定義・実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-036
   - 関連PR: 未定

4. **TASK-038**: エラー分類ロジック実装
   - 説明: 認証切れ、メディア不正、レート制限、ネットワーク断などを分類し、後続処理を分岐する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-036
   - 関連PR: 未定

5. **TASK-039**: 自動再試行ポリシー実装
   - 説明: 一時障害に対する指数バックオフ、再試行回数上限、アカウント単位キュー制御を実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-038
   - 関連PR: 未定

6. **TASK-040**: 不明状態再照会・冪等処理実装
   - 説明: 通信断などで成功可否が不明な場合に、外部投稿IDを使った再照会と重複防止を実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-036, TASK-038
   - 関連PR: 未定

7. **TASK-041**: 手動再実行API実装
   - 説明: 要対応、要再認可復旧後の再実行操作を受け付ける API を実装する。
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-037, TASK-038
   - 関連PR: 未定

8. **TASK-042**: 投稿実行ログ画面UI実装
   - 説明: 実行結果、再試行履歴、エラー詳細、手動再実行導線を提供し、ローカル実行結果を確認できる UI を実装する。
   - ストーリーポイント: 5
   - 担当者: Frontend
   - 依存タスク: TASK-037, TASK-041
   - 関連PR: 未定

9. **TASK-043**: 障害回復受入テスト実装
   - 説明: 一時障害の自動再試行、恒久エラーの要対応化、再認可後の再実行をテスト化する。
   - ストーリーポイント: 5
   - 担当者: QA
   - 依存タスク: TASK-039, TASK-040, TASK-042
   - 関連テスト: [06_tests/e2e-tests.md](06_tests/e2e-tests.md), [06_tests/bug-report.md](06_tests/bug-report.md)

### 要件 6: 投稿カレンダーと運用可視化

関連ドキュメント: [01_requirements/functional-requirements.md](01_requirements/functional-requirements.md), [01_requirements/acceptance-criteria.md](01_requirements/acceptance-criteria.md), [01_requirements/user-stories.md](01_requirements/user-stories.md), [02_design/screen-list.md](02_design/screen-list.md)

**分解されたタスク:**

1. **TASK-044**: KPI集計ロジック実装
   - 説明: 投稿実行率、週次投稿本数、失敗件数、未実行件数を算出する集計処理を実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-037, TASK-033
   - 関連PR: 未定

2. **TASK-045**: ダッシュボードAPI実装
   - 説明: 期間指定で KPI、失敗一覧、未実行一覧、要再認可アカウントを返す API を実装する。
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-044
   - 関連PR: 未定

3. **TASK-046**: ダッシュボード画面UI実装
   - 説明: 投稿実行率、週次投稿本数、失敗件数を確認できるダッシュボード画面を実装する。
   - ストーリーポイント: 5
   - 担当者: Frontend
   - 依存タスク: TASK-045
   - 関連PR: 未定

4. **TASK-047**: 投稿カレンダー画面UI実装
   - 説明: 日 / 週 / 月単位のカレンダーで予約と実績を可視化する画面を実装する。
   - ストーリーポイント: 5
   - 担当者: Frontend
   - 依存タスク: TASK-033
   - 関連PR: 未定

5. **TASK-048**: KPI未達アラート実装
   - 説明: 投稿頻度や実行率が基準を下回る見込みのときにアラート対象を算出する。
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-044
   - 関連PR: 未定

6. **TASK-049**: 運用可視化受入テスト実装
   - 説明: KPI表示、カレンダー表示、失敗投稿識別、未達アラート表示をテスト化する。
   - ストーリーポイント: 3
   - 担当者: QA
   - 依存タスク: TASK-046, TASK-047, TASK-048
   - 関連テスト: [06_tests/test-plan.md](06_tests/test-plan.md), [06_tests/regression-test.md](06_tests/regression-test.md)

### 要件 7: 承認フロー（任意）

関連ドキュメント: [01_requirements/functional-requirements.md](01_requirements/functional-requirements.md), [01_requirements/edge-cases.md](01_requirements/edge-cases.md), [02_design/screen-list.md](02_design/screen-list.md)

**分解されたタスク:**

1. **TASK-050**: 承認ステータスモデル実装
   - 説明: 未申請、申請中、承認済み、差し戻しの状態管理と履歴保存を実装する。
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-014
   - 関連PR: 未定

2. **TASK-051**: 承認申請・承認・差し戻しAPI実装
   - 説明: コメント付き承認フロー API を実装し、操作履歴を残す。
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-050
   - 関連PR: 未定

3. **TASK-052**: 承認前予約防止バリデーション実装
   - 説明: 承認フロー有効時は未承認コンテンツの予約をサーバー側で拒否する。
   - ストーリーポイント: 2
   - 担当者: Backend
   - 依存タスク: TASK-028, TASK-051
   - 関連PR: 未定

4. **TASK-053**: 承認フローUI実装
   - 説明: 申請、承認、差し戻し、理由表示をコンテンツ編集画面と一覧画面へ追加する。
   - ストーリーポイント: 5
   - 担当者: Frontend
   - 依存タスク: TASK-051
   - 関連PR: 未定

5. **TASK-054**: 承認フロー受入テスト実装
   - 説明: 申請、差し戻し、承認後予約可能化、未承認予約拒否のシナリオをテスト化する。
   - ストーリーポイント: 3
   - 担当者: QA
   - 依存タスク: TASK-052, TASK-053
   - 関連テスト: [06_tests/test-cases.md](06_tests/test-cases.md)

### 要件 8: 監査ログ・運用通知

関連ドキュメント: [01_requirements/functional-requirements.md](01_requirements/functional-requirements.md), [01_requirements/edge-cases.md](01_requirements/edge-cases.md), [02_design/screen-list.md](02_design/screen-list.md), [03_architecture/architecture.md](03_architecture/architecture.md)

**分解されたタスク:**

1. **TASK-055**: 監査ログイベント定義実装
   - 説明: 作成、編集、削除、予約、実行、再試行、通知送信などの主要イベント定義を実装する。
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-002, TASK-014, TASK-029, TASK-037
   - 関連PR: 未定

2. **TASK-056**: 監査ログ保存・検索API実装
   - 説明: 時系列検索、操作者検索、対象投稿検索ができる監査ログ API を実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-055
   - 関連PR: 未定

3. **TASK-057**: 通知チャネル設定実装
   - 説明: メール、チャットの通知先設定、イベント種別ごとの有効化設定を実装する。
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-003
   - 関連PR: 未定

4. **TASK-058**: 失敗通知・再認可通知実装
   - 説明: 投稿失敗、要再認可、恒久エラー発生時の通知配信処理を実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-038, TASK-057
   - 関連PR: 未定

5. **TASK-059**: 通知失敗時の再送・代替記録実装
   - 説明: 通知チャネル障害時に監査ログへ記録し、再送キューまたは代替チャネル処理を実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-058
   - 関連PR: 未定

6. **TASK-060**: 日次サマリ通知実装
   - 説明: その日の投稿実績、失敗件数、未達見込みをまとめた日次通知を実装する。
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-044, TASK-057
   - 関連PR: 未定

7. **TASK-061**: 通知 / 監査ログ設定画面UI実装
   - 説明: 通知先設定、通知種別切替、監査ログ検索条件入力を行う UI を実装する。
   - ストーリーポイント: 5
   - 担当者: Frontend
   - 依存タスク: TASK-056, TASK-057
   - 関連PR: 未定

8. **TASK-062**: 監査ログ・通知受入テスト実装
   - 説明: 監査ログ記録、失敗通知、通知失敗時補完、日次サマリ通知のシナリオをテスト化する。
   - ストーリーポイント: 3
   - 担当者: QA
   - 依存タスク: TASK-059, TASK-060, TASK-061
   - 関連テスト: [06_tests/quality-checklist.md](06_tests/quality-checklist.md), [06_tests/regression-test.md](06_tests/regression-test.md)

## 横断品質・リリース準備

関連ドキュメント: [06_tests/test-plan.md](06_tests/test-plan.md), [07_release/release-checklist.md](07_release/release-checklist.md), [07_release/rollback-plan.md](07_release/rollback-plan.md), [08_operation/runbook.md](08_operation/runbook.md)

**分解されたタスク:**

1. **TASK-063**: API・Worker単体テスト整備
   - 説明: バリデーション、状態遷移、再試行、通知補完を中心に単体テストを拡充する。
   - ストーリーポイント: 5
   - 担当者: QA
   - 依存タスク: TASK-043, TASK-049, TASK-062
   - 関連PR: 未定

2. **TASK-064**: E2E回帰シナリオ整備
   - 説明: 連携、下書き作成、予約、投稿成功、失敗復旧、再認可、通知までの主要導線を E2E 化する。
   - ストーリーポイント: 5
   - 担当者: QA
   - 依存タスク: TASK-063
   - 関連テスト: [06_tests/e2e-tests.md](06_tests/e2e-tests.md), [06_tests/regression-test.md](06_tests/regression-test.md)

3. **TASK-065**: ローカル性能・負荷検証
   - 説明: 同時予約、一覧表示、ジョブ滞留、通知集中時の性能をローカル環境で測定し、ボトルネックを洗い出す。
   - ストーリーポイント: 5
   - 担当者: Infra
   - 依存タスク: TASK-064
   - 関連PR: 未定

4. **TASK-066**: ローカル運用ログ・監視ポイント整理
   - 説明: Worker停止、再試行急増、通知失敗、再認可急増を検知するために必要なログ、メトリクス、監視ポイントを整理する。
   - ストーリーポイント: 3
   - 担当者: Infra
   - 依存タスク: TASK-065
   - 関連PR: 未定

5. **TASK-067**: ローカルMVP完成後のクラウド移行準備
   - 説明: 障害復旧手順、再認可オペレーション、ロールバック手順を整理し、ローカルMVPをクラウド環境へ移す際の前提条件を明確化する。
   - ストーリーポイント: 3
   - 担当者: Platform
   - 依存タスク: TASK-066
   - 関連PR: 未定

## 優先実装順

1. TASK-001 から TASK-004 でローカル起動できる土台と外部依存のモックを先に揃える。
2. TASK-005 から TASK-027 でローカルから触れる連携、下書き、投稿種別のソースコードを優先実装する。
3. TASK-028 から TASK-043 で予約と実行制御をローカル完結で成立させる。
4. TASK-044 から TASK-062 で可視化、承認、通知、監査を追加する。
5. TASK-063 から TASK-067 でローカルMVPの品質保証を終え、その後のクラウド移行準備へ進む。
