import { redirect } from "next/navigation";
import { AdminBookingsPanel } from "@/components/admin-bookings-panel";
import { hasAdminPasswordConfig, hasAdminSession } from "@/lib/admin-auth";
import { formatDateToISO } from "@/lib/utils";

export default async function AdminPage() {
  if (!hasAdminPasswordConfig()) {
    redirect("/admin/login");
  }

  const isAuthenticated = await hasAdminSession();

  if (!isAuthenticated) {
    redirect("/admin/login");
  }

  const initialDate = formatDateToISO(new Date());

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AdminBookingsPanel initialDate={initialDate} />
      </div>
    </main>
  );
}
