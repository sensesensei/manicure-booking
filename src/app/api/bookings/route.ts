import { NextResponse } from "next/server";
import {
  buildTelegramConfigErrorMessage,
  sendBookingCreatedNotification,
} from "@/lib/telegram";
import {
  createBooking,
  getDayAvailabilityConfig,
  listBookingsByDate,
} from "@/lib/supabase-server";
import { buildSlots, parseLocalDate, validateBookingInput } from "@/lib/utils";
import type {
  BookingCreateResponse,
  BookingsAvailabilityResponse,
} from "@/types/booking";

export async function GET(request: Request) {
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
    const response: BookingsAvailabilityResponse = {
      date,
      slots: buildSlots(date, bookings, availability.availableTimes),
      storageMode,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/bookings failed:", error);

    return NextResponse.json(
      {
        error: "Не удалось загрузить записи. Проверь настройки и попробуй снова.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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

  const validation = validateBookingInput(body);

  if (!validation.data || validation.errors.length > 0) {
    return NextResponse.json(
      {
        error: validation.errors[0] ?? "Проверь корректность заполнения формы.",
      },
      { status: 400 },
    );
  }

  try {
    const { booking, storageMode } = await createBooking(validation.data);
    const telegramResult = await sendBookingCreatedNotification(booking, storageMode);

    const response: BookingCreateResponse = {
      booking,
      storageMode,
      telegramDelivered: telegramResult.delivered,
      ...(telegramResult.delivered
        ? {}
        : {
            telegramWarning: `Запись сохранена, но ${buildTelegramConfigErrorMessage(telegramResult).toLowerCase()}`,
          }),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("POST /api/bookings failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Не удалось сохранить запись. Попробуй позже.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: message.toLowerCase().includes("слот уже занят") ? 409 : 500,
      },
    );
  }
}
