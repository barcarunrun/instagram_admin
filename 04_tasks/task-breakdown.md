# タスク分解

## タスク分解の方針

- 現時点ではクラウド基盤は前提にせず、まずはローカルで起動・確認できるソースコードを完成させる。
- 初期タスクは「ローカル起動できる API / UI / Worker / DB 接続」を優先し、クラウド移行用の整備は後段へ寄せる。
- 要件ごとに、API、Worker、UI、運用、テストまで分けてタスク化する。
- 実装順は [04_tasks/implementation-order.md](04_tasks/implementation-order.md) に合わせる。
- 担当者は個人名ではなく担当ロールで記載し、アサイン時に具体名へ置換する。
- TASK-ID の完了条件には、対象ブランチの push または PR 更新によって GitHub Actions CI を実行し、成功を確認することを含める。

## 2026-06-20 時点の状況サマリー

- このセクションを最新の監査結果とし、各 TASK 本文の旧形式ステータスより優先して参照する。
- 判定軸は `コード状況` `テスト状況` `CI確認` の 3 つに分ける。
- `コード状況` は `実装済み` `一部実装` `未着手` で記録する。
- `テスト状況` は `実装済み` `一部実装` `未着手` `対象外` で記録する。
- `CI確認` は `確認済み` `未確認` で記録する。

