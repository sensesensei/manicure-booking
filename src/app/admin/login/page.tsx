import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin-login-form";
import { hasAdminPasswordConfig, hasAdminSession } from "@/lib/admin-auth";

export default async function AdminLoginPage() {
  const isAuthenticated = await hasAdminSession();

  if (isAuthenticated) {
    redirect("/admin");
  }

  const isConfigured = hasAdminPasswordConfig();

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl rounded-[34px] border border-card-border bg-paper-strong p-6 shadow-[0_30px_90px_rgba(75,40,28,0.12)] sm:p-8">
        <p className="text-sm uppercase tracking-[0.22em] text-muted">
          Защищённый вход
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-none text-foreground">
          Админка Nail Diary
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted sm:text-base">
          Вход в админку защищён паролем. После авторизации можно смотреть
          записи по датам и удалять их без работы напрямую в Supabase.
        </p>

        {isConfigured ? (
          <AdminLoginForm />
        ) : (
          <div className="mt-8 rounded-[24px] border border-danger/20 bg-danger-soft/70 p-5 text-danger">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-danger/80">
              Нужно настроить доступ
            </p>
            <p className="mt-3 text-sm leading-6">
              Добавь <code>ADMIN_PASSWORD</code> в{" "}
              <code>.env.local</code> и перезапусти сервер.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-[18px] bg-white/80 px-4 py-3 text-sm text-foreground">
              <code>ADMIN_PASSWORD=your_secure_password</code>
            </pre>
          </div>
        )}

        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-card-border bg-white/80 px-5 py-3 text-sm font-medium text-foreground hover:-translate-y-0.5 hover:bg-white"
          >
            Вернуться на сайт
          </Link>
        </div>
      </div>
    </main>
  );
}
