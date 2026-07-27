// Utilities to parse date strings as local dates to avoid 24h offset issues
export const parseDateLocal = (input?: string | null): Date | null => {
  if (!input) return null;
  // If it's already a timestamp or contains time information, let Date parse it
  if (/T|\d\d:\d\d|Z/i.test(input)) {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }

  // If input matches YYYY-MM-DD, construct a local Date to avoid timezone shift
  const m = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const day = Number(m[3]);
    const d = new Date(y, mo, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback to default parsing
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
};

export const parseDateLocalOrNow = (input?: string | null): Date => {
  const d = parseDateLocal(input);
  return d || new Date();
};
