import { AppShell } from "../../components/app-shell";
import { MediaManagement } from "../../components/media-management";
import { serverApi } from "../../lib/server-api";

export default async function MediaPage() {
  const mediaAssets = await serverApi.getMediaAssets({ excludeDemo: true });

  return (
    <AppShell currentPath="/media">
      <MediaManagement initialMediaAssets={mediaAssets.items} />
    </AppShell>
  );
}
