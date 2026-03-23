export type SlotStatus = "free" | "booked" | "past";

export type Slot = {
  time: string;
  label: string;
  status: SlotStatus;
  isDisabled: boolean;
};
