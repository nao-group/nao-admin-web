export type IncomeSource = "thinknao" | "studynao" | "grant" | "other";
export type IncomeStatus = "unpaid" | "paid" | "failed";
/** Invoice letterhead: product logo, or plain NAO Group for non-product income. */
export type InvoiceBrand = "thinknao" | "studynao" | "nao";

export type IncomeRow = {
  id: number;
  reference: string;
  source: IncomeSource;
  custom_source: string | null;
  invoice_url: string | null;
  invoice_file_path: string | null;
  occurred_at: string;
  payer: string;
  gross_amount: number;
  payment_method: string | null;
  doku_channel_id: string | null;
  fee_amount: number;
  net_amount: number;
  paid_amount: number;
  notes: string | null;
  status: IncomeStatus;
  synced_from_doku: boolean;
  payment_order_id: string | null;
  created_at: string;
  updated_at: string;
};

export type IncomeListResult = { items: IncomeRow[]; total: number; page: number; page_size: number };

export type IncomeOverview = {
  gross_revenue: number;
  net_revenue: number;
  doku_fees: number;
  to_be_paid: number;
  paid_count: number;
  unpaid_count: number;
  failed_count: number;
};

export type DokuFeeOption = {
  id: number;
  channel_id: string;
  method_label: string;
  percentage: number;
  fixed_amount: number;
  note: string | null;
};

export type IncomeWritePayload = {
  reference: string;
  source: IncomeSource;
  custom_source?: string | null;
  invoice_url?: string | null;
  occurred_at: string;
  payer: string;
  gross_amount: number;
  payment_method?: string | null;
  fee_amount: number;
  paid_amount: number;
  notes?: string | null;
  status: IncomeStatus;
};

export type IncomeListParams = {
  page: number;
  page_size: number;
  search?: string;
  source?: IncomeSource | null;
  status?: IncomeStatus | null;
  date_from?: string;
  date_to?: string;
  sort?: string;
};
