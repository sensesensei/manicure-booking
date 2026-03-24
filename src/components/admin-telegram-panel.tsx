"use client";

import { useEffect, useState } from "react";
import type { StorageMode } from "@/types/booking";
import type {
  TelegramStatusResponse,
  TelegramTestResponse,
} from "@/types/telegram";

type StatusState = {
  tone: "idle" | "success" | "error";
  message: string;
  details?: string;
};

function normalizeServerErrorText(raw: string) {
  const normalized = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return normalized || "Сервер вернул пустой ответ. Попробуй ещё раз.";
}

async function readApiResponse<T>(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as T | { error?: string; details?: string };
  }

  return {
    error: normalizeServerErrorText(await response.text()),
  };
}

async function fetchTelegramStatus() {
  const response = await fetch("/api/telegram", {
    cache: "no-store",
  });
  const data = await readApiResponse<TelegramStatusResponse>(response);

  if (!response.ok || !("configured" in data)) {
    throw new Error(
      ("error" in data ? data.error : undefined) ??
        "Не удалось получить статус Telegram.",
    );
  }

  return data;
}

export function AdminTelegramPanel() {
  const [config, setConfig] = useState<TelegramStatusResponse | null>(null);
  const [status, setStatus] = useState<StatusState>({
    tone: "idle",
    message: "",
  });
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadStatus() {
      setIsLoadingConfig(true);

      try {
        const data = await fetchTelegramStatus();

        if (!isActive) {
          return;
        }

        setConfig(data);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setConfig(null);
        setStatus({
          tone: "error",
          message:
            error instanceof Error
              ? error.message
              : "Не удалось получить статус Telegram.",
        });
      } finally {
        if (isActive) {
          setIsLoadingConfig(false);
        }
      }
    }

    void loadStatus();

    return () => {
      isActive = false;
    };
  }, []);

  async function handleRefreshStatus() {
    setIsLoadingConfig(true);

    try {
      const data = await fetchTelegramStatus();
      setConfig(data);
      setStatus({
        tone: "idle",
        message: "",
      });
    } catch (error) {
      setConfig(null);
      setStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Не удалось получить статус Telegram.",
      });
    } finally {
      setIsLoadingConfig(false);
    }
  }

  async function handleSendTest() {
    setIsSending(true);
    setStatus({
      tone: "idle",
      message: "",
    });

    try {
      const response = await fetch("/api/telegram", {
        method: "POST",
      });
      const data = await readApiResponse<TelegramTestResponse>(response);

      if (!response.ok || !("delivered" in data) || !data.delivered) {
        setStatus({
          tone: "error",
          message:
            ("error" in data ? data.error : undefined) ??
            "Не удалось отправить тест в Telegram.",
          details: "details" in data ? data.details : undefined,
        });
        return;
      }

      setStatus({
        tone: "success",
        message: "Тестовое сообщение отправлено в Telegram.",
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Не удалось отправить тест в Telegram.",
      });
    } finally {
      setIsSending(false);
    }
  }

  const statusClassName =
    status.tone === "success"
      ? "border-success/25 bg-success-soft text-success"
      : status.tone === "error"
        ? "border-danger/25 bg-danger-soft text-danger"
        : "hidden";
  const storageMode: StorageMode = config?.storageMode ?? "demo";
  const isConfigured = config?.configured ?? false;
  const isSendDisabled = isSending || isLoadingConfig || !isConfigured;

  return (
    <section className="mt-8 rounded-[28px] border border-card-border bg-white/70 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">
            Telegram
          </p>
          <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <h2 className="text-2xl font-semibold text-foreground">
              Проверка уведомлений
            </h2>
            <span
              className={[
                "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                isConfigured
                  ? "border-success/20 bg-success-soft text-success"
                  : "border-danger/20 bg-danger-soft text-danger",
              ].join(" ")}
            >
              {isLoadingConfig
                ? "checking"
                : isConfigured
                  ? "configured"
                  : "not configured"}
            </span>
            <span
              className={[
                "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                storageMode === "demo"
                  ? "border-[#e7c4a0] bg-[#fff1e1] text-[#9a6236]"
                  : "border-success/20 bg-success-soft text-success",
              ].join(" ")}
            >
              {storageMode === "demo" ? "demo mode" : "supabase"}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">
            После клика в ваш Telegram-чат уйдёт тестовое сообщение. Так можно
            быстро проверить, что бот и chat id настроены правильно.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full border border-card-border bg-white/80 px-5 py-3 text-sm font-medium text-foreground hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            onClick={() => void handleRefreshStatus()}
            disabled={isLoadingConfig || isSending}
          >
            Обновить статус
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-[#2d1d19] px-5 py-3 text-sm font-medium text-white shadow-[0_14px_28px_rgba(45,29,25,0.18)] disabled:cursor-not-allowed disabled:bg-[#8b746d]"
            onClick={() => void handleSendTest()}
            disabled={isSendDisabled}
          >
            {isSending ? "Отправляю..." : "Отправить тест"}
          </button>
        </div>
      </div>

      {!isLoadingConfig && !isConfigured && config ? (
        <div className="mt-5 rounded-[18px] border border-danger/20 bg-danger-soft/70 px-4 py-3 text-sm leading-6 text-danger">
          <p className="font-medium">
            Telegram пока не настроен для отправки уведомлений.
          </p>
          <p className="mt-2">
            Добавь в <code>.env.local</code>:
            {" "}
            {config.missingFields.map((field) => (
              <code key={field} className="mr-2">
                {field}
              </code>
            ))}
          </p>
          <p className="mt-2 text-danger/80">
            После обновления переменных перезапусти сервер и снова открой админку.
          </p>
        </div>
      ) : null}

      {status.message ? (
        <div
          role={status.tone === "error" ? "alert" : "status"}
          aria-live={status.tone === "error" ? "assertive" : "polite"}
          aria-atomic="true"
          className={`mt-5 rounded-[18px] border px-4 py-3 text-sm leading-6 ${statusClassName}`}
        >
          <p>{status.message}</p>
          {status.details ? (
            <p className="mt-2 text-xs leading-5 opacity-80">
              Детали: {status.details}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
