# pymeflowec-tests

Suite de pruebas automatizadas para el sistema **PymeFlowEc** — un ERP SaaS multi-tenant orientado a pequeñas y medianas empresas ecuatorianas. Desarrollado como parte del trabajo de titulación de la carrera de Ingeniería de Software.

---

## Descripción general

Este repositorio contiene la capa de pruebas del backend de PymeFlowEc, separada intencionalmente del código fuente principal para mantener independencia entre la implementación y la verificación. La suite cubre dos niveles de prueba:

| Nivel | Framework | Descripción |
|---|---|---|
| **Unitario** | Jest 29 | Pruebas aisladas de servicios con dependencias mockeadas |
| **Integración** | Jest 29 + Supertest | Pruebas de endpoints HTTP contra una base de datos PostgreSQL dedicada |

**Total de pruebas: 188** (111 unitarias + 77 de integración), todas con resultado `PASS`.

---

## Arquitectura del sistema bajo prueba

```
pymeflowec-backend/          ← Código fuente (Node.js / Express / Sequelize)
pymeflowec-tests/            ← Este repositorio
  ├── unit/                  ← Pruebas unitarias (sin I/O real)
  ├── integration/           ← Pruebas de integración (HTTP + PostgreSQL)
  ├── setup/                 ← Scripts de semilla de datos para pruebas
  ├── jest.config.js         ← Configuración de proyectos Jest
  └── .env.test              ← Variables de entorno exclusivas del entorno de prueba
```

El backend sigue una arquitectura en capas:

```
Router → Middleware (auth/rate-limit) → Controller → Service → Model (Sequelize) → PostgreSQL
```

Las pruebas unitarias verifican la capa de **Service** de forma aislada. Las pruebas de integración verifican el flujo completo desde el **Router** hasta la base de datos.

---

## Módulos cubiertos

### Pruebas unitarias (`unit/`)

| Archivo | Servicio probado | Casos de prueba |
|---|---|---|
| `auth.service.test.js` | Autenticación (login, refresh, registro, cambio de contraseña) | 20+ |
| `client.service.test.js` | Gestión de clientes / consumidores | 6 |
| `invoice.service.test.js` | Facturación y cancelación de facturas | 5 |
| `moduleRequest.service.test.js` | Solicitudes de módulos (crear, aprobar, rechazar) | 7 |
| `order.service.test.js` | Órdenes de venta | 5 |
| `platformModule.service.test.js` | Catálogo de módulos de plataforma | 5 |
| `platformStaff.service.test.js` | Usuarios de soporte de plataforma | 4 |
| `product.service.test.js` | Productos (crear, ajuste de inventario, estado, eliminar) | 8 |
| `supplier.service.test.js` | Proveedores (crear, actualizar, eliminar) | 4 |
| `user.service.test.js` | Usuarios de empresa (crear, estado, contraseña, eliminar) | 10 |
| `jest-config.test.js` | Verificación de la configuración de Jest | 6 |

Las pruebas unitarias utilizan `jest.mock()` para aislar completamente las dependencias externas:
- **Sequelize / base de datos** — reemplazado por funciones `jest.fn()` controladas
- **bcryptjs** — hash y comparación mockeados
- **jsonwebtoken** — firma y verificación mockeados
- **Logger (Winston)** — silenciado en pruebas

### Pruebas de integración (`integration/`)

| Archivo | Endpoints cubiertos | Casos de prueba |
|---|---|---|
| `auth.test.js` | `POST /login`, `GET /me`, `POST /refresh`, `POST /register`, `PATCH /change-password` | 30+ |
| `clients.test.js` | `GET/POST /customers`, `PUT/DELETE /customers/:id` | 12 |
| `moduleRequests.test.js` | `GET/POST /module-requests`, aprobar, rechazar | 18 |
| `platformModules.test.js` | `GET /platform/modules` (público, activo, catálogo, detalle) | 10 |
| `platformStaff.test.js` | `GET/POST /platform/users`, desactivar, roles | 13 |
| `suppliers.test.js` | `GET/POST /suppliers`, `PUT/DELETE /suppliers/:id` | 16 |

Las pruebas de integración levantan la aplicación Express completa mediante **Supertest** (sin abrir un puerto real) y la conectan a una base de datos PostgreSQL exclusiva para pruebas (`pymeflowec_test`), separada de la base de datos de desarrollo y producción.

---

## Control de acceso y roles

El sistema implementa un esquema RBAC con cinco roles. Las pruebas verifican el comportamiento correcto para cada nivel:

| Rol | Alcance |
|---|---|
| `PLATFORM_ADMIN` | Gestión global de módulos, empresas y usuarios de soporte |
| `PLATFORM_SUPPORT` | Acceso de solo lectura a datos de plataforma |
| `STORE_ADMIN` | Gestión completa de la empresa (clientes, proveedores, productos, etc.) |
| `STORE_SELLER` | Acceso de lectura y creación de facturas/clientes |
| `STORE_WAREHOUSE` | Acceso restringido al inventario |

Cada suite de integración ejecuta los mismos endpoints con distintos tokens JWT para verificar que:
- Usuarios no autenticados reciben `401 Unauthorized`
- Usuarios con rol insuficiente reciben `403 Forbidden`
- Usuarios con rol correcto obtienen la respuesta esperada

