/**
 * The student record — what the screen is allowed to render.
 *
 * Same rule as the roster's `contract.ts`: the page reads this and nothing else,
 * and every derived figure is computed once in `detail-presenter.ts`. On this
 * screen that matters more than on the roster, because four stat tiles sit above
 * a payment table and claim to summarise it. If the tiles and the rows are
 * derived in two places they will eventually disagree, and the operator has no
 * way to tell which one is lying.
 *
 * Field names are the screen's, not the API's. `GET /students/:id` speaks
 * snake_case; the mapping lives in the presenter.
 */

import type { StatusKey } from './contract';

/** One line in the Personal / Room panels. `value` is already formatted. */
export type DetailRow = {
  label: string;
  value: string;
  /** Render in the mono face — numbers, phone, CNIC. */
  mono?: boolean;
  /** True when the value is a dash: styles it as absent rather than as content. */
  absent?: boolean;
};

/** A pill beside the student's name in the hero. */
export type HeroPill = {
  label: string;
  /**
   * Grey unless the state is actionable. `DESIGN_RULES.md`: semantic colour is
   * reserved for states that demand an action, which is why Active is grey and
   * Cancelling is not.
   */
  tone: 'neutral' | 'attention' | 'negative';
  mono?: boolean;
};

export type PaymentRow = {
  id: string;
  /** `July 2026`. */
  month: string;
  rent: number;
  concession: number;
  paid: number;
  unpaid: number;
  admissionFee: number;
  extras: { label: string; amount: number }[];
  /** `Cash`, `JazzCash`… or null when no method was recorded. */
  method: string | null;
  status: string;
  statusLabel: string;
  /** The date money changed hands, or null for an unpaid record. */
  date: string | null;
  receipt: string | null;
};

export type StudentDetail = {
  id: string;
  name: string;
  initials: string;
  status: StatusKey;
  statusLabel: string;
  pills: HeroPill[];

  /** monthly_fee + mess_fee, the headline figure. */
  rentTotal: number;
  rentOnly: number;
  /** null means mess is not included — distinct from 0, "included, zero-rated". */
  messFee: number | null;

  /** The four stat tiles, in the order the design places them. */
  totalPaid: number;
  outstanding: number;
  joinDate: string;
  paymentsMade: number;

  personal: DetailRow[];
  room: DetailRow[];
  /** True when the student has no room — the room panel renders an empty state. */
  roomAssigned: boolean;

  payments: PaymentRow[];
  /** `Full payment history · 3 records`, built where the count is. */
  historyLabel: string;

  /** Whether a CNIC is on record at all. Drives the reveal control. */
  hasCnic: boolean;
  maskedCnic: string | null;

  /** An active student can be paid and edited; a vacated one is a record, not a resident. */
  active: boolean;
  vacateDate: string | null;
};

/** The Edit form's fields, prefilled from the record. */
export type StudentEditValues = {
  id: string;
  name: string;
  fatherName: string;
  phone: string;
  emergencyContact: string;
  email: string;
  address: string;
  nationality: string;
  course: string;
  monthlyFee: string;
  /** Empty string means "mess not included" — the form's own encoding of null. */
  messFee: string;
  status: StatusKey;
};

/**
 * `payment_method` values, as migration 003's CHECK constrains them, mapped to
 * the operator's spelling. An unrecognised value prints as itself rather than
 * disappearing — a method the schema gained and this map did not is a display
 * bug, not a reason to show a blank cell where money was counted.
 */
export const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  jazzcash: 'JazzCash',
  easypaisa: 'Easypaisa',
  bank: 'Bank',
  other: 'Other',
};

/** `payments.status`, as the operator reads it. */
export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  paid: 'Paid',
  partial: 'Partial',
  pending: 'Pending',
  void: 'Void',
};

/**
 * Nationalities offered by the forms.
 *
 * The column is free text, so this is a convenience, not a constraint — the list
 * comes from the design's own select and the values HOSTIX carries. A student
 * whose nationality is not among them keeps whatever is stored: the Edit form
 * adds the current value to the list rather than silently resetting it to
 * Pakistani, which is what a plain `<select>` over a fixed list would do.
 */
export const NATIONALITIES = ['Pakistani', 'Afghan', 'Bangladeshi', 'Iranian', 'Other'];
