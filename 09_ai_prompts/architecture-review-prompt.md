# アーキテクチャレビュープロンプト

## 基本ルール

AI を使用してアーキテクチャをレビューする場合は、以下のプロンプトテンプレートを使用してください。

## プロンプトテンプレート

```
レビュー対象:
[アーキテクチャドキュメント、または実装コード]

関連ドキュメント:
- アーキテクチャ: [03_architecture/architecture.md](../03_architecture/architecture.md)
- API設計: [03_architecture/api-design.md](../03_architecture/api-design.md)
- DB設計: [03_architecture/database-design.md](../03_architecture/database-design.md)
- セキュリティ: [03_architecture/security.md](../03_architecture/security.md)

レビュー観点:
- スケーラビリティ: 将来の成長に対応できるか
- 保守性: コードの保守は容易か
- セキュリティ: セキュリティリスクはないか
- パフォーマンス: パフォーマンス要件を満たすか
- 信頼性: 障害に強い設計か
- 拡張性: 新機能追加が容易か

指摘形式:
1. 課題: [具体的な課題]
2. 重要度: [Critical / High / Medium / Low]
3. 改善案: [改善方法]
```

## 使用例

### 例1: API アーキテクチャレビュー

```
レビュー対象:
03_architecture/api-design.md

関連ドキュメント:
- API設計: 03_architecture/api-design.md
- セキュリティ: 03_architecture/security.md
- 非機能要件: 01_requirements/non-functional-requirements.md

レビュー観点:
- API バージョニング: 戦略が明確か?
- エラーハンドリング: エラーレスポンスは統一されているか?
- レート制限: 過負荷対策はあるか?
- 認証・認可: セキュリティは十分か?
- ドキュメント: API ドキュメントは完全か?
```

### 例2: データベーススキーマレビュー

```
レビュー対象:
05_source_code/backend/migrations (スキーマ)

関連ドキュメント:
- DB設計: 03_architecture/database-design.md
- 非機能要件: 01_requirements/non-functional-requirements.md

レビュー観点:
- 正規化: 適切に正規化されているか?
- インデックス: 必要なインデックスが設定されているか?
- 制約: 適切な制約が設定されているか?
- スケーラビリティ: 大規模データに対応できるか?
- バックアップ: バックアップ戦略は考慮されているか?
```

## アーキテクチャレビューチェックリスト

- [ ] 非機能要件を満たしている
- [ ] スケーラビリティが考慮されている
- [ ] セキュリティが考慮されている
- [ ] 障害に強い設計
- [ ] 監視・ロギング体制が整備されている
- [ ] ドキュメントが充実している
- [ ] チーム内で合意されている
- [ ] 技術的負債が最小化されている
