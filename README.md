# pymeflowec-tests

Suite de pruebas automatizadas para el sistema **PymeFlowEc** — plataforma ERP SaaS multi-tenant orientada a pequeñas y medianas empresas ecuatorianas. Este repositorio forma parte del trabajo de titulación de la carrera de Ingeniería en Software en la **Pontificia Universidad Catolica del Ecuador (PUCE)**.

---

## Tabla de Contenidos

1. [Descripción General](#1-descripción-general)
2. [Arquitectura del Sistema bajo Prueba](#2-arquitectura-del-sistema-bajo-prueba)
3. [Estructura del Repositorio](#3-estructura-del-repositorio)
4. [Stack de Pruebas](#4-stack-de-pruebas)
5. [Módulos Cubiertos](#5-módulos-cubiertos)
6. [Control de Acceso y Roles](#6-control-de-acceso-y-roles)
7. [Infraestructura de Pruebas](#7-infraestructura-de-pruebas)
8. [Requisitos Previos](#8-requisitos-previos)
9. [Configuración e Instalación](#9-configuración-e-instalación)
10. [Variables de Entorno](#10-variables-de-entorno)
11. [Ejecución de Pruebas](#11-ejecución-de-pruebas)
12. [Reportes](#12-reportes)
13. [Decisiones de Diseño](#13-decisiones-de-diseño)
14. [Resultados Obtenidos](#14-resultados-obtenidos)

---

## 1. Descripción General

Este repositorio contiene la capa de verificación automatizada del backend de PymeFlowEc, separada intencionalmente del código fuente principal para mantener independencia entre la implementación y la verificación. La suite cubre dos niveles de prueba complementarios:

| Nivel | Framework | Descripción |
|---|---|---|
| **Unitario** | Jest 29 | Pruebas aisladas de la capa de servicios con todas las dependencias externas simuladas mediante mocks |
| **Integración** | Jest 29 + Supertest | Pruebas del flujo HTTP completo (Router → Middleware → Controller → Service → Base de datos) contra una instancia PostgreSQL dedicada |

**Total de pruebas: 439** (200 unitarias + 239 de integración), todas con resultado `PASS`.

---

## 2. Arquitectura del Sistema bajo Prueba

```
pymeflowec-backend/          ← Código fuente del backend (Node.js / Express / Sequelize)
pymeflowec-tests/            ← Este repositorio
  ├── unit/                  ← Pruebas unitarias — sin I/O real
  ├── integration/           ← Pruebas de integración — HTTP + PostgreSQL
  ├── setup/                 ← Scripts de inicialización y semilla de datos
  ├── jest.config.js         ← Configuración multi-proyecto de Jest
  └── .env.test              ← Variables de entorno exclusivas del entorno de prueba
```

El backend sigue una **arquitectura en capas**:

```
Router → Middleware (autenticación / autorización / validación) → Controller → Service → Model (Sequelize) → PostgreSQL
```

- Las **pruebas unitarias** verifican la capa de **Service** de forma aislada: toda dependencia externa (base de datos, bcrypt, JWT, correo) es reemplazada por una implementación simulada con `jest.fn()` o `jest.mock()`.
- Las **pruebas de integración** verifican el flujo completo desde el **Router** hasta la base de datos, ejecutando peticiones HTTP reales a la aplicación Express mediante Supertest.

---

## 3. Estructura del Repositorio

```
pymeflowec-tests/
├── unit/                                 ← 21 archivos · 200 pruebas
│   ├── helpers/
│   │   └── mocks.js                      ← Fábricas de objetos mock (User, Company, Role, Product, Invoice, etc.)
│   ├── auth.service.test.js              ← 16 casos
│   ├── client.service.test.js            ← 8 casos
│   ├── expense.service.test.js           ← 11 casos
│   ├── expenseBudget.service.test.js     ← 10 casos
│   ├── expenseCategory.service.test.js   ← 8 casos
│   ├── expensePayment.service.test.js    ← 9 casos
│   ├── expenseRecurring.service.test.js  ← 9 casos
│   ├── inventoryMovement.service.test.js ← 6 casos
│   ├── invoice.service.test.js           ← 8 casos
│   ├── invoicePayment.service.test.js    ← 9 casos
│   ├── jest-config.test.js               ← 22 casos
│   ├── moduleRequest.service.test.js     ← 9 casos
│   ├── order.service.test.js             ← 8 casos
│   ├── pettyCash.service.test.js         ← 12 casos
│   ├── platformModule.service.test.js    ← 7 casos
│   ├── platformStaff.service.test.js     ← 6 casos
│   ├── product.service.test.js           ← 12 casos
│   ├── productCategory.service.test.js   ← 10 casos
│   ├── role.service.test.js              ← 4 casos
│   ├── supplier.service.test.js          ← 5 casos
│   └── user.service.test.js              ← 11 casos
│
├── integration/                          ← 15 archivos · 239 pruebas
│   ├── helpers/
│   │   └── auth.js                       ← getToken(role): obtiene un JWT válido por nombre de rol
│   ├── auth.test.js                      ← 18 casos
│   ├── clients.test.js                   ← 12 casos
│   ├── expenseCategories.test.js         ← 18 casos
│   ├── expenses.test.js                  ← 20 casos
│   ├── inventoryMovements.test.js        ← 12 casos
│   ├── invoicePayments.test.js           ← 11 casos
│   ├── invoices.test.js                  ← 16 casos
│   ├── moduleRequests.test.js            ← 13 casos
│   ├── pettyCash.test.js                 ← 17 casos
│   ├── platformModules.test.js           ← 10 casos
│   ├── platformStaff.test.js             ← 12 casos
│   ├── productCategories.test.js         ← 18 casos
│   ├── products.test.js                  ← 30 casos
│   ├── suppliers.test.js                 ← 12 casos
│   └── users.test.js                     ← 20 casos
│
├── setup/
│   ├── factories.js                      ← Creación y limpieza de datos para integración (12 recursos)
│   ├── loadEnv.js                        ← Carga .env.test antes de cada suite de integración
│   └── seed.js                           ← Script de semilla idempotente (npm run seed)
│
├── html-report/                          ← Reporte HTML generado (no se versiona)
├── jest.config.js
├── package.json
└── .env.test
```

---

## 4. Stack de Pruebas

| Tecnología | Versión | Propósito |
|---|---|---|
| **Jest** | 29.7.0 | Framework de pruebas: ejecución, aserciones y sistema de mocks |
| **Supertest** | 7.0.0 | Cliente HTTP para probar endpoints Express sin abrir un puerto real |
| **jest-html-reporters** | 3.1.7 | Generación de reporte HTML con resultados detallados |
| **Node.js** | >= 18 | Entorno de ejecución de las pruebas |
| **PostgreSQL** | >= 14 | Base de datos dedicada para el entorno de prueba (`pymeflowec_test`) |

---

## 5. Módulos Cubiertos

### Pruebas Unitarias (`unit/`)

Las pruebas unitarias verifican la lógica de negocio de cada servicio de forma aislada. Las dependencias externas son sustituidas por mocks de Jest:

- **Base de datos (Sequelize)** → funciones `jest.fn()` que controlan las respuestas de los modelos
- **bcryptjs** → hash y comparación de contraseñas simulados
- **jsonwebtoken** → firma y verificación de tokens simuladas
- **Logger (Winston)** → silenciado durante las pruebas
- **Nodemailer** → envío de correo simulado

| Archivo | Servicio probado | Casos |
|---|---|---|
| `auth.service.test.js` | Autenticación (login, refresh, registro, cambio de contraseña) | 16 |
| `user.service.test.js` | Gestión de usuarios de empresa (CRUD, estado, contraseña) | 11 |
| `product.service.test.js` | Productos (crear, ajuste de inventario, estado, eliminar) | 12 |
| `productCategory.service.test.js` | Categorías de productos (crear, listar, actualizar) | 10 |
| `invoice.service.test.js` | Facturación (crear, cancelar, numeración correlativa) | 8 |
| `invoicePayment.service.test.js` | Cobros de facturas (registrar, anular, recalcular estado) | 9 |
| `expense.service.test.js` | Egresos operacionales (crear, anular, actualizar) | 11 |
| `expenseCategory.service.test.js` | Categorías de egreso | 8 |
| `expensePayment.service.test.js` | Pagos de egresos | 9 |
| `expenseBudget.service.test.js` | Presupuestos de gasto por categoría | 10 |
| `expenseRecurring.service.test.js` | Egresos recurrentes periódicos (plantillas y generación) | 9 |
| `inventoryMovement.service.test.js` | Movimientos de inventario (IN / OUT / ADJUSTMENT) | 6 |
| `pettyCash.service.test.js` | Caja chica (sesiones, movimientos EXPENSE / REPLENISH) | 12 |
| `moduleRequest.service.test.js` | Solicitudes de módulos (crear, aprobar, rechazar) | 9 |
| `platformModule.service.test.js` | Catálogo de módulos de la plataforma | 7 |
| `platformStaff.service.test.js` | Usuarios de soporte de plataforma | 6 |
| `role.service.test.js` | Consulta y asignación de roles por ámbito | 4 |
| `supplier.service.test.js` | Proveedores (crear, actualizar, eliminar) | 5 |
| `client.service.test.js` | Clientes y consumidor final | 8 |
| `order.service.test.js` | Órdenes de venta | 8 |
| `jest-config.test.js` | Verificación de la configuración de Jest | 22 |

**Total unitario: 200 pruebas · Tiempo de ejecución:** menor a 2 segundos.

### Pruebas de Integración (`integration/`)

Las pruebas de integración levantan la aplicación Express completa mediante Supertest y la conectan a la base de datos de prueba. Verifican el comportamiento real de cada endpoint, incluyendo autenticación, autorización por rol y lógica de negocio extremo a extremo.

| Archivo | Endpoints cubiertos | Casos |
|---|---|---|
| `auth.test.js` | `POST /login`, `GET /me`, `POST /refresh`, `POST /register`, `PATCH /change-password` | 18 |
| `clients.test.js` | `GET/POST /customers`, `PUT/DELETE /customers/:id` | 12 |
| `suppliers.test.js` | `GET/POST /suppliers`, `PUT/DELETE /suppliers/:id` | 12 |
| `productCategories.test.js` | `GET/POST/PUT/DELETE /product-categories` | 18 |
| `platformStaff.test.js` | `GET/POST /platform/users`, desactivar, roles de soporte | 12 |
| `platformModules.test.js` | `GET /platform/modules` (catálogo, detalle, activación) | 10 |
| `moduleRequests.test.js` | `GET/POST /module-requests`, aprobar, rechazar | 13 |
| `products.test.js` | `GET/POST/PUT/DELETE /products`, ajuste de stock, activar/desactivar, bulk | 30 |
| `users.test.js` | `GET/POST/PUT/DELETE /users`, activar/desactivar/bloquear, forgot-password | 20 |
| `invoices.test.js` | `GET/POST /invoices`, `GET /:id`, `PATCH /:id/cancel` | 16 |
| `invoicePayments.test.js` | `GET/POST /invoice-payments`, `GET /:id`, `PATCH /:id/annul` | 11 |
| `expenses.test.js` | `GET/POST/PUT /expenses`, `GET /:id`, `PATCH /:id/annul` | 20 |
| `expenseCategories.test.js` | `GET/POST/PUT/DELETE /expense-categories` | 18 |
| `inventoryMovements.test.js` | `GET /inventory-movements`, `POST` (IN / OUT / ADJUSTMENT) | 12 |
| `pettyCash.test.js` | Abrir/cerrar sesión, movimientos EXPENSE / REPLENISH, sesión concurrente | 17 |

**Total integración: 239 pruebas · Tiempo de ejecución:** 25–35 segundos (incluye round-trips a la base de datos).

---

## 6. Control de Acceso y Roles

El sistema implementa un esquema **RBAC** (*Role-Based Access Control*) con cinco roles predefinidos. Las pruebas de integración verifican el comportamiento correcto de autorización para cada uno:

| Rol | Ámbito | Capacidades |
|---|---|---|
| `PLATFORM_ADMIN` | PLATFORM | Gestión global de módulos, empresas y usuarios de soporte |
| `PLATFORM_SUPPORT` | PLATFORM | Acceso de solo lectura a datos de plataforma |
| `STORE_ADMIN` | STORE | Control total de la empresa (clientes, proveedores, productos, facturas, gastos) |
| `STORE_SELLER` | STORE | Acceso de lectura y creación de facturas y clientes |
| `STORE_WAREHOUSE` | STORE | Acceso restringido al inventario y movimientos de stock |

Cada suite de integración ejecuta los mismos endpoints con tokens JWT de distintos roles para verificar que:

- Solicitudes sin token reciben **`401 Unauthorized`**
- Usuarios con rol insuficiente reciben **`403 Forbidden`**
- Usuarios con el rol correcto obtienen la respuesta esperada (`200 OK`, `201 Created`, etc.)
- Usuarios de una empresa no pueden acceder a datos de otra empresa (aislamiento multi-tenant)

La función `getToken(role)` en `integration/helpers/auth.js` automatiza la obtención del JWT para cada rol durante la ejecución de las pruebas.

---

## 7. Infraestructura de Pruebas

### `setup/seed.js` — Sembrado de Datos

Script que inicializa la base de datos de prueba con un conjunto mínimo de datos necesarios para que las suites de integración puedan ejecutarse:

- 1 empresa de prueba con RUC `9999900000001`
- 5 usuarios — uno por cada rol del sistema
- 1 cliente "Consumidor Final"
- 1 tasa de IVA activa (12%)
- 1 proveedor de prueba
- Módulos habilitados para la empresa de prueba

Utiliza el patrón `findOrCreate` de Sequelize para garantizar **idempotencia**: el script puede ejecutarse múltiples veces sin generar datos duplicados.

### `setup/factories.js` — Fábricas de Datos

Helpers de creación y limpieza de registros reales en la base de datos, utilizados por las suites de integración para preparar el estado necesario antes de cada caso de prueba. Incluye fábricas para: `createCustomer`, `createSupplier`, `createTaxRate`, `createProductCategory`, `createProduct`, `createExpenseCategory`, `createExpense`, `createModuleRequest`, y la función `cleanTestData` que elimina en orden de dependencias (petty cash → invoice payments → invoices → expenses → products → customers, etc.) para evitar violaciones de claves foráneas.

### `setup/loadEnv.js` — Carga de Variables de Entorno

Archivo de configuración global de Jest que carga las variables de `.env.test` antes de que se ejecute cualquier suite de integración, garantizando que la aplicación use la base de datos de prueba y no la de desarrollo.

### `unit/helpers/mocks.js` — Fábricas de Mocks

Funciones auxiliares que generan objetos simulados (User, Company, Role, Product, Invoice, Expense, etc.) con valores válidos por defecto. Permiten que los tests unitarios declaren solo las propiedades relevantes para cada caso de prueba.

---

## 8. Requisitos Previos

- **Node.js** >= 18
- **PostgreSQL** >= 14
- El repositorio `pymeflowec-backend` debe estar ubicado como directorio hermano de este repositorio:

```
Tesis/
  pymeflowec-backend/    ← Código fuente del backend
  pymeflowec-tests/      ← Este repositorio
  pymeflowec-front/      ← Frontend Angular (no requerido para estas pruebas)
```

---

## 9. Configuración e Instalación

### Paso 1 — Instalar dependencias

```bash
npm install
```

### Paso 2 — Crear la base de datos de prueba

```sql
CREATE DATABASE pymeflowec_test;
```

Luego aplicar el esquema y los datos iniciales (roles y módulos):

```bash
psql -U postgres pymeflowec_test < ../pymeflowec-backend/src/database/schema_tesis_v10.sql
psql -U postgres pymeflowec_test < ../pymeflowec-backend/src/database/seeds_tesis_v10.sql
```

### Paso 3 — Verificar variables de entorno

Revisar el archivo `.env.test` y ajustar las credenciales si es necesario (ver sección siguiente).

### Paso 4 — Sembrar datos de prueba

```bash
npm run db:reset
npm run seed
```

---

## 10. Variables de Entorno

El archivo `.env.test` contiene la configuración exclusiva del entorno de prueba:

```env
NODE_ENV=test

# Base de datos de prueba (independiente de desarrollo y producción)
DB_NAME=pymeflowec_test
DB_USER=postgres
DB_PASSWORD=root
DB_HOST=localhost
DB_PORT=5432

# Secretos JWT — valores de prueba, no usar en producción
JWT_SECRET=test_jwt_secret_minimo_32_caracteres_aqui
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=test_refresh_secret_32_chars_min
JWT_REFRESH_EXPIRES_IN=7d

# Configuración del servidor
PORT=3001
RATE_LIMIT_MAX=10000
```

> La base de datos `pymeflowec_test` es completamente independiente de `pymeflowec_tesis` (desarrollo) y de cualquier instancia de producción.

---

## 11. Ejecución de Pruebas

### Ejecutar todas las pruebas

```bash
npm test
```

### Solo pruebas unitarias

```bash
npm run test:unit
```

### Solo pruebas de integración

```bash
npm run test:integration
```

### Con reporte de cobertura de código

```bash
npm run test:coverage
```

La cobertura se mide sobre el código fuente del backend (`../pymeflowec-backend/src/**/*.js`), excluyendo archivos de configuración y definiciones de modelos de Sequelize.

### Configuración Multi-Proyecto de Jest

La suite está configurada en `jest.config.js` como **multi-proyecto**, lo que permite ejecutar los dos niveles de prueba en procesos Node.js aislados para evitar contaminación de estado entre suites:

```javascript
module.exports = {
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/unit/**/*.test.js'],
      testEnvironment: 'node'
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/integration/**/*.test.js'],
      testEnvironment: 'node',
      globalSetup: '<rootDir>/setup/loadEnv.js'
    }
  ],
  reporters: [
    'default',
    [
      'jest-html-reporters',
      { publicPath: './html-report', filename: 'report.html' }
    ]
  ]
};
```

---

## 12. Reportes

### Reporte HTML (Jest)

Al ejecutar `npm test`, se genera automáticamente un reporte HTML en:

```
html-report/report.html
```

El reporte incluye:

- Listado completo de suites y casos de prueba
- Estado individual de cada prueba (aprobado / fallido / omitido)
- Tiempo de ejecución por suite y por caso
- Mensaje de error detallado en caso de fallo
- Resumen estadístico global

---

## 13. Decisiones de Diseño

### Separación del Repositorio de Pruebas

Las pruebas están alojadas en un repositorio separado del backend. Esto garantiza independencia entre el código de producción y los artefactos de verificación, facilita la integración en pipelines de CI/CD y evita que las dependencias de prueba afecten el bundle del backend.

### Base de Datos Dedicada para Pruebas

Las pruebas de integración utilizan una instancia PostgreSQL completamente independiente (`pymeflowec_test`). Esto asegura que:

- Las pruebas no afectan datos reales de desarrollo ni producción
- El estado inicial es reproducible mediante `npm run seed`
- Las suites pueden ejecutarse en entornos de CI/CD sin configuración adicional

### Aislamiento en Pruebas Unitarias

Las pruebas unitarias no realizan ninguna operación de I/O real. Se utilizan mocks de Jest para todas las dependencias de infraestructura, lo que permite:

- Ejecución en menos de 2 segundos
- Verificación precisa de la lógica de negocio de cada servicio
- Detección temprana de regresiones sin necesidad de una base de datos activa
- Prueba controlada de casos borde y escenarios de error

### Verificación Multi-Rol en Integración

Cada suite de integración ejecuta las mismas operaciones con tokens JWT de los cinco roles del sistema. Esta estrategia garantiza que el control de acceso basado en roles (RBAC) funciona correctamente para todos los recursos y operaciones del sistema, no solo para el rol administrador.

### Idempotencia del Sembrado

El script `seed.js` usa el patrón `findOrCreate` para que pueda ejecutarse múltiples veces sin generar datos duplicados. Las suites de integración limpian los registros creados en sus bloques `afterAll` o `afterEach` para evitar interferencias entre ejecuciones consecutivas.

### Aislamiento Multi-Tenant

Las pruebas de integración verifican que el aislamiento entre empresas funciona correctamente: un usuario autenticado en la empresa A no puede leer ni modificar datos de la empresa B. Esto se valida enviando tokens JWT de distintas empresas a los mismos endpoints y verificando que la respuesta solo incluya datos del tenant correspondiente.

---

## 14. Resultados Obtenidos

| Nivel | Suites | Pruebas | Resultado |
|---|---|---|---|
| Unitario | 21 | 200 | **PASS** |
| Integración | 15 | 239 | **PASS** |
| **Total** | **36** | **439** | **PASS** |

**Cobertura de integración por módulo:**

| Módulo (requisito MOD_*) | Endpoints probados |
|---|---|
| Autenticación y usuarios | `POST /login`, `POST /register`, `GET /me`, `POST /refresh`, `PATCH /change-password`, CRUD `/users`, forgot/reset password |
| Catálogo (MOD_PRODUCTS) | CRUD `/products`, ajuste de stock, bulk create, activar/desactivar, CRUD `/product-categories` |
| Facturación (MOD_INVOICING) | CRUD `/invoices`, cancelación con restauración de stock, CRUD `/invoice-payments`, anulación |
| Finanzas (MOD_FINANCE) | CRUD `/expenses`, anulación de egresos, CRUD `/expense-categories`, sesiones y movimientos de `/petty-cash` |
| Inventario (MOD_PRODUCTS) | `GET/POST /inventory-movements` (IN / OUT / ADJUSTMENT) |
| Plataforma | `GET/POST /platform/modules`, `GET/POST /platform/users`, `GET/POST /module-requests` |
| Proveedores y clientes | CRUD `/suppliers`, CRUD `/customers` |

Tiempo total de ejecución aproximado: **< 35 segundos**.

---

*Suite de pruebas — PymeFlowEc · Pontificia Universidad Catolica del Ecuador (PUCE) · 2026*