---

## Requisitos previos

- **Node.js** >= 18
- **PostgreSQL** >= 14
- El repositorio `pymeflowec-backend` debe estar ubicado en `../pymeflowec-backend` (hermano de este repositorio)

### Estructura de directorios esperada

```
Tesis/
  pymeflowec-backend/    ← Código fuente del backend
  pymeflowec-tests/      ← Este repositorio
  pymeflowec-front/      ← Frontend Angular (no requerido para estas pruebas)
```

---

## Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear la base de datos de prueba

```sql
CREATE DATABASE pymeflowec_test;
```

Luego aplicar el esquema y datos iniciales:

```bash
psql -U postgres pymeflowec_test < schema_tesis_v4.sql
psql -U postgres pymeflowec_test < seeds_tesis_v4.sql
```

### 3. Revisar variables de entorno

El archivo `.env.test` ya está configurado con valores seguros para el entorno de prueba:

```env
NODE_ENV=test
DB_NAME=pymeflowec_test
DB_USER=postgres
DB_PASSWORD=root
JWT_SECRET=test_jwt_secret_minimo_32_caracteres_aqui
RATE_LIMIT_MAX=10000
```

> La base de datos de prueba es completamente independiente de la base de datos de desarrollo (`pymeflowec_tesis`) y de producción.

### 4. Sembrar datos de prueba

```bash
npm run seed
```

Este script crea en la base de datos de prueba:
- Una empresa de prueba (RUC `9999900000001`)
- Usuarios con cada uno de los cinco roles
- Un cliente "Consumidor Final"
- Una tasa de IVA activa
- Un proveedor de prueba
- Módulos habilitados para la empresa

---

## Ejecución de pruebas

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

### Con reporte de cobertura

```bash
npm run test:coverage
```

La cobertura se mide sobre el código fuente del backend (`../pymeflowec-backend/src/**/*.js`), excluyendo configuración y modelos de Sequelize.

---

## Reportes

### Reporte HTML (Jest)

Al ejecutar `npm test`, se genera automáticamente un reporte HTML en:

```
html-report/report.html
```

Incluye el listado completo de suites y casos de prueba con sus tiempos de ejecución y estado (pass/fail).

---

## Estructura de archivos

```
pymeflowec-tests/
├── unit/
│   ├── helpers/
│   │   └── mocks.js                  ← Factories de mocks reutilizables (User, Company, Role)
│   ├── auth.service.test.js
│   ├── client.service.test.js
│   ├── invoice.service.test.js
│   ├── jest-config.test.js
│   ├── moduleRequest.service.test.js
│   ├── order.service.test.js
│   ├── platformModule.service.test.js
│   ├── platformStaff.service.test.js
│   ├── product.service.test.js
│   ├── supplier.service.test.js
│   └── user.service.test.js
├── integration/
│   ├── helpers/
│   │   └── auth.js                   ← Función getToken() para obtener JWT por rol
│   ├── auth.test.js
│   ├── clients.test.js
│   ├── moduleRequests.test.js
│   ├── platformModules.test.js
│   ├── platformStaff.test.js
│   └── suppliers.test.js
├── setup/
│   ├── factories.js                  ← Helpers de creación de datos de prueba
│   ├── loadEnv.js                    ← Carga .env.test antes de cada suite de integración
│   └── seed.js                       ← Script de semilla (npm run seed)
├── html-report/                      ← Reporte generado (no versionado)
├── jest.config.js
├── package.json
└── .env.test
```

---

## Decisiones de diseño

### Separación de base de datos por entorno

Las pruebas de integración usan una base de datos PostgreSQL dedicada (`pymeflowec_test`) que es creada, poblada y mantenida de forma independiente. Esto garantiza que:
- Las pruebas no afectan datos reales
- El estado inicial es reproducible mediante `npm run seed`
- Los tests pueden ejecutarse en entornos de CI/CD sin configuración adicional

### Aislamiento en pruebas unitarias

Las pruebas unitarias no tocan ningún recurso externo (base de datos, sistema de archivos, red). Se utilizan mocks de Jest para todas las dependencias de infraestructura, lo que permite:
- Ejecución en menos de 2 segundos
- Verificación precisa de la lógica de negocio
- Detección temprana de regresiones sin necesidad de una base de datos activa

### Multi-tenancy y control de acceso

Las pruebas de integración verifican el aislamiento entre empresas: un usuario de la empresa A no puede leer ni modificar datos de la empresa B. Esto se valida enviando tokens JWT de distintas empresas a los mismos endpoints.

### Idempotencia

El script de semilla (`seed.js`) usa patrones `findOrCreate` para poder ejecutarse múltiples veces sin duplicar datos. Las suites de integración limpian los registros creados en sus bloques `afterAll` / `afterEach` para evitar interferencias entre ejecuciones.

---

## Resultados obtenidos

| Nivel | Suites | Pruebas | Resultado |
|---|---|---|---|
| Unitario | 11 | 111 | **PASS** |
| Integración | 6 | 77 | **PASS** |
| **Total** | **17** | **188** | **PASS** |

Tiempo total de ejecución aproximado: **< 30 segundos**.
