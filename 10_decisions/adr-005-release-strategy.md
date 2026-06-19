# ADR-005: リリース・デプロイメント戦略

## ステータス

提案中

## 背景

安全かつ効率的なリリースプロセスにより、ユーザーへの影響を最小化しながら品質の高いシステムを提供する必要がある。

## 決定

### リリースサイクル

- **リリース頻度**: 週 1 回 (毎週金曜日)
- **バージョニング**: Semantic Versioning (x.y.z)

### 環境構成

- **開発環境 (dev)**: リアルタイム更新
- **ステージング環境 (staging)**: リリース前テスト
- **本番環境 (production)**: 本番稼働

### デプロイメント戦略

- **Blue-Green Deployment**:
  - 同一構成の 2 つの本番環境 (Blue, Green)
  - 片方で新バージョンをテスト
  - 問題なければ切り替え
  - ロールバック時は元の環境に切り替え

### 機能フラグ (Feature Flags)

- 新機能は機能フラグで制御
- デプロイ後に段階的に有効化
- ロールバック時は無効化

## 理由

### Blue-Green Deployment

- **利点**
  - ゼロダウンタイムデプロイメント
  - ロールバックが高速
  - 本番環境でテスト可能

- **欠点**
  - インフラコストが 2 倍

### 機能フラグの採用

- **利点**
  - デプロイと本番化を分離
  - A/B テストが容易
  - 段階的なロールアウト可能

## 代替案

### 代替案 1: Canary Deployment

- **利点**: インフラコスト削減、段階的ロールアウト
- **欠点**: ロールバックに時間、複数バージョン同時運用

### 代替案 2: Rolling Deployment

- **利点**: シンプル、インフラコスト削減
- **欠点**: ロールバック時間が長い、互換性に注意必要

## 実装手順

### デプロイメント前チェック

```bash
npm run build
npm run test:e2e
npm run security:check
```

### ステージング環境でテスト

```bash
npm run deploy:staging
npm run test:smoke
npm run test:load
```

### 本番環境へのデプロイ

```bash
npm run deploy:prod:blue-green
# または
npm run deploy:prod:canary
```

### ロールバック手順

```bash
npm run rollback:prod
```

## CI/CD パイプライン

```
Code Push
  ↓
Lint & Test
  ↓
Build
  ↓
Deploy to Staging
  ↓
E2E Test & Load Test
  ↓
Manual Approval
  ↓
Deploy to Production
  ↓
Smoke Test
  ↓
Done
```

## 影響

### ポジティブな影響

- ゼロダウンタイムデプロイメント実現
- 迅速なロールバック
- 段階的な新機能公開

### ネガティブな影響

- インフラコストが増加
- CI/CD パイプラインの複雑性

## リスク

1. **データベーススキーマ変更**: 互換性の問題
   - 対策: 段階的マイグレーション、後方互換性確保

2. **機能フラグの管理**: フラグの漏れ
   - 対策: 定期的なフラグ監査

## 今後の見直し

- 3 ヶ月後: デプロイメント頻度と成功率を評価
- 6 ヶ月後: Canary Deployment への変更を検討

## 関連する決定

- ADR-001: 技術スタック選定
- ADR-002: インフラストラクチャ戦略
