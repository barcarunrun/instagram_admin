import { AppShell } from "../../components/app-shell";
import { ContentStudio } from "../../components/content-studio";
import { api } from "../../lib/api";

export default async function ContentsPage() {
  const [contents, mediaAssets, integration] = await Promise.all([
    api.getContents(),
    api.getMediaAssets(),
    api.getIntegrationStatus(),
  ]);

  return (
    <AppShell currentPath="/contents">
      <ContentStudio initialContents={contents.items} mediaAssets={mediaAssets.items} accountId={integration.accountId} />
    </AppShell>
  );
}