import { NextResponse } from "next/server";
import { BOOKING_WINDOW_DAYS } from "@/constants";
import { listAvailabilityWindow } from "@/lib/supabase-server";
import { formatDateToISO, parseLocalDate } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start =
    searchParams.get("start")?.trim() ?? formatDateToISO(new Date());
  const durationValue = Number(searchParams.get("duration") ?? BOOKING_WINDOW_DAYS);
  const duration = Number.isFinite(durationValue)
    ? Math.min(Math.max(Math.trunc(durationValue), 1), BOOKING_WINDOW_DAYS)
    : BOOKING_WINDOW_DAYS;

  if (!parseLocalDate(start)) {
    return NextResponse.json(
      {
        error: "Передай start в формате YYYY-MM-DD.",
      },
      { status: 400 },
    );
  }

  try {
    const { days, storageMode } = await listAvailabilityWindow(start, duration);

    return NextResponse.json({
      start,
      duration,
      days,
      storageMode,
    });
  } catch (error) {
    console.error("GET /api/availability failed:", error);

    return NextResponse.json(
      {
        error: "Не удалось загрузить календарь доступности. Попробуй ещё раз.",
      },
      { status: 500 },
    );
  }
}
