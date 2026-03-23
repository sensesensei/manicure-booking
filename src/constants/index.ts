export const APP_NAME = "Nail Diary";
export const BOOKINGS_TABLE = "bookings";
export const BOOKING_WINDOW_DAYS = 14;

export const WORKING_HOURS = [
  "09:30",
  "11:00",
  "12:30",
  "14:00",
  "15:30",
  "17:00",
  "18:30",
] as const;

export const HIGHLIGHT_METRICS = [
  {
    label: "Горизонт записи",
    value: "14 дней",
    description: "Клиент видит только ближайшие окна и не уходит в долгие переписки.",
  },
  {
    label: "Уведомления",
    value: "Telegram",
    description: "Новая запись приходит сообщением в твой чат сразу после брони.",
  },
  {
    label: "Режим хранения",
    value: "Supabase / demo",
    description: "Можно смотреть интерфейс без базы, а потом подключить постоянное хранилище.",
  },
] as const;

export const FEATURE_LIST = [
  "Выбор даты и времени без двойных броней.",
  "Валидация имени, телефона и комментария перед отправкой.",
  "API-маршрут для сохранения записи и отдельный маршрут для Telegram.",
  "Автоматический demo-режим, если ключи Supabase пока не добавлены.",
] as const;

export const PROCESS_STEPS = [
  {
    title: "1. Клиент выбирает слот",
    description: "Форма показывает только доступные окна и блокирует уже занятое время.",
  },
  {
    title: "2. Бронь сохраняется",
    description: "Запись уходит в Supabase, а при отсутствии настроек проект работает в demo-режиме.",
  },
  {
    title: "3. Telegram сообщает о брони",
    description: "Мастер сразу видит имя, телефон, дату, время и комментарий клиента.",
  },
] as const;
