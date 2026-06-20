# GitHub Copilot Instructions

このリポジトリは AI-Native System Development Repository として構成されています。
Copilot はコードだけではなく、要件・設計・タスク・テスト・運用文書も前提にして支援してください。

## 目的

- 実装、レビュー、テスト生成、設計確認を支援する。
- 推測で補完せず、既存ドキュメントの記述を優先する。
- 変更時はコードと関連ドキュメントの整合性を保つ。

## 最初に確認する順序

作業開始時は、依頼内容に応じて次の順序で参照してください。

1. リポジトリ全体像: README.md
2. プロジェクト運用方針: SKILL.md
3. 要件: 01_requirements/
4. UI/UX 設計: 02_design/
5. アーキテクチャ: 03_architecture/
6. タスク分解と実装順序: 04_tasks/task-breakdown.md, 04_tasks/implementation-order.md
7. ソースコード: 05_source_code/
8. テスト観点: 06_tests/
9. 詳細な AI 依頼テンプレート: 09_ai_prompts/
10. 技術判断の背景: 10_decisions/

## 作業単位

- 実装はできるだけ TASK-ID 単位で進める。
- 依存タスクがある場合は 04_tasks の記述を優先する。
- 大きな変更を提案する前に、関連する要件、設計、受入基準、エッジケースを確認する。

## サービス責務

- frontend: 管理画面表示、フォーム入力、一時的なクライアント状態管理
- backend: 認証連携、コンテンツ管理、予約管理、ジョブログ取得、ダッシュボード集計 API
- worker: 投稿ジョブ実行、再試行、外部 API 呼び出し

責務をまたぐ変更は、関連ドキュメントとインターフェースの整合性を確認してから行ってください。

## 実装時のルール

- 要件と受入基準に対応する形でコードを書く。
- edge-cases.md にある失敗系や例外系を見落とさない。
- API 実装時は 03_architecture/api-design.md を優先する。
- DB や永続化に触れる場合は 03_architecture/database-design.md を確認する。
- セキュリティ、監査ログ、認証認可に関わる変更は 03_architecture/security.md と関連 ADR を確認する。

## 変更時の必須確認

- コード変更に関連するドキュメント更新が必要か確認する。
- 新規機能や仕様変更は、少なくとも要件、設計、テストのどこに影響するかを明示する。
- 重要な要件には対応するテストケースを用意する。
- ローカル MVP の範囲を超える実装を入れる場合は、段階的に導入する。

## レビュー時の観点

- 要件を満たしているか。
- 受入基準に沿っているか。
- セキュリティ、権限、エラーハンドリングに問題がないか。
- frontend / backend / worker の責務分離が保たれているか。
- テストで正常系と異常系がカバーされているか。

## プロンプト資産の使い分け

詳細な依頼文が必要な場合は、次を参照してください。

- 09_ai_prompts/coding-prompt.md: 実装依頼
- 09_ai_prompts/review-prompt.md: コードレビュー依頼
- 09_ai_prompts/test-generation-prompt.md: テスト生成依頼
- 09_ai_prompts/architecture-review-prompt.md: 設計レビュー依頼
- 09_ai_prompts/requirement-check-prompt.md: 要件確認依頼

このファイルは自動参照用の入口です。詳細なテンプレートの代わりではありません。