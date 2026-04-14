/** Emails / display names from the removed in-app “demo data” workspace seed. */
const LEGACY_DEMO_WORK_EMAILS = new Set([
  'demo.admin@uppearance.demo',
  'demo.employee@uppearance.demo',
]);

const LEGACY_DEMO_FULL_NAMES = new Set(['demo admin', 'demo employee']);

export function isLegacyDemoEmployee(row: { workEmail?: string | null; fullName?: string | null }) {
  const email = (row.workEmail ?? '').trim().toLowerCase();
  if (email && LEGACY_DEMO_WORK_EMAILS.has(email)) return true;
  const name = (row.fullName ?? '').trim().toLowerCase();
  if (LEGACY_DEMO_FULL_NAMES.has(name)) return true;
  if (/\(demo\)/i.test(row.fullName ?? '')) return true;
  return false;
}

export function filterOutLegacyDemoEmployees<T extends { fullName: string; workEmail?: string | null }>(
  list: T[],
): T[] {
  return list.filter((e) => !isLegacyDemoEmployee(e));
}
