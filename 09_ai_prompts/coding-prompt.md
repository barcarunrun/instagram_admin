# コーディングプロンプト

## 基本ルール

AI を使用してコード生成する場合は、以下のプロンプトテンプレートを使用してください。

## プロンプトテンプレート

```
タスク: [タスク名]

関連ドキュメント:
- 要件: [01_requirements/functional-requirements.md](../01_requirements/functional-requirements.md)
- API設計: [03_architecture/api-design.md](../03_architecture/api-design.md)
- 実装順序: [04_tasks/implementation-order.md](../04_tasks/implementation-order.md)

実装内容:
[実装する内容の詳細]

制約条件:
- [制約1]
- [制約2]

テスト要件:
- ユニットテストのカバレッジ: 80%
- 以下のシナリオをカバー: [シナリオ]

コードスタイル:
- [プロジェクトのコーディング規約]
```

## 使用例

### 例1: API エンドポイント実装

```
タスク: ユーザー登録API実装

関連ドキュメント:
- API設計: 03_architecture/api-design.md
- 受入基準: 01_requirements/acceptance-criteria.md

実装内容:
POST /api/users エンドポイントを実装
- リクエスト: email, password
- レスポンス: user_id, email, token
- エラー処理: 既に登録済みメール、無効なパスワード

制約条件:
- Node.js + Express
- JWT トークン使用
- パスワードハッシュ化 (bcrypt)

テスト要件:
- 正常系: メール登録、トークン発行
- エラー系: 既存メール、弱いパスワード
- ユニットテスト 80%以上
```

### 例2: React コンポーネント実装

```
タスク: ユーザープロフィールコンポーネント実装

関連ドキュメント:
- 画面仕様: 02_design/screen-specification.md
- API設計: 03_architecture/api-design.md

実装内容:
ユーザープロフィール表示コンポーネント
- プロフィール画像、ユーザー名、フォロワー数表示
- フォロー/アンフォローボタン
- レスポンシブデザイン

制約条件:
- React 18+ Hooks
- TypeScript
- Tailwind CSS

テスト要件:
- データ表示テスト
- ボタンクリック動作テスト
- レスポンシブテスト
```

## AI生成コードのレビューチェックリスト

生成されたコードをレビューする際は、以下を確認:

- [ ] 要件を満たしている
- [ ] テストケースがカバーされている
- [ ] エラーハンドリングがある
- [ ] パフォーマンスに問題がない
- [ ] セキュリティに問題がない
- [ ] ドキュメント/コメントが十分
- [ ] プロジェクトのコーディング規約に従っている
