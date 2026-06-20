import { AppShell } from "../../components/app-shell";
import { Hero } from "../../components/hero";
import { JobLogPanel } from "../../components/job-log-panel";
import { serverApi } from "../../lib/server-api";

export default async function LogsPage() {
  const logs = await serverApi.getJobLogs();

  return (
    <AppShell currentPath="/logs">
      <Hero
        eyebrow="投稿実行ログ"
        title="失敗原因の確認と再実行"
        description="投稿ジョブの成功、失敗、再試行履歴を確認し、手動再実行できます。"
      />
      <JobLogPanel initialLogs={logs.items} />
    </AppShell>
  );
}
