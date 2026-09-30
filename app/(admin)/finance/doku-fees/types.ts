export type DokuFeeRow = {
  id: number;
  channel_id: string;
  method_label: string;
  percentage: number;
  fixed_amount: number;
  note: string | null;
  updated_at: string;
};

export type DokuFeeWritePayload = {
  method_label: string;
  percentage: number;
  fixed_amount: number;
  note?: string | null;
};
