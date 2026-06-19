# デプロイメント手続き

## 本番デプロイメント

### 前提条件

- リリースチェックリストが完了
- すべてのテストが成功
- ロールバック計画が準備済み

### デプロイメント手順

#### ステップ 1: デプロイメント準備

```bash
# リリースブランチから最新コードを取得
git checkout main
git pull origin main

# バージョンタグ確認
git tag -l

# リリース対象バージョン確認
echo "Deploying version: $VERSION"
```

#### ステップ 2: ビルド

```bash
# 本番環境用ビルド
npm run build:prod

# ビルドが成功したか確認
npm run test:build
```

#### ステップ 3: デプロイメント

```bash
# ステージング環境にデプロイ
npm run deploy:staging

# ステージング環境で動作確認
npm run test:staging

# 本番環境にデプロイ
npm run deploy:prod
```

#### ステップ 4: デプロイメント確認

```bash
# 本番環境の動作確認
npm run health-check:prod

# ログ確認
npm run logs:prod

# ユーザーが機能にアクセスできるか確認
```

## デプロイメント実施者

- 責任者: [名前]
- オブザーバー: [名前]

## デプロイメント時間窓

- **予定時間**: HH:MM - HH:MM (JST)
- **想定所要時間**: 30 分
- **ダウンタイム**: 5 分 (データベースマイグレーション時のみ)

## デプロイメント中の注意事項

- ユーザーへの事前通知を実施
- 監視チームをスタンバイ状態に
- チャットで進捗を共有
