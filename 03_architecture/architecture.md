# システムアーキテクチャ

## 全体構成図

```
[運用者ブラウザ]
		|
		v
[Next.js フロントエンド]
		|
		v
[Application API]
		|            \
		|             \--> [PostgreSQL]
		|             \--> [Redis]
		|
		+--> [Job Worker / Scheduler] --> [Instagram Graph API]
		|
		+--> [Notification Service] --> [Email / Chat]
```

## コンポーネント

### フロントエンド

- Next.js App Router ベースの管理画面。
- 主な画面はダッシュボード、コンテンツ一覧、コンテンツ編集、予約設定、実行ログ。
- BFFを兼ねるAPI Routesは採用せず、専用Application APIに通信する。
- 状態管理はサーバー取得データ中心とし、フォーム編集中の一時状態のみクライアントで保持する。

### バックエンド

- Application API:
	- 認証連携、コンテンツ管理、予約管理、ジョブ管理、監査ログ取得を担当する。
	- REST APIとしてフロントエンドへ機能を提供する。
- Job Worker:
	- 予約時刻到達ジョブの取得、Instagram Graph APIへの投稿実行、再試行制御を担当する。
- Scheduler:
	- RedisキューまたはDB上の予約レコードを監視し、実行対象ジョブをWorkerへ投入する。
- Notification Service:
	- 投稿失敗、再認可要求、KPI未達見込みを通知する。

### インフラストラクチャ

- フロントエンドはVercelまたはコンテナ環境でホストする。
- Application APIとWorkerは同一クラウド基盤上の分離サービスとして稼働させる。
- 永続データはPostgreSQL、ジョブキューと短期キャッシュはRedisを使用する。
- 外部連携先はInstagram Graph API、通知チャネル、将来的な分析基盤を想定する。

## データフロー

1. 運用者がフロントエンドで下書きを作成・編集する。
2. Application APIが入力検証後、contents と media_assets を保存する。
3. 予約登録時に schedules と posting_jobs を作成し、Redisキューへ登録する。
4. Schedulerが時刻到達ジョブをWorkerへ引き渡す。
5. WorkerがInstagram Graph APIに投稿し、結果を posting_jobs と publish_results に保存する。
6. エラー時は設定済みの再試行ポリシーに従い再試行または action_required 状態へ遷移する。
7. Notification Serviceが必要に応じて通知を配信し、audit_logs に記録する。

## 通信仕様

- フロントエンド -> Application API: HTTPS / JSON REST
- Application API -> PostgreSQL: プライベートネットワーク経由SQL
- Application API -> Redis: プライベートネットワーク経由
- Scheduler / Worker -> Instagram Graph API: HTTPS
- Application API / Worker -> Notification Service: 非同期イベントまたは内部HTTP
