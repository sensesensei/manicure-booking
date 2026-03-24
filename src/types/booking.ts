import type { Slot } from "@/types/slot";

export type StorageMode = "supabase" | "demo";

export type BookingPayload = {
  clientName: string;
  phone: string;
  telegram: string;
  note?: string;
  bookingDate: string;
  bookingTime: string;
};

export type BookingRecord = BookingPayload & {
  id: string;
  createdAt: string;
};

export type BookingValidationResult = {
  data?: BookingPayload;
  errors: string[];
};

export type DayAvailabilityState = {
  date: string;
  isClosed: boolean;
  isDisabled: boolean;
  freeSlotsCount: number;
  totalSlotsCount: number;
};

export type DayAvailabilityConfig = {
  date: string;
  isClosed: boolean;
  usesDefaultSchedule: boolean;
  availableTimes: string[];
  bookedTimes: string[];
};

export type BookingsAvailabilityResponse = {
  date: string;
  slots: Slot[];
  storageMode: StorageMode;
};

export type AvailabilityWindowResponse = {
  start: string;
  duration: number;
  days: DayAvailabilityState[];
  storageMode: StorageMode;
};

export type AdminBookingsListResponse = {
  date: string;
  bookings: BookingRecord[];
  availability: DayAvailabilityConfig;
  storageMode: StorageMode;
};

export type BookingCreateResponse = {
  booking: BookingRecord;
  storageMode: StorageMode;
  telegramDelivered: boolean;
  telegramWarning?: string;
};

export type BookingDeleteResponse = {
  booking: BookingRecord;
  storageMode: StorageMode;
  telegramDelivered?: boolean;
  telegramWarning?: string;
};

export type DayAvailabilityUpdateResponse = {
  availability: DayAvailabilityConfig;
  storageMode: StorageMode;
};
