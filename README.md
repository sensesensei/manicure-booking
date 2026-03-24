# Nail Diary

Приложение для онлайн-записи на маникюр на базе Next.js. В проекте есть публичный лендинг с формой записи, защищенная админка, интеграция с Telegram и два режима хранения данных: `demo` и `supabase`.

## Что есть в проекте

- Публичная форма записи с выбором даты и времени.
- Окно записи на 14 дней вперед.
- Базовые слоты: `09:30`, `11:00`, `12:30`, `14:00`, `15:30`, `17:00`, `18:30`.
- Защита от двойных бронирований одного слота.
- Валидация имени, телефона, Telegram и даты/времени перед сохранением.
- Автоматический `demo`-режим, если Supabase еще не настроен.
- Защищенная админка с входом по паролю и cookie-сессией.
- Просмотр записей по дням, удаление записи и редактирование доступности дня.
- Telegram-уведомления о создании и удалении записи.

## Стек

- Next.js 16 (`App Router`)
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase REST API
- Telegram Bot API

## Быстрый старт

```bash
npm install
npm run dev
```

После запуска открой `http://localhost:3000`.

## Переменные окружения

Проект не использует `.env.example`, поэтому создай `.env.local` вручную.

Минимальный вариант для локальной разработки без базы:

```env
ADMIN_PASSWORD=change_me
ADMIN_SESSION_SECRET=change_me_too
```

В таком режиме приложение будет работать в `demo`-режиме: записи и изменения доступности хранятся только в памяти процесса и пропадут после перезапуска сервера.

Полный пример для Supabase, Telegram и админки:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_SECRET_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
```

Примечания:

- Для публичного ключа поддерживаются `NEXT_PUBLIC_SUPABASE_ANON_KEY` и `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`.
- Для серверного ключа поддерживаются `SUPABASE_SERVICE_ROLE_KEY` и `SUPABASE_SECRET_KEY`.
- Для реальной работы с текущими SQL-правами лучше указывать серверный ключ Supabase.
- `ADMIN_SESSION_SECRET` можно не задавать: тогда будет использован `ADMIN_PASSWORD`. Но для продакшена лучше хранить их раздельно.
- Если `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` не заполнены, запись все равно сохранится, а API вернет предупреждение вместо фатальной ошибки.

## Режимы работы

### `demo`

- Включается автоматически, если нет рабочей конфигурации Supabase.
- Подходит для верстки, локальной проверки UI и сценариев без базы.
- Данные не переживают перезапуск `next dev` или `next start`.

### `supabase`

- Включается после добавления переменных Supabase.
- Использует постоянное хранение записей и переопределений доступности дня.
- Нужен для нормальной работы админки и сохранения данных между перезапусками.

## Настройка Supabase

1. Создай проект в Supabase.
2. Выполни SQL из `supabase/bookings.sql`.
3. Добавь переменные окружения в `.env.local`.
4. Перезапусти dev-сервер.

Что создает `supabase/bookings.sql`:

- таблицу `bookings`
- уникальный индекс на `(booking_date, booking_time)`
- таблицу `availability_overrides`
- RLS и запрет прямого доступа для `anon` и `authenticated`

Если база была настроена раньше и не хватает только таблицы для редактирования доступности, выполни отдельно `supabase/availability-overrides.sql`.

Подробный гайд: `docs/supabase-setup.md`

## Настройка Telegram

Telegram нужен для уведомлений мастеру о новых и удаленных записях.

1. Создай бота через `@BotFather`.
2. Получи `TELEGRAM_BOT_TOKEN`.
3. Узнай `TELEGRAM_CHAT_ID`.
4. Добавь обе переменные в `.env.local`.
5. Перезапусти приложение и проверь создание/удаление записи.

Подробный гайд: `docs/telegram-setup.md`

## Админка

Маршруты:

- `/admin/login` - вход по `ADMIN_PASSWORD`
- `/admin` - список записей за выбранный день и управление доступностью

Что умеет админка:

- показывать записи по дате
- удалять запись
- закрывать день для новых записей
- вручную добавлять и убирать доступные слоты
- сбрасывать доступность к базовому расписанию

Сессия хранится в cookie `nail_admin_session` и живет 7 дней.

## API-маршруты

Публичные:

- `GET /api/availability?start=YYYY-MM-DD&duration=14` - календарь доступности
- `GET /api/bookings?date=YYYY-MM-DD` - слоты и занятость на выбранный день
- `POST /api/bookings` - создание записи

Админские:

- `POST /api/admin/session` - логин
- `DELETE /api/admin/session` - logout
- `GET /api/admin/bookings?date=YYYY-MM-DD` - записи и доступность дня
- `PUT /api/admin/availability` - обновление доступности дня
- `DELETE /api/admin/bookings/:bookingId` - удаление записи

## Команды

- `npm run dev` - локальная разработка
- `npm run build` - production build
- `npm run start` - запуск production build
- `npm run lint` - проверка ESLint

## Структура проекта

```text
docs/
  supabase-setup.md
  telegram-setup.md
supabase/
  availability-overrides.sql
  bookings.sql
src/
  app/
    admin/
    api/
      admin/
      availability/
      bookings/
    globals.css
    layout.tsx
    page.tsx
  components/
    admin-availability-editor.tsx
    admin-bookings-panel.tsx
    admin-login-form.tsx
    admin-logout-button.tsx
    booking-form.tsx
    site-header.tsx
    slots-list.tsx
  constants/
    index.ts
  lib/
    admin-auth.ts
    supabase-server.ts
    supabase.ts
    telegram.ts
    utils.ts
  types/
    booking.ts
    slot.ts
    telegram.ts
```

## Что важно помнить

- `demo`-режим удобен для интерфейса, но не для реальной записи клиентов.
- Без `ADMIN_PASSWORD` админка не будет доступна.
- Без таблицы `availability_overrides` нельзя сохранять изменения доступности дня из админки.
- Telegram-ошибка не отменяет сохранение записи, если сама запись уже создалась успешно.