| TASK-ID                | コード状況 | テスト状況 | CI確認   | 補足                                                                                                                                                                                                                                                        |
| ---------------------- | ---------- | ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TASK-001 から TASK-002 | 実装済み   | 対象外     | 確認済み | ローカル起動基盤と共通開発基盤は完了扱い。                                                                                                                                                                                                                  |
| TASK-003 から TASK-006 | 実装済み   | 一部実装   | 未確認   | モック、認証、OAuth 導線は実装済み。連携導線の確認は TASK-007 の E2E が一部代替。                                                                                                                                                                           |
| TASK-007               | 実装済み   | 実装済み   | 未確認   | [05_source_code/frontend/e2e/connect-workflow.spec.ts](05_source_code/frontend/e2e/connect-workflow.spec.ts) で連携成功、期限切れ、再認可復旧を確認可能。                                                                                                   |
| TASK-008 から TASK-010 | 実装済み   | 一部実装   | 確認済み | `/media-assets` upload API、種別別メディア検証、storage_key ハッシュによる重複保存抑止を追加済み。ローカルで upload、重複保存抑止、file endpoint 配信を確認済み。GitHub Actions で関連 job 成功を確認済み。                                                |
| TASK-011 から TASK-015 | 実装済み   | 一部実装   | 確認済み | 下書き CRUD、複製、履歴、一覧 UI、編集 UI は実装済み。upload API 接続を追加し、TASK-016 の Playwright をローカル実行して主要導線を確認済み。GitHub Actions で関連 job 成功を確認済み。                                                                     |
| TASK-016               | 実装済み   | 実装済み   | 確認済み | [05_source_code/frontend/e2e/content-workflow.spec.ts](05_source_code/frontend/e2e/content-workflow.spec.ts) に画像、動画、メディア不正、複製、履歴保存シナリオを追加。ローカル実行と GitHub Actions の両方で成功を確認済み。                               |
| TASK-017 から TASK-018 | 実装済み   | 未着手     | 未確認   | 投稿種別ルールとバリデーションは実装済み。                                                                                                                                                                                                                  |
| TASK-019 から TASK-024 | 未着手     | 未着手     | 未確認   | 正規化層、カルーセル順序、リール拡張、種別切替 UI、受入テストは未確認。                                                                                                                                                                                     |
| TASK-025               | 実装済み   | 未着手     | 未確認   | `/schedules/validate` に未来日時、連携状態、重複予約、承認待ち検証あり。                                                                                                                                                                                    |
| TASK-026               | 一部実装   | 未着手     | 未確認   | 予約作成は実装済み。更新・取消 API は未実装。                                                                                                                                                                                                               |
| TASK-027 から TASK-028 | 実装済み   | 未着手     | 未確認   | 重複防止制約と予約 UI 導線は実装済み。                                                                                                                                                                                                                      |
| TASK-029               | 未着手     | 未着手     | 未確認   | 予約確認、変更、取消の UI 導線は未確認。                                                                                                                                                                                                                    |
| TASK-030               | 実装済み   | 未着手     | 未確認   | `/calendar/events` API は実装済み。                                                                                                                                                                                                                         |
| TASK-031               | 未着手     | 未着手     | 未確認   | 予約投稿の受入テストは未追加。                                                                                                                                                                                                                              |
| TASK-032 から TASK-037 | 未着手     | 未着手     | 未確認   | Scheduler、Worker、状態遷移、自動再試行系の実装根拠は未確認。                                                                                                                                                                                               |
| TASK-038 から TASK-039 | 実装済み   | 未着手     | 未確認   | 再実行 API とログ UI は実装済み。ログ UI は [05_source_code/frontend/app/logs/page.tsx](05_source_code/frontend/app/logs/page.tsx) と [05_source_code/frontend/components/job-log-panel.tsx](05_source_code/frontend/components/job-log-panel.tsx) で確認。 |
| TASK-040               | 未着手     | 未着手     | 未確認   | 障害回復シナリオの受入テストは未追加。                                                                                                                                                                                                                      |
| TASK-041               | 実装済み   | 未着手     | 未確認   | KPI 集計は実装済みだが、集計対象は未実行件数でなく要対応件数寄り。                                                                                                                                                                                          |
| TASK-042               | 一部実装   | 未着手     | 未確認   | KPI API と alert API はあるが、期間指定、未実行一覧、要再認可一覧は未実装。                                                                                                                                                                                 |
| TASK-043               | 一部実装   | 未着手     | 未確認   | ダッシュボード UI は接続済みだが、グラフの一部は固定データ。                                                                                                                                                                                                |
| TASK-044               | 未着手     | 未着手     | 未確認   | 投稿カレンダー画面 UI の実装根拠は未確認。                                                                                                                                                                                                                  |
| TASK-045 から TASK-051 | 未着手     | 未着手     | 未確認   | KPI 未達アラート、承認フロー、関連受入テストは未確認。                                                                                                                                                                                                      |
| TASK-052               | 一部実装   | 未着手     | 未確認   | 認証、コンテンツ更新、予約、再実行の監査イベントはあるが、実行完了や通知送信まで網羅していない。                                                                                                                                                            |
| TASK-053               | 一部実装   | 未着手     | 未確認   | `/audit-logs` 一覧取得はあるが、検索条件指定は未実装。                                                                                                                                                                                                      |
| TASK-054 から TASK-059 | 未着手     | 未着手     | 未確認   | 通知チャネル設定、通知送信、通知 UI、受入テストの実装根拠は未確認。                                                                                                                                                                                         |
| TASK-060               | 一部実装   | 一部実装   | 未確認   | backend に [05_source_code/backend/src/lib/instagram-oauth.test.ts](05_source_code/backend/src/lib/instagram-oauth.test.ts) はあるが、API・Worker 単体テスト拡充は未完。                                                                                    |
| TASK-061               | 一部実装   | 一部実装   | 未確認   | E2E は連携導線のみ実装済みで、下書き、予約、失敗復旧、通知までは未網羅。                                                                                                                                                                                    |
| TASK-062 から TASK-064 | 未着手     | 未着手     | 未確認   | 性能検証、監視整理、クラウド移行準備の実施根拠は未確認。                                                                                                                                                                                                    |

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
   - 補足: `/api/local/*` の OAuth / Instagram / 通知モック、Redis 接続確認 API、README のローカル手順を実装済み。
   - ステータス: 実装済み（2026-06-20、CI未確認）
   - ストーリーポイント: 3
   - 担当者: Infra
   - 依存タスク: TASK-001
   - 関連PR: 未定

4. **TASK-004**: 共通認証・操作者識別基盤の実装
   - 説明: 管理画面ログイン、Application API 認証、監査ログ用の操作者ID受け渡しを、まずはローカル開発で動作確認できる形で実装する。
   - 補足: `/auth/login` `/auth/me` `/auth/logout` と frontend のログイン画面、JWT cookie / Bearer 認証、監査ログ記録を実装済み。
   - ステータス: 実装済み（2026-06-20、CI未確認）
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-001, TASK-002
   - 関連PR: 未定

### 要件 1: Instagramアカウント連携管理

関連ドキュメント: [01_requirements/functional-requirements.md](01_requirements/functional-requirements.md), [01_requirements/acceptance-criteria.md](01_requirements/acceptance-criteria.md), [01_requirements/user-stories.md](01_requirements/user-stories.md), [01_requirements/edge-cases.md](01_requirements/edge-cases.md), [02_design/screen-list.md](02_design/screen-list.md)

