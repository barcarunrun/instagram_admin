# Azure Blob Storage Only

このディレクトリは、Instagram 実投稿で必要な公開メディア URL を供給するために、Azure Blob Storage だけを作成する低コスト MVP 構成をまとめる。

## 対象リソース

- Azure Storage Account
- Blob Container

backend、worker、PostgreSQL、Redis、frontend、staging / prod 分離、CDN、詳細監視は MVP では対象外とする。

## 前提

- Azure CLI と Bicep が利用できること
- ローカル backend から Azure Storage に接続できること
- backend / worker / PostgreSQL / Redis はローカル起動を継続すること

## ファイル

- `main.bicep`: Storage Account と Blob Container のみを作る最小リソース定義
- `main.parameters.example.json`: デプロイ用パラメータ例

## デプロイ例

```bash
cd /Users/eiichisugiyama/Desktop/job/instagram_development/05_source_code/infra/azure

az group create \
  --name rg-igops-mvp \
  --location japaneast

cp main.parameters.example.json main.parameters.json
# 必要に応じて storageAccountName / storageContainerName / blobPublicAccess を調整する

az deployment group create \
  --resource-group rg-igops-mvp \
  --template-file main.bicep \
  --parameters @main.parameters.json
```

## 出力

デプロイ成功後に以下の出力が得られる。

- `blobContainerUrl`
- `storageAccountResourceName`
- `storageContainerResourceName`

接続文字列は次のように取得して、ローカル backend の `AZURE_STORAGE_CONNECTION_STRING` に設定する。

```bash
az storage account show-connection-string \
  --resource-group rg-igops-mvp \
  --name <storage-account-name> \
  --query connectionString \
  -o tsv
```

## 補足

- backend はローカルで `MEDIA_STORAGE_MODE=azure_blob`、`AZURE_STORAGE_CONNECTION_STRING`、`AZURE_STORAGE_CONTAINER_NAME` を設定して起動する。
- worker はローカル backend が返す Blob の公開 HTTPS URL をそのまま Instagram Graph API に渡す。
- `blobPublicAccess` を `Blob` にすると匿名 read が有効になり、MVP では追加実装なしで Instagram Graph API から取得できる。

## コスト方針

- Storage は `Standard_LRS`
- Azure 常駐リソースは Storage Account のみ

この構成は MVP で実投稿を通すことを優先し、アプリ実行基盤の Azure 化は後続に回す前提。