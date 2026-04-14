-- Remove legacy "Settings → Demo Data" seed accounts and all related rows (employee FK cascades).
-- Safe if rows are missing (no-op).

DELETE FROM "User"
WHERE email IN (
  'demo.admin@uppearance.demo',
  'demo.employee@uppearance.demo'
);

DELETE FROM "Employee"
WHERE "workEmail" IN (
  'demo.admin@uppearance.demo',
  'demo.employee@uppearance.demo'
);
