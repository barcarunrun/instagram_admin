# E2Eテスト

## E2Eテストツール

- Selenium
- Cypress
- Playwright
- Puppeteer

## E2Eテストケース

### ユーザーストーリー1: ユーザー登録と初期ログイン

```gherkin
Feature: ユーザー登録とログイン

  Scenario: 新規ユーザーが登録してログインできる
    Given ユーザーが登録ページを開く
    When ユーザーが有効なメールアドレスとパスワードを入力して登録する
    Then ユーザーはホームページにリダイレクトされる
    And ユーザーはログイン状態になる
```

### ユーザーストーリー2: 投稿の作成と表示

```gherkin
Feature: 投稿機能

  Scenario: ユーザーが投稿を作成して表示できる
    Given ユーザーがログイン済み
    And ユーザーが投稿ページを開く
    When ユーザーが「テスト投稿」と入力して投稿ボタンをクリックする
    Then 投稿がフィードに表示される
    And 投稿に作成時刻が表示される

### ユーザーストーリー3: Instagramアカウント連携

```gherkin
Feature: Instagramアカウント連携

  Scenario: OAuth認可からアカウント接続まで完了できる
    Given ユーザーがログイン済み
    And ユーザーが connect 画面を開いている
    When ユーザーが「Facebookで連携する」をクリックする
    And OAuth callback が完了する
    And ユーザーが候補アカウントを選んで「このアカウントで接続」をクリックする
    Then 連携状態が active として表示される
    And 権限一覧に content_publish が含まれる

  Scenario: 権限不足のアカウントで再認可導線が出る
    Given mock OAuth が permission_denied シナリオで動作している
    When ユーザーが OAuth 認可を完了する
    Then 連携状態が reauthorization_required として表示される
    And 再認可ボタンが利用可能である

  Scenario: 期限切れアカウントを再認可で復旧できる
    Given 連携状態が expired である
    When ユーザーが「再認可する」をクリックして OAuth を完了する
    Then connect 画面の連携状態が active に戻る
    And dashboard alerts から要再認可アラートが消える
```

実行可能テスト実装:

- Playwright spec: 05_source_code/frontend/e2e/connect-workflow.spec.ts
- Config: 05_source_code/frontend/playwright.config.mjs
- 実行コマンド: `cd 05_source_code/frontend && npm run test:e2e -- e2e/connect-workflow.spec.ts`
- テスト環境: frontend は 3100 番、backend は 4100 番で専用起動し、OAuth / Instagram API は mock mode を強制する
- TC-103 の自動化範囲: connect 画面の expired 表示、dashboard alert、/schedules/validate の連携エラーまで。投稿実行時の失効は後続タスクで扱う

## テスト実行

```bash
cd 05_source_code/frontend
npm run test:e2e -- e2e/connect-workflow.spec.ts
```

## テスト結果レポート

（テスト結果の保存先）
