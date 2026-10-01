import type { IncomeRow, IncomeSource } from "./income/types";

export type DashboardOverview = {
  income: number;
  net_income: number;
  expenses: number;
  to_be_paid: number;
};

export type DashboardCashflow = {
  labels: string[];
  gross_profit: number[];
  trend_pct: number | null;
};

export type RevenueBySource = {
  source: IncomeSource;
  label: string;
  value: number;
  percentage: number;
};

export type DashboardMonthlyControls = {
  revenue_this_month: { count: number; amount: number };
  pending_expenses: { count: number; amount: number };
  expense_trend_this_month: { paid: number; pending: number };
};

export type DashboardData = {
  overview: DashboardOverview;
  cashflow: DashboardCashflow;
  revenue_by_source: RevenueBySource[];
  recent_income: IncomeRow[];
  monthly_controls: DashboardMonthlyControls;
};
