'use strict';

/**
 * Seed script for the test database (schema v4).
 * Run once before integration tests:  npm run seed
 *
 * Prerequisites:
 *   1. CREATE DATABASE pymeflowec_test;
 *   2. psql -U postgres pymeflowec_test < schema_tesis_v4.sql
 *   3. psql -U postgres pymeflowec_test < seeds_tesis_v4.sql  (loads global roles & modules)
 *   4. Check .env.test (DB_NAME=pymeflowec_test)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.test'), override: true });

const bcrypt = require('bcryptjs');
const { sequelize } = require('../../pymeflowec-backend/src/config/database');
const {
  Company, Role, User, StoreCustomer, TaxRate, Supplier, CompanyModule, Module,
} = require('../../pymeflowec-backend/src/models');

const TEST_RUC = '9999900000001';

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('[seed] DB connection established.');

    // ── 1. Global roles (must exist from seeds_tesis_v4.sql) ────────────────────
    const roles = await Role.findAll();
    const roleMap = Object.fromEntries(roles.map(r => [r.name, r.id]));
    console.log('[seed] Roles found:', Object.keys(roleMap).join(', '));

    const required = ['PLATFORM_ADMIN', 'PLATFORM_SUPPORT', 'STORE_ADMIN', 'STORE_SELLER', 'STORE_WAREHOUSE'];
    for (const r of required) {
      if (!roleMap[r]) throw new Error(`Role "${r}" not found. Run seeds_tesis_v4.sql first.`);
    }

    // ── 2. Test company ──────────────────────────────────────────────────────────
    let company = await Company.findOne({ where: { ruc: TEST_RUC } });
    if (!company) {
      company = await Company.create({
        name:   'Empresa Test',
        ruc:    TEST_RUC,
        email:  'test@empresa.com',
        status: 'ACTIVE',
      });
      console.log(`[seed] Company created: id=${company.id}`);
    } else {
      console.log(`[seed] Company already exists: id=${company.id}`);
    }

    // ── 3. Consumidor Final (required per company) ───────────────────────────────
    const finalConsumer = await StoreCustomer.findOne({
      where: { company_id: company.id, customer_type: 'FINAL_CONSUMER' },
    });
    if (!finalConsumer) {
      await StoreCustomer.create({
        company_id:      company.id,
        customer_type:   'FINAL_CONSUMER',
        document_number: '9999999999999',
        full_name:       'Consumidor Final',
      });
      console.log('[seed] Consumidor Final created.');
    }

    // ── 4. Tax rate ──────────────────────────────────────────────────────────────
    const taxRate = await TaxRate.findOne({ where: { company_id: company.id, is_active: true } });
    if (!taxRate) {
      await TaxRate.create({
        company_id: company.id,
        tax_name:   'IVA 15%',
        percentage: 15.00,
        is_active:  true,
        valid_from: '2024-01-01',
      });
      console.log('[seed] TaxRate created.');
    }

    // ── 5. Test supplier ─────────────────────────────────────────────────────────
    const supplier = await Supplier.findOne({ where: { company_id: company.id } });
    if (!supplier) {
      await Supplier.create({
        company_id: company.id,
        name:       'Proveedor Test S.A.',
        ruc:        '1799900000001',
        email:      'prov@test.com',
      });
      console.log('[seed] Supplier created.');
    }

    // ── 6. Activate modules for test company (first 5 modules) ──────────────────
    const activeCodes = ['MOD_INVOICING', 'MOD_INVENTORY', 'MOD_PRODUCTS', 'MOD_SUPPLIERS', 'MOD_TAX'];
    const modules = await Module.findAll({ where: { is_active: true }, order: [['id', 'ASC']] });
    for (const mod of modules) {
      if (!activeCodes.includes(mod.code)) continue;
      const [cm] = await CompanyModule.findOrCreate({
        where:    { company_id: company.id, module_id: mod.id },
        defaults: { is_active: true },
      });
      if (!cm.is_active) await cm.update({ is_active: true });
    }
    console.log('[seed] Company modules activated.');

    // ── 7. Platform users (no company) ──────────────────────────────────────────
    const platformUsers = [
      { email: 'platform_admin@test.com',   full_name: 'Platform Admin Test',   password: 'PlatformAdmin2026!',   role: 'PLATFORM_ADMIN' },
      { email: 'platform_support@test.com', full_name: 'Platform Support Test', password: 'PlatformSupport2026!', role: 'PLATFORM_SUPPORT' },
    ];
    for (const pu of platformUsers) {
      const [user, created] = await User.findOrCreate({
        where: { email: pu.email },
        defaults: {
          full_name:     pu.full_name,
          password_hash: await bcrypt.hash(pu.password, 10),
          role_id:       roleMap[pu.role],
          company_id:    null,
          status:        'ACTIVE',
        },
      });
      if (!created) await user.update({ role_id: roleMap[pu.role], company_id: null, status: 'ACTIVE' });
      console.log(`[seed] ${pu.role}: ${pu.email} (new=${created})`);
    }

    // ── 8. Store users (belong to test company) ──────────────────────────────────
    const storeUsers = [
      { email: 'admin@test.com',     full_name: 'Admin Test',     password: 'Admin@1234',     role: 'STORE_ADMIN' },
      { email: 'seller@test.com',    full_name: 'Seller Test',    password: 'Seller@1234',    role: 'STORE_SELLER' },
      { email: 'warehouse@test.com', full_name: 'Warehouse Test', password: 'Warehouse@1234', role: 'STORE_WAREHOUSE' },
    ];
    for (const su of storeUsers) {
      const [user, created] = await User.findOrCreate({
        where: { email: su.email },
        defaults: {
          full_name:     su.full_name,
          password_hash: await bcrypt.hash(su.password, 10),
          role_id:       roleMap[su.role],
          company_id:    company.id,
          status:        'ACTIVE',
        },
      });
      if (!created) await user.update({ role_id: roleMap[su.role], company_id: company.id, status: 'ACTIVE' });
      console.log(`[seed] ${su.role}: ${su.email} (new=${created})`);
    }

    console.log('\n[seed] ✅ Test database ready.');
    console.log('[seed] Credentials:');
    console.log('  platform_admin@test.com    / PlatformAdmin2026!    (PLATFORM_ADMIN)');
    console.log('  platform_support@test.com  / PlatformSupport2026!  (PLATFORM_SUPPORT)');
    console.log('  admin@test.com             / Admin@1234             (STORE_ADMIN)');
    console.log('  seller@test.com            / Seller@1234            (STORE_SELLER)');
    console.log('  warehouse@test.com         / Warehouse@1234         (STORE_WAREHOUSE)');

    await sequelize.close();
  } catch (err) {
    console.error('[seed] Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

seed();
