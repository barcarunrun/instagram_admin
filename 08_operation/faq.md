# FAQ (Frequently Asked Questions)

## ユーザー向け FAQ

### Q1: パスワードをリセットするにはどうしたらよいですか？

A: ログインページの「パスワードをお忘れですか?」リンクをクリックして、メールアドレスを入力してください。

### Q2: アカウントを削除するにはどうしたらよいですか？

A: 設定 > アカウント > アカウント削除 から削除できます。

### Q3: プロフィール画像をアップロードできません

A: 以下を確認してください:
- ファイルサイズが 5MB 以下か
- ファイル形式が JPEG/PNG か
- インターネット接続が安定しているか

## 運用向け FAQ

### Q1: データベース接続エラーが発生しています

A: 以下の手順を実施してください:

```bash
# 1. 接続テスト
npm run db:check

# 2. 接続をリセット
npm run db:reconnect

# 3. マイグレーション再実行
npm run migrate:up

# 4. サービス再起動
npm restart
```

### Q2: メモリ使用率が高いです

A: 以下を確認してください:

```bash
# メモリリークを確認
npm run profile:memory

# キャッシュをクリア
npm run cache:clear

# 古いプロセスを終了
npm run kill-old-processes
```

### Q3: デプロイに失敗しました

A: ロールバック手順を実施してください:

1. [07_release/rollback-plan.md](../07_release/rollback-plan.md) を確認
2. 前のバージョンに戻す
3. エラーログを分析
4. 根本原因を修正後、再度デプロイ

## 開発者向け FAQ

### Q1: 開発環境をセットアップするにはどうしたらよいですか？

A: README.md の開発環境セットアップセクションを参照してください。

### Q2: テストはどう実行しますか？

A: ```bash
npm test
npm run test:e2e
npm run test:coverage
```

### Q3: コードスタイルの確認はどうしますか？

A: ```bash
npm run lint
npm run format
```

## その他

### Q: 質問や問題が見つかった場合

- チャネル: #questions
- メール: team@example.com
- Issue: GitHub Issues
