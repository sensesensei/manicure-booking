"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type StatusState = {
  tone: "idle" | "error";
  message: string;
};

function normalizeServerErrorText(raw: string) {
  const normalized = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return normalized || "Сервер вернул пустой ответ. Попробуй ещё раз.";
}

async function readApiResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as { error?: string; success?: boolean };
  }

  return {
    error: normalizeServerErrorText(await response.text()),
  };
}

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<StatusState>({
    tone: "idle",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!password.trim()) {
      setStatus({
        tone: "error",
        message: "Введи пароль администратора.",
      });
      return;
    }

    setIsSubmitting(true);
    setStatus({
      tone: "idle",
      message: "",
    });

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
        }),
      });
      const data = await readApiResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Не удалось выполнить вход в админку.");
      }

      router.replace("/admin");
      router.refresh();
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Не удалось выполнить вход. Попробуй ещё раз.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-8 space-y-4" noValidate onSubmit={handleSubmit}>
      <label className="block">
        <span className="text-sm font-medium text-foreground">
          Пароль администратора
        </span>
        <input
          type="password"
          autoComplete="current-password"
          className="mt-2 w-full rounded-[18px] border border-card-border bg-white px-4 py-3 text-foreground outline-none placeholder:text-muted/65 focus:border-accent"
          placeholder="Введите пароль"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      {status.message ? (
        <div
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="rounded-[18px] border border-danger/25 bg-danger-soft px-4 py-3 text-sm leading-6 text-danger"
        >
          {status.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center rounded-[22px] bg-[#2d1d19] px-5 py-4 text-base font-semibold text-white shadow-[0_18px_34px_rgba(45,29,25,0.22)] disabled:cursor-not-allowed disabled:bg-[#8b746d]"
      >
        {isSubmitting ? "Вхожу..." : "Войти в админку"}
      </button>
    </form>
  );
}
