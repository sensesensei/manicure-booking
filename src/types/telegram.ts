import type { StorageMode } from "@/types/booking";

export type TelegramMissingField =
  | "TELEGRAM_BOT_TOKEN"
  | "TELEGRAM_CHAT_ID";

export type TelegramStatusResponse = {
  configured: boolean;
  missingFields: TelegramMissingField[];
  storageMode: StorageMode;
};

export type TelegramTestResponse = {
  delivered: boolean;
  error?: string;
  details?: string;
};
