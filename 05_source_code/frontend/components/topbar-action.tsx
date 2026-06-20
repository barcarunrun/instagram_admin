import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PlusIcon } from "./icons";

const SERVER_API_BASE =
  process.env.SERVER_API_BASE_URL ?? "http://localhost:4000/api";

async function logoutAction(): Promise<void> {
  "use server";

  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (token) {
    await fetch(`${SERVER_API_BASE}/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }).catch(() => undefined);
  }

  cookieStore.delete("auth_token");
  redirect("/login");
}

export function TopbarAction() {
  return (
    <div className="button-row">
      <button className="button" type="button">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <PlusIcon />
          新規投稿作成
        </span>
      </button>
      <form action={logoutAction}>
        <button className="secondary-button" type="submit">
          ログアウト
        </button>
      </form>
    </div>
  );
}
