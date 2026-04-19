---
name: pymeflowec schema v4 test rewrite
description: Full test suite rewritten for schema v4 - models, roles, routes, and seed data changes
type: project
---

Schema was upgraded to v4 (schema_tesis_v4.sql + seeds_tesis_v4.sql). All tests were rewritten accordingly.

**Why:** Schema v4 dropped Organization/PlatformStaff/Order tables, replaced with Company/StoreCustomer/CompanyModuleRequest using global roles.

**How to apply:** When modifying tests, always reference the current backend services and routes — do not rely on old model names like Organization, Client, Order, PlatformStaff.

## Key changes from old schema:
- `Organization` → `Company` (status uppercase: ACTIVE/INACTIVE/SUSPENDED/PENDING)
- `Client` → `StoreCustomer` (field: document_number not identification, customer_type required)
- `Order`/`OrderDetail` → removed entirely; invoices created directly via `Invoice`/`InvoiceDetail`
- `PlatformStaff`/`PlatformRole` → removed; platform access via `Role.scope = 'PLATFORM'`
- `ModuleRequest` → `CompanyModuleRequest` (status uppercase: PENDING/APPROVED/REJECTED)
- `module_requests` cancel route does NOT exist in v4

## Roles (global catalog, set in seeds_tesis_v4.sql):
- PLATFORM_ADMIN (scope=PLATFORM)
- PLATFORM_SUPPORT (scope=PLATFORM)
- STORE_ADMIN (scope=STORE)
- STORE_SELLER (scope=STORE)
- STORE_WAREHOUSE (scope=STORE)

## Seed users (set by setup/seed.js):
- platform_admin@test.com / PlatformAdmin2026! (PLATFORM_ADMIN)
- platform_support@test.com / PlatformSupport2026! (PLATFORM_SUPPORT)
- admin@test.com / Admin@1234 (STORE_ADMIN)
- seller@test.com / Seller@1234 (STORE_SELLER)
- warehouse@test.com / Warehouse@1234 (STORE_WAREHOUSE)

## Active modules for test company: MOD_INVOICING, MOD_INVENTORY, MOD_PRODUCTS, MOD_SUPPLIERS, MOD_TAX
## Available for module request tests: MOD_REPORTS, MOD_AUDIT

## Route mapping (integration tests):
- /api/customers (not /api/clients)
- /api/platform/users (not /api/platform/staff)
- /api/platform/roles (not /api/platform/staff/roles)
- No cancel route: /api/module-requests/:id/cancel
