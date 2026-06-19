# ランブック (Runbook)

## 日常操作

### サービス起動

```bash
# サービスを起動
npm start

# または systemd を使用
sudo systemctl start instagram-api
```

### サービス停止

```bash
# サービスを停止
npm stop

# または systemd を使用
sudo systemctl stop instagram-api
```

### ログの確認

```bash
# リアルタイムログ
npm run logs

# ファイルからログ確認
tail -f logs/app.log

# エラーログ確認
tail -f logs/error.log
```

## トラブルシューティング

### サービスが起動しない場合

1. ポートが使用中でないか確認
   ```bash
   lsof -i :3000
   ```

2. 環境変数が設定されているか確認
   ```bash
   env | grep DATABASE_URL
   ```

3. ログを確認
   ```bash
   npm run logs
   ```

### データベース接続エラー

```bash
# データベース接続確認
npm run db:check

# データベースマイグレーション再実行
npm run migrate:up
```

### メモリリーク疑い

```bash
# メモリ使用率確認
node --max-old-space-size=4096 index.js

# ヒープダンプ取得
node --inspect=0.0.0.0:9229 index.js
```

## 定期メンテナンス

### 日次メンテナンス

- ログ確認
- パフォーマンスメトリクス確認
- エラー数確認

### 週次メンテナンス

- バックアップ確認
- セキュリティアップデート確認
- ディスク容量確認

### 月次メンテナンス

- データベースメンテナンス
- ログ削除
- パフォーマンス分析
