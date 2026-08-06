import 'server-only';

import { api } from '@/lib/api';
import { EM_DASH, formatAmount, formatDate } from '@/lib/format';
import { blankToNull, initials, isStatus, num, roomMeta } from './derive';
import { STATUS_LABEL } from './contract';
import {
  METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  type DetailRow,
  type HeroPill,
  type PaymentRow,
  type StudentDetail,
  type StudentEditValues,
} from './detail-contract';

/**
 * Builds the student record from `GET /students/:id`.
 *
 * One request, one owner of every figure. The four stat tiles and the payment
 * table are the same data twice — the tiles are the API's SQL sums over exactly
 * the rows it returned — so they cannot drift the way a client-side re-total
 * would the first time a row was filtered out of one and not the other.
 */

/** The API's shape, verbatim. Renamed on the way out, never on the way in. */
type ApiPayment = {
  payment_id: string;
  payment_month: string;
  status: string;
  rent_pkr: number | string;
  concession_pkr: number | string;
  admission_fee_pkr: number | string;
  total_due_pkr: number | string;
  amount_paid_pkr: number | string;
  unpaid_pkr: number | string;
  payment_method: string | null;
  payment_date: string | null;
  receipt_id: string | null;
  extras: { label: string; amount: number | string }[] | null;
};

type ApiStudent = {
  id: string;
  full_name: string;
  father_name: string | null;
  phone: string | null;
  emergency_contact: string | null;
  email: string | null;
  address: string | null;
  status: string;
  join_date: string | null;
  vacate_date: string | null;
  monthly_fee: number | string;
  mess_fee: number | string | null;
  admission_fee: number | string;
  nationality: string | null;
  course: string | null;
  room_id: string | null;
  room_number: string | null;
  room_floor: string | null;
  room_type: string | null;
  room_capacity: number | null;
  bed_label: string | null;
  masked_cnic: string | null;
  total_paid_pkr: number | string;
  outstanding_pkr: number | string;
  payments_made: number;
  payments_total: number;
  payments: ApiPayment[] | null;
};

export async function getStudentDetail(id: string): Promise<StudentDetail> {
  return present(await api<ApiStudent>(`/students/${id}`));
}

/**
 * The same request, reduced to the Edit form's fields.
 *
 * A second call rather than a second endpoint: the record is small, and the
 * alternative — threading the presented view into the form — would mean the form
 * reads display strings ("PKR 8,000") where it needs raw values.
 */
export async function getStudentEditValues(id: string): Promise<StudentEditValues> {
  const s = await api<ApiStudent>(`/students/${id}`);
  const messFee = num(s.mess_fee);

  return {
    id: s.id,
    name: s.full_name,
    fatherName: s.father_name ?? '',
    phone: s.phone ?? '',
    emergencyContact: s.emergency_contact ?? '',
    email: s.email ?? '',
    address: s.address ?? '',
    nationality: s.nationality ?? '',
    course: s.course ?? '',
    monthlyFee: String(num(s.monthly_fee) ?? 0),
    // Empty string, not "0" — the form encodes "mess not included" as a blank box,
    // and a null that arrived as "0" would be saved back as an included zero-rated
    // mess, quietly changing what the record says.
    messFee: messFee === null ? '' : String(messFee),
    status: isStatus(s.status) ? s.status : 'active',
  };
}

