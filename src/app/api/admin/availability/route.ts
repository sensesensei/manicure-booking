import { NextResponse } from "next/server";
import { hasAdminPasswordConfig, hasAdminSession } from "@/lib/admin-auth";
import { updateDayAvailability } from "@/lib/supabase-server";
import { normalizeAvailableTimes, parseLocalDate } from "@/lib/utils";
import type { DayAvailabilityUpdateResponse } from "@/types/booking";

export async function PUT(request: Request) {
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

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Тело запроса должно быть в формате JSON.",
      },
      { status: 400 },
    );
  }

  const date =
    body && typeof body === "object" && "date" in body && typeof body.date === "string"
      ? body.date.trim()
      : "";
  const isClosed =
    body && typeof body === "object" && "isClosed" in body && typeof body.isClosed === "boolean"
      ? body.isClosed
      : false;
  const availableTimes =
    body &&
    typeof body === "object" &&
    "availableTimes" in body &&
    Array.isArray(body.availableTimes)
      ? body.availableTimes.filter((value): value is string => typeof value === "string")
      : [];

  if (!date || !parseLocalDate(date)) {
    return NextResponse.json(
      {
        error: "Передай дату в формате YYYY-MM-DD.",
      },
      { status: 400 },
    );
  }

  try {
    const { availability, storageMode } = await updateDayAvailability({
      date,
      isClosed,
      availableTimes: normalizeAvailableTimes(availableTimes),
    });
    const response: DayAvailabilityUpdateResponse = {
      availability,
      storageMode,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("PUT /api/admin/availability failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Не удалось сохранить доступность дня. Попробуй ещё раз.";
    const normalizedMessage = message.toLowerCase();
    const status = normalizedMessage.includes("нельзя")
      ? 409
      : normalizedMessage.includes("ещё не создана")
        ? 503
        : 500;

    return NextResponse.json(
      {
        error: message,
      },
      { status },
    );
  }
}