**分解されたタスク:**

5. **TASK-005**: トークン期限監視・再認可導線実装
   - 説明: 期限前アラート、期限切れ状態遷移、再認可URL生成、要再認可通知を実装する。
   - 補足: 正式OAuth開始 / callback / 接続確定 API、トークン暗号化保存、期限切れ自動判定、ダッシュボード要再認可アラート、mock通知イベントを実装済み。常駐監視ジョブと投稿実行時の適用は後続タスクで継続する。
   - ステータス: 実装済み（2026-06-20、CI未確認）
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-004
   - 関連PR: 未定

6. **TASK-006**: 連携画面UI実装
   - 説明: ログイン / アカウント連携画面で OAuth 開始、対象選択、状態表示、再認可導線を実装し、ローカル画面から一連の確認を可能にする。
   - 補足: 連携状態表示画面と認可開始 / 再認可 / 接続ボタンを正式APIへ接続済み。OAuth callback 後の候補表示、接続確定、再認可後の画面復帰をローカル画面から確認可能。
   - ステータス: 実装済み（2026-06-20、CI未確認）
   - ストーリーポイント: 5
   - 担当者: Frontend
   - 依存タスク: TASK-005
   - 関連PR: 未定

7. **TASK-007**: アカウント連携受入テスト実装
   - 説明: 連携成功、権限不足、トークン期限切れ、再認可復旧のシナリオをテスト化する。
   - 補足: Playwright による実行可能テストを 05_source_code/frontend/e2e/connect-workflow.spec.ts へ追加済み。期限切れシナリオは connect 画面、ダッシュボード alert、予約バリデーションまで自動化済み。
   - ステータス: 実装済み（2026-06-20、CI未確認）
   - ストーリーポイント: 3
   - 担当者: QA
   - 依存タスク: TASK-006
   - 関連テスト: [06_tests/test-cases.md](06_tests/test-cases.md), [06_tests/e2e-tests.md](06_tests/e2e-tests.md)

### 要件 2: 投稿コンテンツ管理（下書き・資産管理）

関連ドキュメント: [01_requirements/functional-requirements.md](01_requirements/functional-requirements.md), [01_requirements/acceptance-criteria.md](01_requirements/acceptance-criteria.md), [01_requirements/user-stories.md](01_requirements/user-stories.md), [01_requirements/edge-cases.md](01_requirements/edge-cases.md), [02_design/screen-list.md](02_design/screen-list.md)

**分解されたタスク:**

1. **TASK-008**: メディアアップロードAPI実装
   - 説明: 画像・動画を受け付けるアップロードAPIと保存先連携を実装する。
   - 補足: `POST /media-assets`、ローカル保存、メタデータ抽出、`GET /media-assets/:id/file` を実装済み。
   - ステータス: 実装済み（2026-06-20、CI未確認）
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-003
   - 関連PR: 未定

2. **TASK-009**: メディア仕様検証モジュール実装
   - 説明: 形式、サイズ、動画尺、アスペクト比を種別ごとに検証できる共通モジュールを実装する。
   - 補足: `validateContentDraft` を拡張し、画像/動画のサイズ、尺、解像度、アスペクト比、不正メディア個別表示を実装済み。
   - ステータス: 実装済み（2026-06-20、CI未確認）
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-008
   - 関連PR: 未定

3. **TASK-010**: メディア資産再利用モデル実装
   - 説明: media_assets の重複保存抑止、参照関係、再利用可能な保存構造を実装する。
   - 補足: アップロード時に `storage_key` をファイルハッシュベースで生成し、既存 asset を再利用する構造を実装済み。
   - ステータス: 実装済み（2026-06-20、CI未確認）
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-008
   - 関連PR: 未定

4. **TASK-011**: 下書き作成・更新API実装
   - 説明: キャプション、ハッシュタグ、ラベル、投稿種別、添付メディアを保存する API を実装する。
   - 補足: `/contents` の作成・更新 API と PostgreSQL 永続化、バリデーション保存を実装済み。
   - ステータス: 実装済み（2026-06-20、CI未確認）
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-009, TASK-010
   - 関連PR: 未定

