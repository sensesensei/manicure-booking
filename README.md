# Nail Diary

Мини-приложение для самостоятельного мастера маникюра: клиент выбирает день и время, запись сохраняется через API, а уведомление о новой брони приходит в Telegram.

## Что уже есть

- Лендинг + форма записи на `src/app/page.tsx`.
- Слоты на 14 дней вперёд без двойных броней.
- Обязательные поля: имя, телефон, Telegram, дата и время.
- `GET /api/bookings` для загрузки занятых окон.
- `POST /api/bookings` для создания записи и отправки Telegram-уведомления.
- `POST /api/telegram` для отдельного теста Telegram-уведомления.
- Автоматический demo-режим, если Supabase ещё не настроен.

## Запуск

```bash
npm install
npm run dev
```

После запуска открой `http://localhost:3000`.

## Переменные окружения

Скопируй `.env.example` в `.env.local` и заполни значения:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

Если переменные Supabase не заполнены, проект будет работать в demo-режиме и хранить записи только в памяти процесса.

## Таблица Supabase

Создай таблицу `bookings` со следующими полями:

```sql
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  phone text not null,
  telegram text not null,
  note text,
  booking_date date not null,
  booking_time text not null,
  created_at timestamptz not null default now()
);

create unique index bookings_unique_slot
  on public.bookings (booking_date, booking_time);
```

Если таблица уже создана без поля `telegram`, добавь его:

```sql
alter table public.bookings
  add column telegram text not null default '@unknown';
```

Потом лучше обнови старые записи на реальные данные и при желании убери временный `default`.

Для MVP удобнее использовать `SUPABASE_SERVICE_ROLE_KEY` только на сервере, чтобы не усложнять настройку RLS на первом шаге.

## Telegram

1. Создай бота через `@BotFather`.
2. Получи `TELEGRAM_BOT_TOKEN`.
3. Узнай `chat_id` личного чата или канала.
4. После брони приложение вызовет Telegram Bot API и отправит карточку записи, включая Telegram клиента.

## Структура

```text
src/
  app/
    api/
      bookings/route.ts
      telegram/route.ts
    globals.css
    layout.tsx
    page.tsx
  components/
    booking-form.tsx
    slots-list.tsx
  constants/
    index.ts
  lib/
    supabase.ts
    supabase-server.ts
    telegram.ts
    utils.ts
  types/
    booking.ts
    slot.ts
```
