# テスト生成プロンプト

## 基本ルール

AI を使用してテストコード生成する場合は、以下のプロンプトテンプレートを使用してください。

## プロンプトテンプレート

```
タスク: [テスト対象機能名] のテスト生成

対象コード:
[テスト対象のコードまたはファイルパス]

関連ドキュメント:
- 受入基準: [01_requirements/acceptance-criteria.md](../01_requirements/acceptance-criteria.md)
- 機能要件: [01_requirements/functional-requirements.md](../01_requirements/functional-requirements.md)
- テストケース: [06_tests/test-cases.md](../06_tests/test-cases.md)

テスト範囲:
- 正常系: [テスト内容]
- エラー系: [テスト内容]
- エッジケース: [テスト内容]

テストフレームワーク:
- [Jest/Mocha/Pytest など]

カバレッジ目標:
- ステートメントカバレッジ: 80%
- ブランチカバレッジ: 75%

テスト実行方法:
npm test -- [テストファイル]
```

## 使用例

### 例1: API テスト生成

```
タスク: ユーザー登録API のテスト生成

対象コード:
05_source_code/backend/routes/users.js (POST /api/users)

関連ドキュメント:
- 受入基準: 01_requirements/acceptance-criteria.md
- テストケース: 06_tests/test-cases.md (TC-001, TC-002)

テスト範囲:
- 正常系: 有効なメール・パスワードでの登録成功
- エラー系: 既存メール、弱いパスワード、無効なメール
- エッジケース: 空文字列、超長文字列、特殊文字

テストフレームワーク: Jest

カバレッジ目標: 85%
```

### 例2: React コンポーネントテスト生成

```
タスク: UserProfile コンポーネントのテスト生成

対象コード:
05_source_code/frontend/components/UserProfile.jsx

関連ドキュメント:
- 画面仕様: 02_design/screen-specification.md
- テストケース: 06_tests/test-cases.md (TC-003)

テスト範囲:
- 正常系: ユーザーデータ表示、フォロー/アンフォロー動作
- エラー系: データ読み込み失敗、API エラー
- エッジケース: データなし、超長いユーザー名

テストフレームワーク: Jest + React Testing Library

カバレッジ目標: 80%
```

## 生成されたテストのチェックリスト

- [ ] すべての受入基準がカバーされている
- [ ] 正常系・エラー系・エッジケースがある
- [ ] モック/スタブが適切に設定されている
- [ ] アサーション (expect) が明確
- [ ] テストが独立しており、相互に依存していない
- [ ] テスト名が意図を明確に表している
- [ ] テスト実行時間が許容範囲内