5. **TASK-012**: 下書き複製・検索・一覧API実装
   - 説明: ラベル、状態、投稿種別で絞り込み可能な一覧APIと複製APIを実装する。
   - 補足: `/contents` 一覧 API のキーワード / 状態 / 種別フィルタと `/contents/:id/duplicate` を実装済み。
   - ステータス: 実装済み（2026-06-20、CI未確認）
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-011
   - 関連PR: 未定

6. **TASK-013**: バージョン履歴・変更差分保存実装
   - 説明: 下書き更新時に差分と更新者を保存し、履歴追跡できるようにする。
   - 補足: `content_versions` への初回作成・更新時の履歴保存を実装済み。
   - ステータス: 実装済み（2026-06-20、CI未確認）
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-011
   - 関連PR: 未定

7. **TASK-014**: コンテンツ一覧画面UI実装
   - 説明: 下書き、予約済み、要対応を検索・絞り込みできる一覧画面を実装する。
   - 補足: コンテンツ一覧、フィルタ、編集導線、複製導線を実装済み。
   - ステータス: 実装済み（2026-06-20、CI未確認）
   - ストーリーポイント: 5
   - 担当者: Frontend
   - 依存タスク: TASK-012
   - 関連PR: 未定

8. **TASK-015**: コンテンツ編集画面UI実装
   - 説明: メディア登録、キャプション入力、ラベル編集、検証結果表示を行う編集画面を実装する。
   - 補足: 編集フォーム、メディア選択、キャプション / ラベル入力、検証結果表示を実装済み。
   - ステータス: 実装済み（2026-06-20、CI未確認）
   - ストーリーポイント: 5
   - 担当者: Frontend
   - 依存タスク: TASK-011, TASK-013
   - 関連PR: 未定

9. **TASK-016**: 下書き管理受入テスト実装
   - 説明: 画像、動画、メディア不正、複製、履歴保存のシナリオをテスト化する。
   - 補足: Playwright で `content-workflow.spec.ts` を追加し、画像保存、動画保存、メディア不正、複製、履歴保存シナリオを実装済み。
   - ステータス: 実装済み（2026-06-20、CI未確認）
   - ストーリーポイント: 3
   - 担当者: QA
   - 依存タスク: TASK-014, TASK-015
   - 関連テスト: [06_tests/test-cases.md](06_tests/test-cases.md), [06_tests/regression-test.md](06_tests/regression-test.md)

### 要件 3: 投稿種別別の作成支援

関連ドキュメント: [01_requirements/functional-requirements.md](01_requirements/functional-requirements.md), [01_requirements/acceptance-criteria.md](01_requirements/acceptance-criteria.md), [01_requirements/user-stories.md](01_requirements/user-stories.md), [01_requirements/edge-cases.md](01_requirements/edge-cases.md)

**分解されたタスク:**

1. **TASK-017**: 投稿種別定義スキーマ実装
   - 説明: 画像フィード、動画フィード、カルーセル、リールの必須項目と制約をスキーマとして定義する。
   - 補足: 投稿種別ごとの件数制約、動画許可、尺必須条件を `content-rules.ts` に実装済み。
   - ステータス: 実装済み（2026-06-20、CI未確認）
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-009, TASK-011
   - 関連PR: 未定

2. **TASK-018**: 種別別バリデーション実装
   - 説明: 投稿種別ごとの必須項目チェックとエラーメッセージ生成を実装する。
   - 補足: タイトル、キャプション、ハッシュタグ、メディア件数 / 形式 / 尺の検証とメッセージ生成を実装済み。
   - ステータス: 実装済み（2026-06-20、CI未確認）
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-017
   - 関連PR: 未定

3. **TASK-019**: 標準ペイロード正規化層実装
   - 説明: UI入力をInstagram Graph API投稿形式へ変換する共通正規化レイヤーを実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-017, TASK-018
   - 関連PR: 未定

4. **TASK-020**: カルーセル順序管理実装
   - 説明: 複数メディアの並び順保持、一部メディア不正時の特定表示用データを実装する。
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-018
   - 関連PR: 未定

5. **TASK-021**: リール拡張設定実装
   - 説明: カバー画像などリール固有の設定値を保存・検証する。
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-018
   - 関連PR: 未定

6. **TASK-022**: 新投稿種別追加用の設定駆動拡張ポイント実装
   - 説明: 将来の API 追加種別をコード改修最小で取り込める構成にする。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-019
   - 関連PR: 未定

