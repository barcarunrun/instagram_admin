# API設計

## API概要

Instagram運用管理ツールの管理画面とジョブワーカーが利用する内部APIを定義する。

- Base URL: /api
- フォーマット: application/json
- 認証: セッションCookieまたはBearer Token
- 日時: ISO 8601 UTC

## エンドポイント

### GET /api/integrations/instagram/status

**説明:** Instagram連携状態を取得

**リクエスト:**
```json
GET /api/integrations/instagram/status
Authorization: Bearer {token}
```

**レスポンス:**
```json
{
  "accountId": "ig_12345",
  "status": "active",
  "tokenExpiresAt": "2026-07-01T00:00:00Z",
  "permissions": ["content_publish", "pages_show_list"]
}
```

**ステータスコード:**
- 200: 成功
- 404: 連携情報が見つからない
- 401: 認証エラー

### POST /api/contents

**説明:** 新しい投稿下書きを作成

**リクエスト:**
```json
POST /api/contents
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "新作シャツ_初夏コーデ_2026W25",
  "contentType": "carousel",
  "caption": "新作シャツの着回し提案です",
  "hashtags": ["#メンズファッション", "#新作"],
  "mediaAssets": [
    {"assetId": "asset_1", "order": 1},
    {"assetId": "asset_2", "order": 2}
  ]
}
```

**レスポンス:**
```json
{
  "id": "content_456",
  "status": "draft",
  "validation": {
    "valid": true,
    "messages": []
  },
  "createdAt": "2026-06-19T00:00:00Z"
}
```

### PUT /api/contents/{id}

**説明:** 既存下書きを更新

### GET /api/contents

**説明:** コンテンツ一覧を取得

**クエリ例:**
```json
GET /api/contents?status=draft,scheduled&contentType=reel&keyword=新作
```

### POST /api/contents/{id}/validate

**説明:** 投稿種別に応じた入力・メディアバリデーションを実行

### POST /api/media-assets

**説明:** 画像・動画をアップロードしてメディア資産を作成

### POST /api/schedules

**説明:** 投稿予約を登録

**リクエスト:**
```json
{
  "contentId": "content_456",
  "publishAt": "2026-06-21T09:00:00Z",
  "timezone": "Asia/Tokyo",
  "accountId": "ig_12345"
}
```

### POST /api/schedules/validate

**説明:** 予約可否（未来時刻、重複、連携状態）を事前検証

### GET /api/calendar/events

**説明:** カレンダー表示用イベントを取得

### GET /api/dashboard/kpi

**説明:** ダッシュボード用KPIを取得

### GET /api/dashboard/alerts

**説明:** 要対応ジョブ、再認可対象、失敗投稿などのアラート一覧を取得

### GET /api/jobs/logs

**説明:** 投稿ジョブの実行ログ一覧を取得

### POST /api/jobs/{jobId}/retry

**説明:** 手動再実行を受け付ける

### GET /api/audit-logs

**説明:** 監査ログを検索する

## 認証

- 管理画面利用者はアプリケーションログイン済み前提とする。
- Instagram連携はFacebook OAuth 2.0 を利用する。
- バックエンド内サービス間通信はサービスアカウントまたは内部シークレットで保護する。

## レート制限

- 管理画面APIはユーザー単位で 60 req/min を目安とする。
- 再試行APIはジョブ単位の多重実行防止を行う。
- Instagram Graph API側の制限を超えないよう、Worker側でアカウント単位レート制御を実施する。

## エラーハンドリング

エラーレスポンスは以下の形式に統一する。

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "公開日時は現在より後の時刻を指定してください。",
    "details": [
      {
        "field": "publishAt",
        "reason": "must_be_future"
      }
    ],
    "requestId": "req_123"
  }
}
```

代表的なエラーコード:
- VALIDATION_ERROR
- AUTH_EXPIRED
- RATE_LIMITED
- RESOURCE_NOT_FOUND
- CONFLICT
- INTERNAL_ERROR
