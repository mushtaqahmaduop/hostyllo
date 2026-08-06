/**
 * Derivations shared by the roster and the student record.
 *
 * These were private to `presenter.ts` while the roster was the only screen
 * reading students. The record view needs the same avatar initials and the same
 * room meta line, and a second copy of `initials()` is a promise that the same
 * student will eventually show `AK` on one screen and `MA` on the other. One
 * definition, imported twice.
 *
 * Pure — no `server-only`, so a client component can use them too.
 */

import { STATUS_LABEL, type StatusKey } from './contract';

/**
 * `AK` from "Adnan Khan". First and last word rather than the first two, so
 * "Muhammad Adnan Khan" reads as MK and not MA — the shared first name is the
 * half that carries no information in a Pakistani roster.
 */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0][0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

/**
 * `4-Seater · Ground`. Both halves are optional and the separator only appears
 * between two present values, so a room with a capacity and no recorded floor
 * reads "4-Seater" rather than "4-Seater · ".
 *
 * The floor is printed exactly as stored. `rooms.floor` is free text, so a
 * hostel that typed "Ground Floor" gets "Ground Floor" — appending an "Fl" of
 * our own would produce "Ground Floor Fl" for that hostel and be wrong for any
 * hostel numbering its floors.
 */
export function roomMeta(capacity: number | null, floor: string | null): string | null {
  const parts: string[] = [];
  if (capacity && capacity > 0) parts.push(`${capacity}-Seater`);
  const f = blankToNull(floor);
  if (f) parts.push(f);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * Coerces the API's NUMERIC-or-number to a number, and anything absent to null.
 *
 * Null is preserved rather than folded to 0 because on this domain the two are
 * different facts: a null `mess_fee` means mess is not included, and 0 means
 * included and zero-rated (migration 014).
 */
export function num(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function isStatus(value: string): value is StatusKey {
  return value in STATUS_LABEL;
}
