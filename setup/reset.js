'use strict';

/**
 * Manual reset for the test database.
 * Run when you suspect leftover/orphan data from a crashed or killed test run
 * (e.g. "sorry, too many clients already", a suite failing only on a fresh
 * duplicate/conflict that a clean seed wouldn't produce):
 *
 *   npm run db:reset
 *
 * Deletes ALL child data belonging to the "Empresa Test" company (the one
 * setup/seed.js creates, ruc=TEST_RUC below) in FK-safe order, then re-runs
 * setup/seed.js to recreate the fixtures (users, tax rate, supplier, active
 * modules, etc.) from scratch.
 *
 * Deliberately scoped to just that one company — a blanket TRUNCATE of every
 * business table would also wipe the demo company ("Tienda Don Pepe",
 * ruc 1790012345001) and any other data loaded by seeds_tesis_v10.sql, which
 * some tests (e.g. auth.test.js's duplicate-ruc check) depend on existing.
 *
 * The companies row itself is left untouched (not deleted): every table has an
 * AFTER DELETE audit trigger that inserts into audit_logs(company_id), and
 * deleting the company row would make its own trigger violate the FK against
 * the row it just removed. seed.js's findOrCreate already reuses the existing
 * company id, so there's no need to delete and recreate it.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.test'), override: true });

const { sequelize } = require('../../pymeflowec-backend/src/config/database');

const TEST_RUC = '9999900000001';

// Safety guard: never run this against anything that isn't clearly the test DB.
if (!/test/i.test(process.env.DB_NAME || '')) {
  console.error(`[reset] Refusing to run: DB_NAME="${process.env.DB_NAME}" does not look like a test database.`);
  process.exit(1);
}

// Children first, respecting FK dependencies, all scoped by company_id.
// Every table here has an AFTER DELETE trigger that re-inserts a row into
// audit_logs, so audit_logs can't just be cleaned up first (it would leave
// the newly-inserted rows behind). It's placed right before `users` instead:
// that clears out any pre-existing rows whose user_id would otherwise block
// deleting users (fk_al_user) — new rows inserted by triggers from that point
// on carry user_id = NULL (no session user set here), so they can't block
// anything downstream.
const TABLES_BY_COMPANY = [
  'system_logs',
  'petty_cash_movements',
  'invoice_payments',
  'invoice_details',
  'inventory_movements',
  'invoices',
  'petty_cash',
  'expense_payments',
  'expense_budgets',
  'expense_recurring',
  'expenses',
  'expense_categories',
  'products',
  'product_categories',
  'suppliers',
  'tax_rates',
  'store_customers',
  'company_module_requests',
  'company_modules',
  'audit_logs',
  'users',
];

async function reset() {
  try {
    await sequelize.authenticate();
    console.log(`[reset] DB connection established — ${process.env.DB_NAME}@${process.env.DB_HOST}`);

    const [[company]] = await sequelize.query(
      'SELECT id FROM erp.companies WHERE ruc = :ruc',
      { replacements: { ruc: TEST_RUC } }
    );
    if (!company) {
      console.log('[reset] Test company not found yet — nothing to clean up.');
      return;
    }

    for (const table of TABLES_BY_COMPANY) {
      await sequelize.query(`DELETE FROM "erp"."${table}" WHERE company_id = :id`, {
        replacements: { id: company.id },
      });
    }

    console.log(`[reset] Wiped all child data for the test company (id=${company.id}, ruc=${TEST_RUC}).`);
  } catch (err) {
    console.error('[reset] Error:', err.message);
    process.exit(1);
  }
}

reset().then(() => {
  console.log('[reset] Re-seeding baseline fixtures...\n');
  require('./seed');
});