function present(s: ApiStudent): StudentDetail {
  const status = isStatus(s.status) ? s.status : 'active';
  const rentOnly = num(s.monthly_fee) ?? 0;
  const messFee = num(s.mess_fee);
  const meta = roomMeta(s.room_capacity, s.room_floor);
  const nationality = blankToNull(s.nationality);

  /*
   * The hero pills.
   *
   * The design also shows a payment-method pill reading "Cash". `students` has no
   * payment-method column — HOSTIX carries `t.paymentMethod` on the student and
   * Hostyllo records the method per payment instead, which is the better model
   * (a student can pay cash one month and by bank the next). Taking the most
   * recent payment's method and printing it beside the name would state it as a
   * property of the student, which is a different and unsupported claim. Omitted.
   */
  const pills: HeroPill[] = [
    { label: STATUS_LABEL[status], tone: pillTone(status) },
  ];
  if (s.room_number) {
    pills.push({ label: meta ? `Room ${s.room_number} · ${meta}` : `Room ${s.room_number}`, tone: 'neutral', mono: true });
  }
  if (nationality) pills.push({ label: nationality, tone: 'neutral' });

  const personal: DetailRow[] = [
    row('Father / guardian', s.father_name),
    row('Occupation / course', s.course),
    row('Nationality', nationality),
    row('Phone number', s.phone, { mono: true }),
    row('Email address', s.email),
    row('Emergency contact', s.emergency_contact, { mono: true }),
    row('Home address', s.address),
  ];

  /*
   * The room panel.
   *
   * The design lists Amenities and Room notes. `rooms` has neither column —
   * no amenities, no notes — so both are omitted rather than printed with a
   * plausible "Fan, Bed, Wardrobe" or a confident "None" that would mean "we
   * never asked" while reading as "there are none". Adding them is a schema
   * change, not a UI one.
   */
  const room: DetailRow[] = s.room_number
    ? [
        row('Room number', `#${s.room_number}`, { mono: true }),
        row('Room type', s.room_capacity ? `${s.room_capacity}-Seater` : null),
        row('Floor', s.room_floor),
        row('Bed', s.bed_label),
        row('Capacity', s.room_capacity ? `${s.room_capacity} beds` : null),
        row(
          'Mess',
          messFee === null ? 'Not included' : `Included · PKR ${formatAmount(messFee)}/mo`,
        ),
      ]
    : [];

  const payments = (s.payments ?? []).map(presentPayment);
  const count = s.payments_total ?? payments.length;

  return {
    id: s.id,
    name: s.full_name,
    initials: initials(s.full_name),
    status,
    statusLabel: STATUS_LABEL[status],
    pills,

    rentOnly,
    messFee,
    rentTotal: rentOnly + (messFee ?? 0),

    totalPaid: num(s.total_paid_pkr) ?? 0,
    outstanding: num(s.outstanding_pkr) ?? 0,
    joinDate: formatDate(s.join_date),
    paymentsMade: s.payments_made ?? 0,

    personal,
    room,
    roomAssigned: Boolean(s.room_number),

    payments,
    historyLabel: `Full payment history · ${count} record${count === 1 ? '' : 's'}`,

    hasCnic: Boolean(s.masked_cnic),
    maskedCnic: blankToNull(s.masked_cnic),

    active: status === 'active',
    vacateDate: s.vacate_date ? formatDate(s.vacate_date) : null,
  };
}

function presentPayment(p: ApiPayment): PaymentRow {
  const method = blankToNull(p.payment_method);

  return {
    id: p.payment_id,
    month: formatMonth(p.payment_month),
    rent: num(p.rent_pkr) ?? 0,
    concession: num(p.concession_pkr) ?? 0,
    paid: num(p.amount_paid_pkr) ?? 0,
    unpaid: num(p.unpaid_pkr) ?? 0,
    admissionFee: num(p.admission_fee_pkr) ?? 0,
    extras: (p.extras ?? []).map((e) => ({ label: e.label, amount: num(e.amount) ?? 0 })),
    // An unmapped method prints as stored rather than vanishing — see METHOD_LABEL.
    method: method ? (METHOD_LABEL[method] ?? method) : null,
    status: p.status,
    statusLabel: PAYMENT_STATUS_LABEL[p.status] ?? p.status,
    date: p.payment_date ? formatDate(p.payment_date) : null,
    receipt: blankToNull(p.receipt_id),
  };
}

/**
 * Status → pill tone. Grey unless the state is actionable, which is the rule the
 * roster already follows: Active is nine rows in ten and colouring it drowns the
 * two that need a decision.
 */
function pillTone(status: string): HeroPill['tone'] {
  if (status === 'vacating') return 'attention';
  if (status === 'blacklisted') return 'negative';
  return 'neutral';
}

function row(label: string, value: string | null | undefined, opts: { mono?: boolean } = {}): DetailRow {
  const clean = blankToNull(value);
  return {
    label,
    value: clean ?? EM_DASH,
    mono: clean ? opts.mono : undefined,
    absent: !clean,
  };
}

/** `payments.month` is a DATE pinned to the 1st; only the month is meaningful. */
function formatMonth(value: string | null): string {
  if (!value) return EM_DASH;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return EM_DASH;
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
}
