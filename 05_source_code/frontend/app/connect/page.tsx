import { AppShell } from "../../components/app-shell";
import { ConnectWorkflow } from "../../components/connect-workflow";
import { serverApi } from "../../lib/server-api";

export default async function ConnectPage(props: {
  searchParams?: Promise<{
    oauthSessionId?: string;
    oauthError?: string;
    oauthMessage?: string;
  }>;
}) {
  const integration = await serverApi.getIntegrationStatus().catch(() => null);
  const searchParams = await props.searchParams;

  return (
    <AppShell currentPath="/connect">
      <ConnectWorkflow
        initialIntegration={integration}
        initialOauthSessionId={searchParams?.oauthSessionId}
        initialOauthError={
          searchParams?.oauthMessage ?? searchParams?.oauthError
        }
      />
    </AppShell>
  );
}
