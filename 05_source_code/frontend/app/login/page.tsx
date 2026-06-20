import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SERVER_API_BASE =
  process.env.SERVER_API_BASE_URL ?? "http://localhost:4000/api";

async function loginAction(formData: FormData): Promise<void> {
  "use server";

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const response = await fetch(`${SERVER_API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => undefined);
    const message = body?.error?.message ?? "ログインに失敗しました。";
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  const body = (await response.json()) as {
    accessToken: string;
    expiresIn: number;
  };

  const cookieStore = await cookies();
  cookieStore.set("auth_token", body.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: body.expiresIn,
  });

  redirect("/dashboard");
}

export default async function LoginPage(props: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const cookieStore = await cookies();
  if (cookieStore.get("auth_token")?.value) {
    redirect("/dashboard");
  }

  const searchParams = await props.searchParams;
  const error = searchParams?.error;

  return (
    <main className="login-page">
      <section className="card login-card">
        <p className="eyebrow">TASK-004</p>
        <h1 className="login-title">ローカルログイン</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          管理画面ログインと Application API 認証をローカルで確認します。
        </p>
        <form action={loginAction} className="login-form">
          <label className="login-field">
            <span>メールアドレス</span>
            <input
              name="email"
              type="email"
              defaultValue="demo@example.com"
              className="input"
              required
            />
          </label>
          <label className="login-field">
            <span>パスワード</span>
            <input
              name="password"
              type="password"
              defaultValue="LocalPass123!"
              className="input"
              required
            />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="button" type="submit">
            ログインする
          </button>
        </form>
        <p className="helper" style={{ marginTop: 16 }}>
          初期ユーザー: demo@example.com / LocalPass123!
        </p>
      </section>
    </main>
  );
}