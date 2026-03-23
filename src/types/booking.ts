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

export type BookingsListResponse = {
  date: string;
  bookings: BookingRecord[];
  slots: Slot[];
  storageMode: StorageMode;
};

export type BookingCreateResponse = {
  booking: BookingRecord;
  storageMode: StorageMode;
  telegramDelivered: boolean;
  telegramWarning?: string;
};
