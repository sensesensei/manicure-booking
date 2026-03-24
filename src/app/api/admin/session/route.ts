import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
  hasAdminPasswordConfig,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!hasAdminPasswordConfig()) {
    return NextResponse.json(
      {
        error:
          "Админ-пароль ещё не настроен. Добавь ADMIN_PASSWORD в .env.local и перезапусти сервер.",
      },
      { status: 503 },
    );
  }

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

  const password =
    body && typeof body === "object" && "password" in body && typeof body.password === "string"
      ? body.password
      : "";

  if (!verifyAdminPassword(password)) {
    return NextResponse.json(
      {
        error: "Неверный пароль администратора.",
      },
      { status: 401 },
    );
  }

  const response = NextResponse.json({
    success: true,
  });

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: createAdminSessionToken(),
    ...getAdminSessionCookieOptions(),
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({
    success: true,
  });

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    ...getAdminSessionCookieOptions(),
    maxAge: 0,
  });

  return response;
}
