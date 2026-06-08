export function calculateUnpaid(
  rent: number,
  admFee: number,
  extraCharges: number[],
  concession: number,
  paid: number
): { totalDue: number; unpaid: number; status: 'paid' | 'partial' | 'pending' } {
  const totalDue =
    rent + admFee + extraCharges.reduce((sum, e) => sum + e, 0) - concession;
  const unpaid = Math.max(0, totalDue - paid);
  const status = paid >= totalDue ? 'paid' : paid > 0 ? 'partial' : 'pending';
  return { totalDue, unpaid, status };
}