7. **TASK-023**: 種別切替UI実装
   - 説明: コンテンツ編集画面で種別切替に応じて入力項目と注意事項が変化するUIを実装する。
   - ストーリーポイント: 5
   - 担当者: Frontend
   - 依存タスク: TASK-017, TASK-018, TASK-021
   - 関連PR: 未定

8. **TASK-024**: 投稿種別対応受入テスト実装
   - 説明: 画像フィード、動画フィード、カルーセル、リール、新種別拡張性のシナリオをテスト化する。
   - ストーリーポイント: 3
   - 担当者: QA
   - 依存タスク: TASK-023
   - 関連テスト: [06_tests/test-cases.md](06_tests/test-cases.md), [06_tests/e2e-tests.md](06_tests/e2e-tests.md)

### 要件 4: 予約投稿管理

関連ドキュメント: [01_requirements/functional-requirements.md](01_requirements/functional-requirements.md), [01_requirements/acceptance-criteria.md](01_requirements/acceptance-criteria.md), [01_requirements/user-stories.md](01_requirements/user-stories.md), [01_requirements/edge-cases.md](01_requirements/edge-cases.md), [02_design/screen-list.md](02_design/screen-list.md)

**分解されたタスク:**

1. **TASK-025**: 予約入力バリデーション実装
   - 説明: 過去日時、タイムゾーン、連携状態、承認状態、重複予約の検証を実装する。
   - 補足: 未来日時、連携状態、重複予約、承認待ちの検証を `/schedules/validate` に実装済み。
   - ステータス: 実装済み（2026-06-20、CI未確認）
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-011, TASK-006
   - 関連PR: 未定

2. **TASK-026**: 予約登録・更新・取消API実装
   - 説明: schedules と posting_jobs を生成・更新・取消する API を実装する。
   - 補足: 予約作成時の `schedules` / `posting_jobs` 生成は実装済み。更新・取消 API は未実装。
   - ステータス: 進行中（2026-06-20）
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-025
   - 関連PR: 未定

3. **TASK-027**: 予約重複防止制約実装
   - 説明: 同一コンテンツ・同一アカウント・同一時刻の重複予約を防止する制約とエラーハンドリングを実装する。
   - 補足: 同一コンテンツ・同一公開先・同一時刻の重複検知とエラーメッセージ返却を実装済み。
   - ステータス: 実装済み（2026-06-20、CI未確認）
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-026
   - 関連PR: 未定

4. **TASK-028**: 予約設定モーダルUI実装
   - 説明: 投稿日時、タイムゾーン、公開先アカウントを指定する予約UIを実装する。
   - 補足: コンテンツ編集画面内に日時入力と予約実行導線を実装済み。
   - ステータス: 実装済み（2026-06-20、CI未確認）
   - ストーリーポイント: 3
   - 担当者: Frontend
   - 依存タスク: TASK-026
   - 関連PR: 未定

5. **TASK-029**: 予約確認・編集導線UI実装
   - 説明: 予約済み情報の確認、スケジュール変更、取消を行うUIを実装する。
   - ストーリーポイント: 3
   - 担当者: Frontend
   - 依存タスク: TASK-028
   - 関連PR: 未定

6. **TASK-030**: カレンダー反映API実装
   - 説明: 予約データと投稿実績を統合して日 / 週 / 月で返す API を実装する。
   - 補足: `/calendar/events` で予約と実行状態を返す API を実装済み。
   - ステータス: 実装済み（2026-06-20、CI未確認）
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-026
   - 関連PR: 未定

7. **TASK-031**: 予約投稿受入テスト実装
   - 説明: 未来時刻予約、過去日時エラー、重複予約、予約取消のシナリオをテスト化する。
   - ストーリーポイント: 3
   - 担当者: QA
   - 依存タスク: TASK-028, TASK-029, TASK-030
   - 関連テスト: [06_tests/test-cases.md](06_tests/test-cases.md), [06_tests/regression-test.md](06_tests/regression-test.md)

### 要件 5: 投稿実行・再試行・障害回復

関連ドキュメント: [01_requirements/functional-requirements.md](01_requirements/functional-requirements.md), [01_requirements/acceptance-criteria.md](01_requirements/acceptance-criteria.md), [01_requirements/user-stories.md](01_requirements/user-stories.md), [01_requirements/edge-cases.md](01_requirements/edge-cases.md), [03_architecture/architecture.md](03_architecture/architecture.md)

