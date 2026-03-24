import { formatDateLabel } from "@/lib/utils";
import type { BookingRecord, StorageMode } from "@/types/booking";
import type { TelegramMissingField } from "@/types/telegram";

export type TelegramResult = {
  delivered: boolean;
  reason?: "missing_config" | "request_failed";
  details?: string;
};

type TelegramApiResponse = {
  ok?: boolean;
  description?: string;
};

const TELEGRAM_REQUEST_TIMEOUT_MS = 8_000;

const timestampFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "short",
  timeStyle: "short",
});

function getTelegramConfig() {
  return {
    token: process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "",
    chatId: process.env.TELEGRAM_CHAT_ID?.trim() ?? "",
  };
}

export function getTelegramConfigState() {
  const { token, chatId } = getTelegramConfig();
  const missingFields: TelegramMissingField[] = [];

  if (!token) {
    missingFields.push("TELEGRAM_BOT_TOKEN");
  }

  if (!chatId) {
    missingFields.push("TELEGRAM_CHAT_ID");
  }

  return {
    configured: missingFields.length === 0,
    missingFields,
  };
}

export function hasTelegramConfig() {
  return getTelegramConfigState().configured;
}

function formatStorageMode(storageMode: StorageMode) {
  return storageMode === "supabase" ? "supabase" : "demo";
}

function buildBookingLines(booking: BookingRecord) {
  return [
    `Имя: ${booking.clientName}`,
    `Телефон: ${booking.phone}`,
    `Telegram: ${booking.telegram}`,
    `Дата: ${formatDateLabel(booking.bookingDate)}`,
    `Время: ${booking.bookingTime}`,
    booking.note ? `Комментарий: ${booking.note}` : null,
  ].filter(Boolean);
}

function buildBookingCreatedMessage(
  booking: BookingRecord,
  storageMode: StorageMode,
) {
  return [
    "Новая запись на маникюр",
    "",
    ...buildBookingLines(booking),
    "",
    `Источник: ${formatStorageMode(storageMode)}`,
  ].join("\n");
}

function buildBookingDeletedMessage(
  booking: BookingRecord,
  storageMode: StorageMode,
) {
  return [
    "Запись удалена в админке",
    "",
    ...buildBookingLines(booking),
    "",
    `Источник: ${formatStorageMode(storageMode)}`,
  ].join("\n");
}

function buildTelegramTestMessage(storageMode: StorageMode) {
  return [
    "Тест Telegram интеграции",
    "",
    "Сообщение отправлено из админки Nail Diary.",
    `Время проверки: ${timestampFormatter.format(new Date())}`,
    `Текущий режим: ${formatStorageMode(storageMode)}`,
  ].join("\n");
}

async function readTelegramErrorDetails(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const data = (await response.json()) as TelegramApiResponse;
    return data.description?.trim() || `HTTP ${response.status}`;
  }

  const text = await response.text();
  return text.trim() || `HTTP ${response.status}`;
}

async function sendTelegramTextMessage(text: string): Promise<TelegramResult> {
  if (!hasTelegramConfig()) {
    return {
      delivered: false,
      reason: "missing_config",
    };
  }

  const { token, chatId } = getTelegramConfig();

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return {
        delivered: false,
        reason: "request_failed",
        details: await readTelegramErrorDetails(response),
      };
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const data = (await response.json()) as TelegramApiResponse;

      if (data.ok === false) {
        return {
          delivered: false,
          reason: "request_failed",
          details: data.description?.trim() || "Telegram returned ok=false.",
        };
      }
    }

    return {
      delivered: true,
    };
  } catch (error) {
    const details =
      error instanceof DOMException && error.name === "TimeoutError"
        ? `Telegram API timeout after ${TELEGRAM_REQUEST_TIMEOUT_MS / 1000} seconds.`
        : error instanceof Error
          ? error.message
          : "Unknown Telegram request error.";

    return {
      delivered: false,
      reason: "request_failed",
      details,
    };
  }
}

export function buildTelegramConfigErrorMessage(result: TelegramResult) {
  if (result.reason === "missing_config") {
    const { missingFields } = getTelegramConfigState();

    if (missingFields.length === 1) {
      return `Telegram не настроен. Заполни ${missingFields[0]}.`;
    }

    return "Telegram не настроен. Заполни TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID.";
  }

  const normalizedDetails = result.details?.toLowerCase() ?? "";

  if (normalizedDetails.includes("chat not found")) {
    return "Telegram не нашёл чат. Проверь TELEGRAM_CHAT_ID и напиши боту хотя бы одно сообщение.";
  }

  if (normalizedDetails.includes("bot was blocked by the user")) {
    return "Бот заблокирован пользователем. Разблокируй его и повтори отправку.";
  }

  if (
    normalizedDetails.includes("timeout") ||
    normalizedDetails.includes("timed out")
  ) {
    return "Telegram слишком долго отвечает. Попробуй ещё раз через пару секунд.";
  }

  return "Telegram вернул ошибку при отправке.";
}

export async function sendBookingCreatedNotification(
  booking: BookingRecord,
  storageMode: StorageMode,
) {
  return sendTelegramTextMessage(buildBookingCreatedMessage(booking, storageMode));
}

export async function sendBookingDeletedNotification(
  booking: BookingRecord,
  storageMode: StorageMode,
) {
  return sendTelegramTextMessage(buildBookingDeletedMessage(booking, storageMode));
}

export async function sendTelegramTestNotification(storageMode: StorageMode) {
  return sendTelegramTextMessage(buildTelegramTestMessage(storageMode));
}
