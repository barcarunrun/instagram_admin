import { AppShell } from "../../components/app-shell";
import { ContentStudio } from "../../components/content-studio";
import { serverApi } from "../../lib/server-api";

export default async function ContentsPage() {
  const [contents, mediaAssets, integration] = await Promise.all([
    serverApi.getContents(),
    serverApi.getMediaAssets({ excludeDemo: true }),
    serverApi.getIntegrationStatus(),
  ]);

  return (
    <AppShell currentPath="/contents">
      <ContentStudio
        initialContents={contents.items}
        mediaAssets={mediaAssets.items}
        accountId={integration.accountId}
      />
    </AppShell>
  );
}
