'use strict';

/**
 * Script de siembra para la base de datos de test.
 * Ejecutar UNA SOLA VEZ antes de correr los tests de integración:
 *
 *   npm run seed
 *
 * Requisitos previos:
 *   1. Crear la BD:  CREATE DATABASE pymeflowec_test;
 *   2. Aplicar el schema v7:  psql -U postgres pymeflowec_test < schema_v8_full.sql
 *   3. Actualizar .env.test si es necesario (DB_NAME, DB_PASSWORD, etc.)
 *
 * NOTA: platform_roles y platform_modules ya vienen en el schema.
 * Este script solo crea: organización, usuarios y staff de plataforma.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.test'), override: true });

const bcrypt = require('bcryptjs');
const { sequelize } = require('../../pymeflowec-backend/src/config/database');
const { Organization, User, Role, PlatformStaff } =
  require('../../pymeflowec-backend/src/models');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('[seed] Conexión a BD de test establecida.');

    // ── 1. Organización de test ──────────────────────────────────────────────
    const [org, orgCreated] = await Organization.findOrCreate({
      where: { ruc: '9999999990001' },
      defaults: {
        name:   'Organización Test',
        ruc:    '9999999990001',
        email:  'org@test.com',
        status: 'active',
      },
    });
    console.log(`[seed] Organización: id=${org.id} (nueva=${orgCreated})`);

    // ── 2. Onboarding: crea roles, cliente genérico, categorías y activa
    //       módulos por defecto para la org. Solo si es nueva.
    if (orgCreated) {
      await sequelize.query(
        'SELECT onboard_organization(:orgId, NULL)',
        { replacements: { orgId: org.id } }
      );
      console.log('[seed] onboard_organization ejecutado.');
    } else {
      console.log('[seed] Organización ya existía – onboarding omitido.');
    }

    // ── 3. Buscar roles creados por onboarding para esta org ─────────────────
    const roles = await Role.findAll({ where: { organization_id: org.id } });
    const roleMap = Object.fromEntries(roles.map(r => [r.name, r.id]));
    console.log('[seed] Roles de la org:', JSON.stringify(roleMap));

    // Elegir el rol con más privilegios disponible para los usuarios de plataforma
    // (necesitan un role_id válido aunque no pertenezcan a la org)
    const adminRoleId = roleMap['admin'] ?? roleMap['Administrador'] ?? roles[0]?.id;
    if (!adminRoleId) throw new Error('No se encontró ningún rol para la org de test.');

    // ── 4. Usuario platform_admin (sin org, staff de plataforma can_write) ───
    const [platformAdmin] = await User.findOrCreate({
      where: { email: 'platform_admin@test.com' },
      defaults: {
        full_name:       'Platform Admin Test',
        email:           'platform_admin@test.com',
        password_hash:   await bcrypt.hash('PlatformAdmin2026!', 12),
        role_id:         adminRoleId,
        organization_id: null,
        status:          'active',
      },
    });
    await PlatformStaff.findOrCreate({
      where: { user_id: platformAdmin.id },
      defaults: {
        platform_role_id: 1, // platform_admin (can_write=true) – viene en el schema
        assigned_by:      null,
        is_active:        true,
      },
    });
    console.log(`[seed] Platform admin: id=${platformAdmin.id}`);

    // ── 5. Superadmin (sin org) ───────────────────────────────────────────────
    const [superadmin] = await User.findOrCreate({
      where: { email: 'superadmin@test.com' },
      defaults: {
        full_name:       'Super Admin Test',
        email:           'superadmin@test.com',
        password_hash:   await bcrypt.hash('SuperAdmin2026!', 12),
        role_id:         adminRoleId,
        organization_id: null,
        status:          'active',
      },
    });
    console.log(`[seed] Superadmin: id=${superadmin.id}`);

    // Los roles creados por onboard_organization se llaman:
    // "Administrador", "Vendedor", "Consulta"
    // ── 6. Admin de organización ──────────────────────────────────────────────
    const adminId = roleMap['Administrador'] ?? adminRoleId;
    const [admin] = await User.findOrCreate({
      where: { email: 'admin@test.com' },
      defaults: {
        full_name:       'Admin Test',
        email:           'admin@test.com',
        password_hash:   await bcrypt.hash('Admin@1234', 12),
        role_id:         adminId,
        organization_id: org.id,
        status:          'active',
      },
    });
    console.log(`[seed] Admin: id=${admin.id}, role="${Object.keys(roleMap).find(k => roleMap[k] === adminId)}"`);

    // ── 7. Seller ─────────────────────────────────────────────────────────────
    const sellerId = roleMap['Vendedor'] ?? adminRoleId;
    const [seller] = await User.findOrCreate({
      where: { email: 'seller@test.com' },
      defaults: {
        full_name:       'Seller Test',
        email:           'seller@test.com',
        password_hash:   await bcrypt.hash('Seller@1234', 12),
        role_id:         sellerId,
        organization_id: org.id,
        status:          'active',
      },
    });
    console.log(`[seed] Seller: id=${seller.id}, role="${Object.keys(roleMap).find(k => roleMap[k] === sellerId)}"`);

    // ── 8. Viewer ─────────────────────────────────────────────────────────────
    const viewerId = roleMap['Consulta'] ?? adminRoleId;
    const [viewer] = await User.findOrCreate({
      where: { email: 'viewer@test.com' },
      defaults: {
        full_name:       'Viewer Test',
        email:           'viewer@test.com',
        password_hash:   await bcrypt.hash('Viewer@1234', 12),
        role_id:         viewerId,
        organization_id: org.id,
        status:          'active',
      },
    });
    console.log(`[seed] Viewer: id=${viewer.id}, role="${Object.keys(roleMap).find(k => roleMap[k] === viewerId)}"`);

    console.log('\n[seed] ✅ Base de datos de test lista.');
    console.log('[seed] Credenciales:');
    console.log('  platform_admin@test.com  / PlatformAdmin2026!  (platform staff can_write)');
    console.log('  superadmin@test.com      / SuperAdmin2026!');
    console.log('  admin@test.com           / Admin@1234');
    console.log('  seller@test.com          / Seller@1234');
    console.log('  viewer@test.com          / Viewer@1234');

    await sequelize.close();
  } catch (err) {
    console.error('[seed] Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

seed();
