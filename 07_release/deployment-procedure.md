# デプロイメント手続き

## Azure MVP デプロイメント

### 前提条件

- リリースチェックリストが完了
- すべてのテストが成功
- ロールバック計画が準備済み
- Azure Blob Storage 用の resource group が作成済み
- ローカル backend / worker / PostgreSQL / Redis を起動できること
- Azure Blob Storage の接続情報が確認済み

### デプロイメント手順

#### ステップ 1: デプロイメント準備

```bash
# リリースブランチから最新コードを取得
git checkout main
git pull origin main

# バージョンタグ確認
git tag -l

# デプロイ対象コミット確認
git rev-parse --short HEAD
```

#### ステップ 2: ローカル検証

```bash
# backend / worker の検証
cd 05_source_code/backend && npm run test && npm run typecheck && npm run lint
cd ../worker && npm run typecheck && npm run lint
```

#### ステップ 3: Azure Blob Storage 作成

```bash
# Azure Storage リソース作成または更新
cd ../infra/azure
cp main.parameters.example.json main.parameters.json
# main.parameters.json に storageAccountName / storageContainerName / blobPublicAccess を設定する
az deployment group create \
	--resource-group rg-igops-mvp \
	--template-file main.bicep \
	--parameters @main.parameters.json

AZURE_STORAGE_CONNECTION_STRING=$(az storage account show-connection-string \
	--resource-group rg-igops-mvp \
	--name <storage-account-name> \
	--query connectionString \
	-o tsv)

export MEDIA_STORAGE_MODE=azure_blob
export AZURE_STORAGE_CONNECTION_STRING
export AZURE_STORAGE_CONTAINER_NAME=<storage-container-name>
```

#### ステップ 4: ローカル backend / worker 起動

```bash
cd /Users/eiichisugiyama/Desktop/job/instagram_development/05_source_code
./scripts/local-stack.sh up

# 必要なら migration / seed
./scripts/local-db.sh migrate
./scripts/local-db.sh seed
```

#### ステップ 5: デプロイメント確認

```bash
# backend health 確認
curl http://localhost:4000/api/health

# local logs 確認
./scripts/local-stack.sh logs backend
./scripts/local-stack.sh logs worker

# media upload 後に Blob の公開 URL を確認する
```

#### ステップ 6: Instagram 実投稿確認

```bash
# backend に IG_ACCESS_TOKEN、IG_USER_ID、MEDIA_STORAGE_MODE=azure_blob を設定済みであること
# Blob Storage に保存されたメディアが https で取得できること
# backend に AZURE_STORAGE_CONNECTION_STRING と AZURE_STORAGE_CONTAINER_NAME を設定済みであること
# bootstrap-existing-token、connect、media upload、worker publish を確認すること
# connect 済み account で予約投稿または手動再実行を行うこと
```

## デプロイメント実施者

- 責任者: [名前]
- オブザーバー: [名前]

## デプロイメント時間窓

- **予定時間**: HH:MM - HH:MM (JST)
- **想定所要時間**: 30 分
- **ダウンタイム**: 原則なし。DB マイグレーション時のみ短時間停止を許容する。

## デプロイメント中の注意事項

- ユーザーへの事前通知を実施
- Azure コストを抑えるため、MVP 期間は Blob Storage のみを常時課金対象とする前提を共有する
- Blob の https 配信が切れていないことをデプロイ後に必ず確認する
