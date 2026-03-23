import { NextResponse } from "next/server";
import { sendTelegramNotification } from "@/lib/telegram";
import { validateBookingInput } from "@/lib/utils";
import type { BookingRecord, StorageMode } from "@/types/booking";

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
        error:
          validation.errors[0] ??
          "Для Telegram нужен тот же набор данных, что и для записи.",
      },
      { status: 400 },
    );
  }

  const input = body as { storageMode?: StorageMode };
  const booking: BookingRecord = {
    ...validation.data,
    id: "preview",
    createdAt: new Date().toISOString(),
  };

  const result = await sendTelegramNotification(
    booking,
    input.storageMode === "supabase" ? "supabase" : "demo",
  );

  return NextResponse.json(
    result.delivered
      ? result
      : {
          ...result,
          error:
            result.reason === "missing_config"
              ? "Telegram не настроен. Заполни TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID."
              : "Telegram вернул ошибку при отправке.",
        },
    {
      status: result.delivered ? 200 : 503,
    },
  );
}
