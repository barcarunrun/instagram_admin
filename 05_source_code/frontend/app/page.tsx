import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const cookieStore = await cookies();
  redirect(cookieStore.get("auth_token")?.value ? "/dashboard" : "/login");
}
