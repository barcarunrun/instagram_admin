# テストケース

## テストケーステンプレート

```
TC-001: [テストケース名]

前提条件:
  - ユーザーがログイン済み
  - ユーザーが投稿ページに存在

テスト手順:
  1. [操作1]
  2. [操作2]
  3. [操作3]

期待結果:
  - [期待される結果1]
  - [期待される結果2]

関連要件:
  - [01_requirements/...](01_requirements/...)

関連ストーリー:
  - As a [ユーザー] I want to [機能] So that [価値]
```

## ユーザー登録機能

### TC-001: 有効なメールアドレスでの登録

前提条件:
  - 登録ページが開かれている
  - ユーザーがまだ存在しない

テスト手順:
  1. メールアドレス入力フィールドに「test@example.com」を入力
  2. パスワード入力フィールドに「Password123!」を入力
  3. 登録ボタンをクリック

期待結果:
  - ユーザーが正常に登録される
  - ホームページにリダイレクト
  - 登録完了メッセージが表示される

### TC-002: 無効なメールアドレスでの登録失敗

前提条件:
  - 登録ページが開かれている

テスト手順:
  1. メールアドレス入力フィールドに「invalid-email」を入力
  2. パスワード入力フィールドに「Password123!」を入力
  3. 登録ボタンをクリック

期待結果:
  - エラーメッセージが表示される
  - ユーザーが登録されない
  - ページが登録ページのままである

## 投稿機能

### TC-003: 投稿の作成と表示

前提条件:
  - ユーザーがログイン済み
  - 投稿ページが開かれている

テスト手順:
  1. テキストエリアに「このテスト投稿です」と入力
  2. 投稿ボタンをクリック

期待結果:
  - 投稿が正常に作成される
  - 投稿が投稿フィードに表示される
  - 作成時刻が表示される

## Instagramアカウント連携

### TC-101: Instagramアカウント連携成功

前提条件:
  - ユーザーがログイン済み
  - connect 画面が開かれている
  - OAuth モードが mock または real で有効になっている

テスト手順:
  1. 「Facebookで連携する」をクリック
  2. OAuth callback 完了後、候補アカウントを確認
  3. 「このアカウントで接続」をクリック

期待結果:
  - Instagramアカウントが active 状態で保存される
  - 権限一覧に content_publish と pages_show_list が表示される
  - connect 画面の連携状態カードが active に更新される

関連要件:
  - [01_requirements/functional-requirements.md](01_requirements/functional-requirements.md)
  - [01_requirements/acceptance-criteria.md](01_requirements/acceptance-criteria.md)

### TC-102: 権限不足アカウントの検出

前提条件:
  - ユーザーがログイン済み
  - mock シナリオ permission_denied が利用可能

テスト手順:
  1. OAuth 開始を permission_denied シナリオで実行
  2. callback 後の候補アカウントを確認
  3. 接続確定を実行する

期待結果:
  - 連携状態が reauthorization_required になる
  - ダッシュボード alerts に要再認可アラートが出る
  - 再認可導線が利用可能である

### TC-103: トークン期限切れの状態遷移

前提条件:
  - token_expires_at が現在時刻以前の連携レコードがある

テスト手順:
  1. connect 画面または dashboard alerts を開く
  2. 連携状態取得 API を呼び出す

期待結果:
  - 連携状態が expired に更新される
  - 要再認可通知イベントが発火する
  - 予約バリデーションで連携エラーになる

### TC-104: 再認可後の復旧

前提条件:
  - 連携状態が expired または reauthorization_required である

テスト手順:
  1. 「再認可する」をクリック
  2. OAuth callback 完了後、対象アカウントを選択して保存

期待結果:
  - status が active に復帰する
  - tokenExpiresAt が新しい日時に更新される
  - connect 画面で再認可完了メッセージが表示される
