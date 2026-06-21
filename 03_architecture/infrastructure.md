# インフラストラクチャ

## 本番環境

### ホスティング

- クラウド: Azure を第一候補とする。
- リージョン: Japan East または Japan West を候補とする。
- MVP 期間は環境分離よりコスト最適化を優先し、単一環境で実投稿確認を成立させる。

### サーバー構成

- Frontend: ローカル運用を基本とし、クラウド配備は後続タスクとする。
- API: MVP ではローカル起動を基本とし、`05_source_code/scripts/local-stack.sh` で運用確認する。
- Worker: MVP ではローカル起動を基本とし、backend と同じローカル構成で実投稿確認する。
- DB: PostgreSQL はローカルコンテナを利用する。
- Redis: Redis はローカルコンテナを利用する。
- ファイル保存: Azure Blob Storage を使用し、Instagram Graph API が取得可能な https URL を返す。

### CDN

- MVP では CDN を必須としない。
- Blob Storage の公開 URL でメディア配信を成立させ、必要になった時点で CDN や Front Door を追加する。

### キャッシング戦略

- ダッシュボード集計は短時間キャッシュ（30秒から60秒）を許容する。
- コンテンツ一覧は検索条件ごとにアプリケーションキャッシュを行わない。
- ジョブ状態はRedisを使って短期参照を高速化する。

## ステージング環境

- MVP 期間は専用ステージング環境を必須としない。
- 実投稿の疎通確認は単一 Azure 環境と検証用 Instagram アカウントで行う。
- 環境分離は MVP 以後の拡張タスクとする。

## 開発環境

- フロントエンド、API、WorkerをDocker Composeで起動可能にする。
- PostgreSQLとRedisはローカルコンテナを利用する。
- Instagram APIはモックまたはSandbox設定で代替可能にする。
- 起動入口は `05_source_code/scripts/local-stack.sh` を使用する。
- DB 初期化、migration、seed は `05_source_code/scripts/local-db.sh` を使用する。
- backend はローカル MVP では PostgreSQL を参照し、初期確認は seed データを前提に行う。

## デプロイメント

- MVP では再現可能な手動デプロイ手順を先に整備し、その後 GitHub Actions による自動化を追加する。
- Azure で作成する対象は Blob Storage のみとし、backend / worker / DB / Redis のデプロイは行わない。
- DB マイグレーションはローカル backend 起動手順に含め、worker より先に適用する。
- `MEDIA_STORAGE_MODE=azure_blob` と Storage 接続情報をローカル backend に設定し、メディア本体は Blob Storage の https URL を優先する。

## スケーリング

- API は MVP ではローカル実行で確認し、常時稼働や水平スケールは後続で判断する。
- Worker は MVP ではローカル実行で確認し、常時稼働や段階的スケールは後続で判断する。
- スパイク時はアカウント単位の実行制御で Instagram API 制限を守る。
