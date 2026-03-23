import { formatDateLabel } from "@/lib/utils";
import type { BookingRecord, StorageMode } from "@/types/booking";

export type TelegramResult = {
  delivered: boolean;
  reason?: "missing_config" | "request_failed";
  details?: string;
};

function getTelegramConfig() {
  return {
    token: process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "",
    chatId: process.env.TELEGRAM_CHAT_ID?.trim() ?? "",
  };
}

export function hasTelegramConfig() {
  const { token, chatId } = getTelegramConfig();
  return Boolean(token && chatId);
}

function buildTelegramMessage(booking: BookingRecord, storageMode: StorageMode) {
  return [
    "Новая запись на маникюр",
    "",
    `Имя: ${booking.clientName}`,
    `Телефон: ${booking.phone}`,
    `Telegram: ${booking.telegram}`,
    `Дата: ${formatDateLabel(booking.bookingDate)}`,
    `Время: ${booking.bookingTime}`,
    booking.note ? `Комментарий: ${booking.note}` : null,
    storageMode === "demo" ? "" : null,
    storageMode === "demo" ? "Источник: demo-режим" : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function sendTelegramNotification(
  booking: BookingRecord,
  storageMode: StorageMode,
): Promise<TelegramResult> {
  if (!hasTelegramConfig()) {
    return {
      delivered: false,
      reason: "missing_config",
    };
  }

  const { token, chatId } = getTelegramConfig();

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: buildTelegramMessage(booking, storageMode),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      delivered: false,
      reason: "request_failed",
      details: await response.text(),
    };
  }

  return {
    delivered: true,
  };
}
