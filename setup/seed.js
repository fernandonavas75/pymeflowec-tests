'use strict';

/**
 * Script de siembra para la base de datos de test.
 * Ejecutar UNA SOLA VEZ antes de correr los tests de integración:
 *
 *   npm run seed
 *
 * Requisitos previos:
 *   1. Crear la BD:  CREATE DATABASE pymeflowec_test;
 *   2. Copiar el schema desde dev:
 *      pg_dump -s pymeflowec | psql pymeflowec_test
 *   3. Actualizar DB_PASSWORD en .env.test si es necesario.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.test'), override: true });

const bcrypt = require('bcryptjs');
const { sequelize } = require('../../pymeflowec-backend/src/config/database');
const { Role, Organization, User } = require('../../pymeflowec-backend/src/models');

const ROLES = [
  { id: 1, name: 'superadmin', description: 'Super administrador del sistema' },
  { id: 2, name: 'admin',      description: 'Administrador de organización' },
  { id: 3, name: 'manager',    description: 'Gerente' },
  { id: 4, name: 'seller',     description: 'Vendedor' },
  { id: 5, name: 'viewer',     description: 'Solo lectura' },
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('[seed] Conexión a BD de test establecida.');

    // 1. Crear roles
    for (const role of ROLES) {
      await Role.findOrCreate({ where: { id: role.id }, defaults: role });
    }
    console.log('[seed] Roles creados/verificados.');

    // 2. Crear organización de test
    const [org] = await Organization.findOrCreate({
      where: { ruc: '9999999990001' },
      defaults: {
        name:     'Organización Test',
        ruc:      '9999999990001',
        email:    'org@test.com',
        tax_rate: 0.12,
        status:   'active',
      },
    });
    console.log(`[seed] Organización de test: id=${org.id}`);

    // 3. Crear usuario superadmin (sin organización)
    const [superadmin] = await User.findOrCreate({
      where: { email: 'superadmin@test.com' },
      defaults: {
        full_name:    'Super Admin Test',
        email:        'superadmin@test.com',
        password_hash: await bcrypt.hash('SuperAdmin@123', 12),
        role_id:      1,
        organization_id: null,
        status:       'active',
      },
    });
    console.log(`[seed] Superadmin: id=${superadmin.id}`);

    // 4. Crear usuario admin en la org de test
    const [admin] = await User.findOrCreate({
      where: { email: 'admin@test.com' },
      defaults: {
        full_name:       'Admin Test',
        email:           'admin@test.com',
        password_hash:   await bcrypt.hash('Admin@1234', 12),
        role_id:         2,
        organization_id: org.id,
        status:          'active',
      },
    });
    console.log(`[seed] Admin: id=${admin.id}`);

    // 5. Crear usuario seller
    const [seller] = await User.findOrCreate({
      where: { email: 'seller@test.com' },
      defaults: {
        full_name:       'Seller Test',
        email:           'seller@test.com',
        password_hash:   await bcrypt.hash('Seller@1234', 12),
        role_id:         4,
        organization_id: org.id,
        status:          'active',
      },
    });
    console.log(`[seed] Seller: id=${seller.id}`);

    // 6. Crear usuario viewer
    const [viewer] = await User.findOrCreate({
      where: { email: 'viewer@test.com' },
      defaults: {
        full_name:       'Viewer Test',
        email:           'viewer@test.com',
        password_hash:   await bcrypt.hash('Viewer@1234', 12),
        role_id:         5,
        organization_id: org.id,
        status:          'active',
      },
    });
    console.log(`[seed] Viewer: id=${viewer.id}`);

    console.log('\n[seed] ✅ Base de datos de test lista.');
    console.log('[seed] Credenciales:');
    console.log('  superadmin@test.com / SuperAdmin@123');
    console.log('  admin@test.com      / Admin@1234');
    console.log('  seller@test.com     / Seller@1234');
    console.log('  viewer@test.com     / Viewer@1234');

    await sequelize.close();
  } catch (err) {
    console.error('[seed] Error:', err.message);
    process.exit(1);
  }
}

seed();
