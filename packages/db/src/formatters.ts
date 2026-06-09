export function fmtCnic(cnic: string): string {
  const digits = cnic.replace(/\D/g, '');
  if (digits.length !== 13) return cnic;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export function fmtPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+92${digits.slice(1)}`;
  }
  return phone;
}