**分解されたタスク:**

1. **TASK-032**: Scheduler実装
   - 説明: まずはローカル単体で動作確認できる形で、時刻到達ジョブの抽出、キュー投入、排他制御を行う Scheduler を実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-026, TASK-003
   - 関連PR: 未定

2. **TASK-033**: 投稿Worker実装
   - 説明: 正規化済みペイロードを使って Instagram Graph API またはローカルモックへ投稿し、結果を保存する Worker を実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-019, TASK-032
   - 関連PR: 未定

3. **TASK-034**: 実行状態遷移モデル実装
   - 説明: 予約済み、実行中、成功、失敗、再試行中、要対応、要再認可の状態遷移を定義・実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-033
   - 関連PR: 未定

4. **TASK-035**: エラー分類ロジック実装
   - 説明: 認証切れ、メディア不正、レート制限、ネットワーク断などを分類し、後続処理を分岐する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-033
   - 関連PR: 未定

5. **TASK-036**: 自動再試行ポリシー実装
   - 説明: 一時障害に対する指数バックオフ、再試行回数上限、アカウント単位キュー制御を実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-035
   - 関連PR: 未定

6. **TASK-037**: 不明状態再照会・冪等処理実装
   - 説明: 通信断などで成功可否が不明な場合に、外部投稿IDを使った再照会と重複防止を実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-033, TASK-035
   - 関連PR: 未定

7. **TASK-038**: 手動再実行API実装
   - 説明: 要対応、要再認可復旧後の再実行操作を受け付ける API を実装する。
   - 補足: `/jobs/:jobId/retry` で再実行受付と監査ログ記録を実装済み。
   - ステータス: 実装済み（2026-06-20、CI未確認）
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-034, TASK-035
   - 関連PR: 未定

8. **TASK-039**: 投稿実行ログ画面UI実装
   - 説明: 実行結果、再試行履歴、エラー詳細、手動再実行導線を提供し、ローカル実行結果を確認できる UI を実装する。
   - 補足: ログ一覧、エラー詳細表示、再実行ボタンを実装済み。
   - ステータス: 実装済み（2026-06-20、CI未確認）
   - ストーリーポイント: 5
   - 担当者: Frontend
   - 依存タスク: TASK-034, TASK-038
   - 関連PR: 未定

9. **TASK-040**: 障害回復受入テスト実装
   - 説明: 一時障害の自動再試行、恒久エラーの要対応化、再認可後の再実行をテスト化する。
   - ストーリーポイント: 5
   - 担当者: QA
   - 依存タスク: TASK-036, TASK-037, TASK-039
   - 関連テスト: [06_tests/e2e-tests.md](06_tests/e2e-tests.md), [06_tests/bug-report.md](06_tests/bug-report.md)

### 要件 6: 投稿カレンダーと運用可視化

関連ドキュメント: [01_requirements/functional-requirements.md](01_requirements/functional-requirements.md), [01_requirements/acceptance-criteria.md](01_requirements/acceptance-criteria.md), [01_requirements/user-stories.md](01_requirements/user-stories.md), [02_design/screen-list.md](02_design/screen-list.md)

**分解されたタスク:**

1. **TASK-041**: KPI集計ロジック実装
   - 説明: 投稿実行率、週次投稿本数、失敗件数、未実行件数を算出する集計処理を実装する。
   - 補足: 投稿実行率、週次投稿本数、失敗件数、要対応件数の集計を実装済み。
   - ステータス: 実装済み（2026-06-20、CI未確認）
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-034, TASK-030
   - 関連PR: 未定

2. **TASK-042**: ダッシュボードAPI実装
   - 説明: 期間指定で KPI、失敗一覧、未実行一覧、要再認可アカウントを返す API を実装する。
   - 補足: KPI API と alert API は実装済み。ただし期間指定、未実行一覧、要再認可アカウント返却は未実装。
   - ステータス: 進行中（2026-06-20）
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-041
   - 関連PR: 未定

