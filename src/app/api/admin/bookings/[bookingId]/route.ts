import { NextResponse } from "next/server";
import { hasAdminPasswordConfig, hasAdminSession } from "@/lib/admin-auth";
import { deleteBooking } from "@/lib/supabase-server";
import {
  buildTelegramConfigErrorMessage,
  sendBookingDeletedNotification,
} from "@/lib/telegram";
import type { BookingDeleteResponse } from "@/types/booking";

type RouteContext = {
  params: Promise<{
    bookingId: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
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

  const { bookingId } = await context.params;
  const normalizedBookingId = bookingId.trim();

  if (!normalizedBookingId) {
    return NextResponse.json(
      {
        error: "Идентификатор записи не передан.",
      },
      { status: 400 },
    );
  }

  try {
    const { booking, storageMode } = await deleteBooking(normalizedBookingId);
    const telegramResult = await sendBookingDeletedNotification(booking, storageMode);

    const response: BookingDeleteResponse = {
      booking,
      storageMode,
      telegramDelivered: telegramResult.delivered,
      ...(telegramResult.delivered
        ? {}
        : {
            telegramWarning: `Запись удалена, но ${buildTelegramConfigErrorMessage(telegramResult).toLowerCase()}`,
          }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`DELETE /api/admin/bookings/${normalizedBookingId} failed:`, error);

    const message =
      error instanceof Error
        ? error.message
        : "Не удалось удалить запись. Попробуй ещё раз.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: message.toLowerCase().includes("не найдена") ? 404 : 500,
      },
    );
  }
}
