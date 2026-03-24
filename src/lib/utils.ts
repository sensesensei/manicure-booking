import { BOOKING_WINDOW_DAYS, WORKING_HOURS } from "@/constants";
import type {
  BookingPayload,
  BookingRecord,
  BookingValidationResult,
} from "@/types/booking";
import type { Slot } from "@/types/slot";

type InputRecord = Record<string, unknown>;

const dateLabelFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
});

const weekdayFormatter = new Intl.DateTimeFormat("ru-RU", {
  weekday: "short",
});

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeTelegram(value: string) {
  const trimmed = normalizeWhitespace(value)
    .replace(/^https?:\/\/t\.me\//i, "")
    .replace(/^https?:\/\/telegram\.me\//i, "")
    .replace(/^t\.me\//i, "")
    .replace(/^telegram\.me\//i, "")
    .trim();

  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  return withoutAt ? `@${withoutAt}` : "";
}

export function isValidTimeValue(value: string) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function sortTimes(times: string[]) {
  return [...times].sort((left, right) => left.localeCompare(right));
}

export function normalizeAvailableTimes(times: string[]) {
  const uniqueTimes = new Set(
    times.map((value) => value.trim()).filter((value) => isValidTimeValue(value)),
  );

  return sortTimes(Array.from(uniqueTimes));
}

export function areTimeSetsEqual(left: string[], right: string[]) {
  const normalizedLeft = normalizeAvailableTimes(left);
  const normalizedRight = normalizeAvailableTimes(right);

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
}

export function formatDateToISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function parseLocalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  parsed.setHours(0, 0, 0, 0);

  const isValid =
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day;

  return isValid ? parsed : null;
}

export function formatDateLabel(value: string) {
  const parsed = parseLocalDate(value);

  if (!parsed) {
    return value;
  }

  const weekday = weekdayFormatter.format(parsed);
  const label = dateLabelFormatter.format(parsed);
  return `${weekday}, ${label}`;
}

export function getUpcomingDays(count = BOOKING_WINDOW_DAYS) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  return Array.from({ length: count }, (_, offset) => {
    const current = new Date(start);
    current.setDate(start.getDate() + offset);

    return {
      value: formatDateToISO(current),
      dayLabel: current.getDate().toString().padStart(2, "0"),
      monthLabel: current.toLocaleDateString("ru-RU", {
        month: "short",
      }),
      weekdayLabel: weekdayFormatter.format(current),
      isToday: offset === 0,
    };
  });
}

export function addDaysToISODate(date: string, offset: number) {
  const parsed = parseLocalDate(date);

  if (!parsed) {
    throw new Error("Не удалось прибавить дни: дата должна быть в формате YYYY-MM-DD.");
  }

  const nextDate = new Date(parsed);
  nextDate.setDate(parsed.getDate() + offset);

  return formatDateToISO(nextDate);
}

export function isPastSlot(date: string, time: string) {
  const parsedDate = parseLocalDate(date);

  if (!parsedDate || !isValidTimeValue(time)) {
    return true;
  }

  const [hours, minutes] = time.split(":").map(Number);
  const candidate = new Date(parsedDate);
  candidate.setHours(hours, minutes, 0, 0);

  return candidate.getTime() <= Date.now();
}

export function buildSlots(
  date: string,
  bookings: BookingRecord[],
  availableTimes: string[] = [...WORKING_HOURS],
): Slot[] {
  const normalizedTimes = normalizeAvailableTimes(availableTimes);
  const bookedTimes = new Set(bookings.map((booking) => booking.bookingTime));

  return normalizedTimes.map((time) => {
    const status = bookedTimes.has(time)
      ? "booked"
      : isPastSlot(date, time)
        ? "past"
        : "free";

    return {
      time,
      label: time,
      status,
      isDisabled: status !== "free",
    };
  });
}

export function validateBookingInput(input: unknown): BookingValidationResult {
  if (!input || typeof input !== "object") {
    return {
      errors: ["Не удалось прочитать форму. Обнови страницу и попробуй снова."],
    };
  }

  const data = input as InputRecord;
  const clientName =
    typeof data.clientName === "string" ? normalizeWhitespace(data.clientName) : "";
  const phone = typeof data.phone === "string" ? normalizeWhitespace(data.phone) : "";
  const telegramRaw =
    typeof data.telegram === "string" ? normalizeWhitespace(data.telegram) : "";
  const telegram = normalizeTelegram(telegramRaw);
  const note = typeof data.note === "string" ? normalizeWhitespace(data.note) : "";
  const bookingDate =
    typeof data.bookingDate === "string" ? data.bookingDate.trim() : "";
  const bookingTime =
    typeof data.bookingTime === "string" ? data.bookingTime.trim() : "";

  const errors: string[] = [];

  if (clientName.length < 2) {
    errors.push("Укажи имя клиента минимум из двух символов.");
  }

  if (clientName.length > 80) {
    errors.push("Имя слишком длинное. Оставь до 80 символов.");
  }

  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 10) {
    errors.push("Укажи телефон, чтобы мастер мог подтвердить запись.");
  }

  if (phone.length > 30) {
    errors.push("Телефон выглядит слишком длинным. Проверь номер.");
  }

  if (!telegram) {
    errors.push("Укажи Telegram для связи.");
  } else if (!/^@[A-Za-z0-9_]{5,32}$/.test(telegram)) {
    errors.push("Укажи Telegram в формате @username или t.me/username.");
  }

  if (note.length > 240) {
    errors.push("Комментарий лучше сократить до 240 символов.");
  }

  const parsedDate = parseLocalDate(bookingDate);
  if (!parsedDate) {
    errors.push("Выбери дату из доступного диапазона.");
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + BOOKING_WINDOW_DAYS - 1);

    if (parsedDate < today || parsedDate > maxDate) {
      errors.push(`Дата должна быть в пределах ближайших ${BOOKING_WINDOW_DAYS} дней.`);
    }
  }

  if (!isValidTimeValue(bookingTime)) {
    errors.push("Выбери время в формате HH:MM.");
  }

  if (parsedDate && bookingTime && isPastSlot(bookingDate, bookingTime)) {
    errors.push("Это время уже прошло. Выбери другой слот.");
  }

  if (errors.length > 0) {
    return { errors };
  }

  const result: BookingPayload = {
    clientName,
    phone,
    telegram,
    bookingDate,
    bookingTime,
    ...(note ? { note } : {}),
  };

  return {
    data: result,
    errors: [],
  };
}