3. **TASK-043**: ダッシュボード画面UI実装
   - 説明: 投稿実行率、週次投稿本数、失敗件数を確認できるダッシュボード画面を実装する。
   - 補足: KPIカード、失敗ジョブ一覧、アラート表示、共通レイアウトを実装済み。グラフの一部は固定データ表示。
   - ステータス: 進行中（2026-06-20）
   - ストーリーポイント: 5
   - 担当者: Frontend
   - 依存タスク: TASK-042
   - 関連PR: 未定

4. **TASK-044**: 投稿カレンダー画面UI実装
   - 説明: 日 / 週 / 月単位のカレンダーで予約と実績を可視化する画面を実装する。
   - ストーリーポイント: 5
   - 担当者: Frontend
   - 依存タスク: TASK-030
   - 関連PR: 未定

5. **TASK-045**: KPI未達アラート実装
   - 説明: 投稿頻度や実行率が基準を下回る見込みのときにアラート対象を算出する。
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-041
   - 関連PR: 未定

6. **TASK-046**: 運用可視化受入テスト実装
   - 説明: KPI表示、カレンダー表示、失敗投稿識別、未達アラート表示をテスト化する。
   - ストーリーポイント: 3
   - 担当者: QA
   - 依存タスク: TASK-043, TASK-044, TASK-045
   - 関連テスト: [06_tests/test-plan.md](06_tests/test-plan.md), [06_tests/regression-test.md](06_tests/regression-test.md)

### 要件 7: 承認フロー（任意）

関連ドキュメント: [01_requirements/functional-requirements.md](01_requirements/functional-requirements.md), [01_requirements/edge-cases.md](01_requirements/edge-cases.md), [02_design/screen-list.md](02_design/screen-list.md)

**分解されたタスク:**

1. **TASK-047**: 承認ステータスモデル実装
   - 説明: 未申請、申請中、承認済み、差し戻しの状態管理と履歴保存を実装する。
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-011
   - 関連PR: 未定

2. **TASK-048**: 承認申請・承認・差し戻しAPI実装
   - 説明: コメント付き承認フロー API を実装し、操作履歴を残す。
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-047
   - 関連PR: 未定

3. **TASK-049**: 承認前予約防止バリデーション実装
   - 説明: 承認フロー有効時は未承認コンテンツの予約をサーバー側で拒否する。
   - ストーリーポイント: 2
   - 担当者: Backend
   - 依存タスク: TASK-025, TASK-048
   - 関連PR: 未定

4. **TASK-050**: 承認フローUI実装
   - 説明: 申請、承認、差し戻し、理由表示をコンテンツ編集画面と一覧画面へ追加する。
   - ストーリーポイント: 5
   - 担当者: Frontend
   - 依存タスク: TASK-048
   - 関連PR: 未定

5. **TASK-051**: 承認フロー受入テスト実装
   - 説明: 申請、差し戻し、承認後予約可能化、未承認予約拒否のシナリオをテスト化する。
   - ストーリーポイント: 3
   - 担当者: QA
   - 依存タスク: TASK-049, TASK-050
   - 関連テスト: [06_tests/test-cases.md](06_tests/test-cases.md)

### 要件 8: 監査ログ・運用通知

関連ドキュメント: [01_requirements/functional-requirements.md](01_requirements/functional-requirements.md), [01_requirements/edge-cases.md](01_requirements/edge-cases.md), [02_design/screen-list.md](02_design/screen-list.md), [03_architecture/architecture.md](03_architecture/architecture.md)

**分解されたタスク:**

1. **TASK-052**: 監査ログイベント定義実装
   - 説明: 作成、編集、削除、予約、実行、再試行、通知送信などの主要イベント定義を実装する。
   - 補足: 認証、コンテンツ作成 / 更新、予約作成、再実行の監査イベント記録を実装済み。
   - ステータス: 実装済み（2026-06-20、CI未確認）
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-002, TASK-011, TASK-026, TASK-034
   - 関連PR: 未定

2. **TASK-053**: 監査ログ保存・検索API実装
   - 説明: 時系列検索、操作者検索、対象投稿検索ができる監査ログ API を実装する。
   - 補足: `/audit-logs` の保存・一覧取得 API は実装済み。検索条件指定は未実装。
   - ステータス: 進行中（2026-06-20）
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-052
   - 関連PR: 未定

3. **TASK-054**: 通知チャネル設定実装
   - 説明: メール、チャットの通知先設定、イベント種別ごとの有効化設定を実装する。
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-003
   - 関連PR: 未定

