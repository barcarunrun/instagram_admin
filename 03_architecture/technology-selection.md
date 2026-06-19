# 技術選定

## 言語・フレームワーク

### フロントエンド

- **言語**: JavaScript / TypeScript
- **フレームワーク**: Next.js (React + TypeScript)
- **理由**: 管理画面開発の生産性が高く、画面遷移・データ取得・デプロイ基盤との相性が良い。TypeScriptでUIの保守性を確保しやすい。

### バックエンド

- **言語**: TypeScript
- **フレームワーク**: Node.js + NestJS または Express系構成
- **理由**: フロントエンドと型共有しやすく、API、ジョブ実行、外部API連携を同一言語で扱える。チーム規模が小さい前提で学習コストを抑えられる。

## データベース

- **DBMS**: PostgreSQL
- **理由**: 予約・ジョブ・監査ログの整合性管理に向き、JSONBで柔軟な検証結果や外部レスポンスも扱いやすい。

## インフラ・デプロイ

- **ホスティング**: Azure
- **コンテナ**: Docker
- **オーケストレーション**: Azure Container Apps を第一候補
- **理由**: 少人数運用でも管理負荷を抑えつつ、APIとWorkerを分離してスケールしやすく、Azure Monitor やマネージドIDと統合しやすい。

## 開発ツール

- **バージョン管理**: Git
- **CI/CD**: GitHub Actions
- **テスト**: Vitest / Jest, Playwright

## 採用ミドルウェア

- **ジョブキュー**: Redis + BullMQ など
- **監視**: Datadog または Azure Monitor + Grafana
- **ファイル保存**: Azure Blob Storage
- **認証連携**: Facebook OAuth / Instagram Graph API

## 代替案と検討

- バックエンドをPythonにする案:
	- Worker実装との相性は良いが、フロントエンドとの型共有が難しくなるため今回は見送る。
- MongoDB採用案:
	- 柔軟性は高いが、予約ジョブや監査ログの関係整合性が重要なため見送る。
- Kubernetes採用案:
	- 将来の大規模運用では有力だが、初期フェーズでは運用コストが高いため見送る。

## 技術的負債

- Instagram API仕様変更時に投稿種別バリデーション更新が継続的に必要。
- v1では分析基盤を簡易集計に留めるため、将来的にBI基盤連携が必要になる。
- 失敗復旧の冪等性は外部API依存が強く、初期実装では保守的な再試行設計が必要。
