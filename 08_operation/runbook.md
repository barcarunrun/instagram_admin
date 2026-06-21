# ランブック (Runbook)

## 対象

このランブックは、ローカル MVP 環境で frontend / backend / worker / PostgreSQL / Redis を運用確認するための手順をまとめる。

Azure Blob Storage のみを併用して Instagram 実投稿を確認する場合の最小手順も末尾にまとめる。

作業ディレクトリ:

```bash
cd /Users/eiichisugiyama/Desktop/job/instagram_development/05_source_code
```

## 日常操作

### 1. サービス起動

ローカルスタック起動:

```bash
./scripts/local-stack.sh up
```

起動後の既定ポート:

- frontend: 3000
- backend: 4000
- PostgreSQL: 5432
- Redis: 6379

既定ポートが使用中の場合は `infra/.env` の `FRONTEND_PORT`、`BACKEND_PORT`、`POSTGRES_PORT`、`REDIS_PORT` を変更してから再実行する。

### 2. DB migration / seed

初回または DB を作り直した後:

```bash
./scripts/local-db.sh bootstrap
```

個別実行:

```bash
./scripts/local-db.sh migrate
./scripts/local-db.sh seed
```

### 3. サービス停止

```bash
./scripts/local-stack.sh down
```

ボリュームも含めて完全初期化する場合:

```bash
./scripts/local-stack.sh reset
```

### 4. ログ確認

全体ログ:

```bash
./scripts/local-stack.sh logs
```

個別ログ:

```bash
./scripts/local-stack.sh logs backend
./scripts/local-stack.sh logs frontend
./scripts/local-stack.sh logs worker
```

### 5. 稼働確認

サービス一覧:

```bash
./scripts/local-stack.sh ps
```

backend health:

```bash
curl http://localhost:4000/api/health
```

期待値:

```json
{"status":"ok"}
```

frontend 確認:

- http://localhost:3000
- http://localhost:3000/dashboard

### 6. DB 内容確認

テーブル一覧:

```bash
./scripts/local-db.sh tables
```

PostgreSQL へ直接接続:

```bash
docker compose -f infra/docker-compose.yml exec -it postgres \
  psql -U instagram -d instagram_ops
```

### 7. VS Code で GUI 接続する

1. VS Code の Extensions を開く
2. `SQLTools` を検索してインストールする
3. `SQLTools PostgreSQL/Cockroach Driver` をインストールする
4. 左サイドバーの SQLTools を開く
5. `Add New Connection` を押す
6. Driver に `PostgreSQL` を選ぶ
7. 以下を入力する

- Connection Name: `instagram_ops_local`
- Server / Host: `localhost`
- Port: `5432`
- Database: `instagram_ops`
- Username: `instagram`
- Password: `instagram`
- SSL: `OFF`

8. `Test Connection` を押す
9. `Save Connection` を押す
10. 保存後に connection を展開し、`Tables` から各テーブルを開く
11. テーブルを右クリックして `Show Table Records` を選ぶと GUI で行データを確認できる

注意:

- `infra/.env` で `POSTGRES_PORT` を変更している場合は、その値を Port に入力する
- frontend / backend を 3100 / 4100 で起動していても、PostgreSQL の接続ポートは通常 5432 のままなので混同しない

## トラブルシューティング

### サービスが起動しない場合

1. ポート競合を確認する

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN || true
lsof -nP -iTCP:4000 -sTCP:LISTEN || true
lsof -nP -iTCP:5432 -sTCP:LISTEN || true
lsof -nP -iTCP:6379 -sTCP:LISTEN || true
```

2. compose 定義を確認する

```bash
./scripts/local-stack.sh config
```

3. healthcheck 完了を待てているか確認する

```bash
./scripts/local-stack.sh ps
```

### データベース接続エラー

1. PostgreSQL コンテナが healthy か確認する

```bash
./scripts/local-stack.sh ps
```

2. migration / seed を再投入する

```bash
./scripts/local-db.sh bootstrap
```

3. backend health を確認する

```bash
curl http://localhost:4000/api/health
```

### backend が 500 を返す場合

1. backend ログを確認する

```bash
./scripts/local-stack.sh logs backend
```

2. PostgreSQL に必要テーブルがあるか確認する

```bash
./scripts/local-db.sh tables
```

3. seed データが必要な前提の画面/API では再投入する

```bash
./scripts/local-db.sh seed
```

### DB GUI 接続で見えない場合

1. PostgreSQL ポートを確認する
2. `infra/.env` で `POSTGRES_PORT` を変えていないか確認する
3. 接続情報は `localhost:5432`, `instagram_ops`, `instagram`, `instagram` を基本にする

## 定期確認

### 日次確認

- backend health の応答確認
- compose サービス状態確認
- backend ログのエラー確認

## Azure Blob Storage 併用運用

### 1. Storage リソース作成

```bash
cd /Users/eiichisugiyama/Desktop/job/instagram_development/05_source_code/infra/azure

az group create --name rg-igops-mvp --location japaneast
cp main.parameters.example.json main.parameters.json
# main.parameters.json に storageAccountName / storageContainerName / blobPublicAccess を設定する
az deployment group create \
  --resource-group rg-igops-mvp \
  --template-file main.bicep \
  --parameters @main.parameters.json
```

### 2. ローカル backend 用の Storage 接続を取得する

```bash
AZURE_STORAGE_CONNECTION_STRING=$(az storage account show-connection-string \
  --resource-group rg-igops-mvp \
  --name <storage-account-name> \
  --query connectionString \
  -o tsv)

export MEDIA_STORAGE_MODE=azure_blob
export AZURE_STORAGE_CONNECTION_STRING
export AZURE_STORAGE_CONTAINER_NAME=<storage-container-name>
```

### 3. ローカルスタックを起動する

```bash
cd /Users/eiichisugiyama/Desktop/job/instagram_development/05_source_code
./scripts/local-stack.sh up
./scripts/local-db.sh migrate
./scripts/local-db.sh seed
```

### 4. 動作確認

```bash
curl http://localhost:4000/api/health
./scripts/local-stack.sh logs backend
./scripts/local-stack.sh logs worker
```

### 5. 実投稿前の確認

- backend に `IG_ACCESS_TOKEN`、`IG_USER_ID`、`PUBLIC_API_BASE_URL`、`MEDIA_STORAGE_MODE=azure_blob` が設定されていること
- backend に `AZURE_STORAGE_CONNECTION_STRING` と `AZURE_STORAGE_CONTAINER_NAME` が設定されていること
- Blob Storage のメディア URL が `https` で取得できること
- `POST /api/integrations/instagram/bootstrap-existing-token` と `POST /api/integrations/instagram/connect` が完了していること

### 週次確認

- migration と seed 手順が再実行可能か確認
- DB ボリュームをリセットして再構築できるか確認
- known issues の更新要否を確認

### 月次確認

- ローカル MVP の実装差分が設計書と乖離していないか確認
- worker / Redis の実運用化に向けた未実装項目を棚卸しする
