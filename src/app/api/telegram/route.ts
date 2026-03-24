import { NextResponse } from "next/server";
import { hasAdminPasswordConfig, hasAdminSession } from "@/lib/admin-auth";
import { hasSupabaseServerConfig } from "@/lib/supabase";
import {
  buildTelegramConfigErrorMessage,
  getTelegramConfigState,
  sendTelegramTestNotification,
} from "@/lib/telegram";
import type {
  TelegramStatusResponse,
  TelegramTestResponse,
} from "@/types/telegram";

async function authorizeAdminTelegramRoute() {
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

  return null;
}

function getStorageMode() {
  return hasSupabaseServerConfig() ? "supabase" : "demo";
}

export async function GET() {
  const authResponse = await authorizeAdminTelegramRoute();

  if (authResponse) {
    return authResponse;
  }

  const configState = getTelegramConfigState();
  const response: TelegramStatusResponse = {
    configured: configState.configured,
    missingFields: configState.missingFields,
    storageMode: getStorageMode(),
  };

  return NextResponse.json(response);
}

export async function POST() {
  const authResponse = await authorizeAdminTelegramRoute();

  if (authResponse) {
    return authResponse;
  }

  const result = await sendTelegramTestNotification(getStorageMode());
  const response: TelegramTestResponse = result.delivered
    ? {
        delivered: true,
      }
    : {
        delivered: false,
        error: buildTelegramConfigErrorMessage(result),
        ...(result.details ? { details: result.details } : {}),
      };

  return NextResponse.json(response, {
    status: result.delivered ? 200 : 503,
  });
}