4. **TASK-055**: 失敗通知・再認可通知実装
   - 説明: 投稿失敗、要再認可、恒久エラー発生時の通知配信処理を実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-035, TASK-054
   - 関連PR: 未定

5. **TASK-056**: 通知失敗時の再送・代替記録実装
   - 説明: 通知チャネル障害時に監査ログへ記録し、再送キューまたは代替チャネル処理を実装する。
   - ストーリーポイント: 5
   - 担当者: Backend
   - 依存タスク: TASK-055
   - 関連PR: 未定

6. **TASK-057**: 日次サマリ通知実装
   - 説明: その日の投稿実績、失敗件数、未達見込みをまとめた日次通知を実装する。
   - ストーリーポイント: 3
   - 担当者: Backend
   - 依存タスク: TASK-041, TASK-054
   - 関連PR: 未定

7. **TASK-058**: 通知 / 監査ログ設定画面UI実装
   - 説明: 通知先設定、通知種別切替、監査ログ検索条件入力を行う UI を実装する。
   - ストーリーポイント: 5
   - 担当者: Frontend
   - 依存タスク: TASK-053, TASK-054
   - 関連PR: 未定

8. **TASK-059**: 監査ログ・通知受入テスト実装
   - 説明: 監査ログ記録、失敗通知、通知失敗時補完、日次サマリ通知のシナリオをテスト化する。
   - ストーリーポイント: 3
   - 担当者: QA
   - 依存タスク: TASK-056, TASK-057, TASK-058
   - 関連テスト: [06_tests/quality-checklist.md](06_tests/quality-checklist.md), [06_tests/regression-test.md](06_tests/regression-test.md)

## 横断品質・リリース準備

関連ドキュメント: [06_tests/test-plan.md](06_tests/test-plan.md), [07_release/release-checklist.md](07_release/release-checklist.md), [07_release/rollback-plan.md](07_release/rollback-plan.md), [08_operation/runbook.md](08_operation/runbook.md)

**分解されたタスク:**

1. **TASK-060**: API・Worker単体テスト整備
   - 説明: バリデーション、状態遷移、再試行、通知補完を中心に単体テストを拡充する。
   - ストーリーポイント: 5
   - 担当者: QA
   - 依存タスク: TASK-040, TASK-046, TASK-059
   - 関連PR: 未定

2. **TASK-061**: E2E回帰シナリオ整備
   - 説明: 連携、下書き作成、予約、投稿成功、失敗復旧、再認可、通知までの主要導線を E2E 化する。
   - ストーリーポイント: 5
   - 担当者: QA
   - 依存タスク: TASK-060
   - 関連テスト: [06_tests/e2e-tests.md](06_tests/e2e-tests.md), [06_tests/regression-test.md](06_tests/regression-test.md)

3. **TASK-062**: ローカル性能・負荷検証
   - 説明: 同時予約、一覧表示、ジョブ滞留、通知集中時の性能をローカル環境で測定し、ボトルネックを洗い出す。
   - ストーリーポイント: 5
   - 担当者: Infra
   - 依存タスク: TASK-061
   - 関連PR: 未定

4. **TASK-063**: ローカル運用ログ・監視ポイント整理
   - 説明: Worker停止、再試行急増、通知失敗、再認可急増を検知するために必要なログ、メトリクス、監視ポイントを整理する。
   - ストーリーポイント: 3
   - 担当者: Infra
   - 依存タスク: TASK-062
   - 関連PR: 未定

5. **TASK-064**: ローカルMVP完成後のクラウド移行準備
   - 説明: 障害復旧手順、再認可オペレーション、ロールバック手順を整理し、ローカルMVPをクラウド環境へ移す際の前提条件を明確化する。
   - ストーリーポイント: 3
   - 担当者: Platform
   - 依存タスク: TASK-063
   - 関連PR: 未定

## 優先実装順

1. TASK-001 から TASK-004 でローカル起動できる土台と外部依存のモックを先に揃える。
2. TASK-005 から TASK-024 でローカルから触れる連携、下書き、投稿種別のソースコードを優先実装する。
3. TASK-025 から TASK-040 で予約と実行制御をローカル完結で成立させる。
4. TASK-041 から TASK-059 で可視化、承認、通知、監査を追加する。
5. TASK-060 から TASK-064 でローカルMVPの品質保証を終え、その後のクラウド移行準備へ進む。
