import { NextResponse } from "next/server";
import { hasAdminPasswordConfig, hasAdminSession } from "@/lib/admin-auth";
import { getDayAvailabilityConfig, listBookingsByDate } from "@/lib/supabase-server";
import { parseLocalDate } from "@/lib/utils";
import type { AdminBookingsListResponse } from "@/types/booking";

export async function GET(request: Request) {
  if (!hasAdminPasswordConfig()) {
    return NextResponse.json(
      {
        error:
          "Админ-пароль ещё не настроен. Добавь ADMIN_PASSWORD в .env.local и перезапусти сервер.",
      },
      { status: 503 },
    );
  }

  if (!(await hasAdminSession())) {
    return NextResponse.json(
      {
        error: "Требуется вход в админку.",
      },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date")?.trim() ?? "";

  if (!date || !parseLocalDate(date)) {
    return NextResponse.json(
      {
        error: "Передай дату в формате YYYY-MM-DD.",
      },
      { status: 400 },
    );
  }

  try {
    const { bookings, storageMode } = await listBookingsByDate(date);
    const { availability } = await getDayAvailabilityConfig(date, bookings);
    const response: AdminBookingsListResponse = {
      date,
      bookings,
      availability,
      storageMode,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/admin/bookings failed:", error);

    return NextResponse.json(
      {
        error: "Не удалось загрузить записи. Проверь настройки и попробуй снова.",
      },
      { status: 500 },
    );
  }
}
