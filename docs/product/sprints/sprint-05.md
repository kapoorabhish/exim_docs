# Sprint 5: Unit Test Suite (Sprints 1–4 Debt)

**Sprint Goal:** Eliminate the test debt accumulated across Sprints 1–4 by setting up a Jest infrastructure and writing comprehensive unit tests for every NestJS service in `apps/api/`. Achieve ≥ 70% statement coverage on `src/modules/**/*.service.ts`.

**Scope:** Backend only (`apps/api/`) — test infrastructure + 21 spec files. No new features, schema changes, or frontend work in this sprint.

**Stories Covered:** Backlog #15 (Unit test suite — Sprints 1–4 debt)

**Deferred to Sprint 6+:** Frontend (Next.js) unit/integration tests, E2E tests, `syncRbiRates()` integration test (requires HTTP mock server)

---

## Sprint Outcome

By the end of this sprint, the following is in place:

```
1. Jest runs with `pnpm --filter api test` — zero configuration needed
2. 21 spec files cover every service across all 20 modules written in Sprints 1–4
3. Coverage gate enforced: ≥ 70% statement coverage on modules/**/*.service.ts
4. Prisma is fully mocked via jest-mock-extended — no real DB connection in tests
5. All 270 tests pass; no skips or pending tests
6. Coverage report: statements 90.47%, branches 74.35%, functions 93.04%, lines 92.58%
```

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Test runner | Jest + ts-jest | Native NestJS stack; ts-jest handles TypeScript decorators with inline tsconfig override |
| Prisma mocking | `jest-mock-extended` → `mockDeep<PrismaClient>()` | Deep-mocks all Prisma model delegates automatically; type-safe; no real DB needed |
| `$transaction` mock | `mockImplementation(async fn => typeof fn === 'function' ? fn(prisma) : Promise.all(fn))` | Allows callback-style transactions to receive the same mock proxy as `tx` |
| Module mocks | `jest.mock()` at top of spec file for `bcryptjs`, `nodemailer`, `@react-pdf/renderer`, `@exim/pdf`, `react` | Prevents real side effects in auth, email, and PDF tests |
| ts-jest tsconfig | Inline per-file: `emitDecoratorMetadata: true`, `experimentalDecorators: true`, `module: commonjs` | Avoids global tsconfig conflict; NestJS decorators require these flags |
| Coverage scope | `modules/**/*.service.ts` only | Focuses gate on business logic; excludes controllers, DTOs, guards, filters |
| Frontend tests | Deferred | Sprint 5 scope was API only; Next.js component/page tests are Sprint 6+ |

---

## Task 0: Test Infrastructure (Blocker)

**Files created/modified:**

| Action | Path |
|--------|------|
| Modified | `apps/api/package.json` — added devDependencies + test scripts |
| Created | `apps/api/jest.config.ts` |
| Created | `apps/api/src/test/prisma-mock.ts` |
| Created | `apps/api/src/test/fixtures.ts` |

### New devDependencies added to `apps/api/package.json`
```json
"jest": "^30.2.0",
"ts-jest": "^29.4.6",
"@types/jest": "^30.0.0",
"jest-mock-extended": "^4.0.0",
"@nestjs/testing": "^11.1.14"
```

### New scripts added to `apps/api/package.json`
```json
"test": "jest",
"test:watch": "jest --watch",
"test:cov": "jest --coverage"
```

### `apps/api/jest.config.ts`
```ts
import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: {
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        strictPropertyInitialization: false,
        module: 'commonjs',
        target: 'ES2022',
      },
    }],
  },
  collectCoverageFrom: ['modules/**/*.service.ts'],
  coverageDirectory: '../coverage',
  coverageThreshold: { global: { statements: 70 } },
  testEnvironment: 'node',
};

export default config;
```

### `apps/api/src/test/prisma-mock.ts`
Factory using `jest-mock-extended` that returns a `DeepMockProxy<PrismaClient>` — satisfies
`PrismaService` in NestJS test modules without touching the database.

```ts
import { PrismaClient } from '@exim/db';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

export const createPrismaMock = (): DeepMockProxy<PrismaClient> =>
  mockDeep<PrismaClient>();

export type PrismaMock = DeepMockProxy<PrismaClient>;
```

### `apps/api/src/test/fixtures.ts`
Reusable plain-object factories and shared constants:

| Export | Type | Purpose |
|---|---|---|
| `TENANT_ID` | `string` | Shared tenant ID for all tests |
| `USER_ID` | `string` | Shared user ID |
| `PARTY_ID` | `string` | Shared party (buyer) ID |
| `makeTenant(overrides?)` | factory | Returns tenant with `status: 'TRIAL'` |
| `makeUser(overrides?)` | factory | Returns user with `role: 'ADMIN'` |
| `makeVerificationToken(overrides?)` | factory | Email verification token with future expiry |
| `makeSession(overrides?)` | factory | Active refresh token session |
| `makeParty(overrides?)` | factory | Party with `type: 'BUYER'` |
| `makeProduct(overrides?)` | factory | Product with HSN, UOM, unit price |
| `makeProforma(overrides?)` | factory | Proforma invoice in `DRAFT` status |
| `makeInvoice(overrides?)` | factory | Commercial invoice in `DRAFT` status |
| `makeLineItem(overrides?)` | factory | Invoice line item |
| `makeDocumentSequence(overrides?)` | factory | Document number sequence record |

---

## Task 1: `doc-number.service.spec.ts`

**File:** `apps/api/src/common/services/doc-number.service.spec.ts`

**Key test cases:**
- `getFyLabel()`: April date → same year FY label; January → prior year FY label; boundary 31 Mar vs 1 Apr
- `getNextNumber()` with no existing sequence → creates new, returns `PI/2025-26/001`
- `getNextNumber()` with existing sequence → increments `lastNumber`, returns `PI/2025-26/002`
- All prefixes (PI, INV, PL, SB, COO, BRC, PO) produce correct formatted numbers
- `upsert` called with correct `docType` and `tenantId`

---

## Task 2: `auth.service.spec.ts`

**File:** `apps/api/src/modules/auth/auth.service.spec.ts`

**Module-level mock:** `jest.mock('bcryptjs', () => ({ hash: jest.fn(), compare: jest.fn() }))`

**Key test cases:**

| Method | Scenario | Expected |
|---|---|---|
| `signup` | Email already exists | `ConflictException` |
| `signup` | Success | Creates tenant + user + token; sends verification email |
| `verifyEmail` | Token not found | `BadRequestException` |
| `verifyEmail` | Token expired | `BadRequestException` |
| `verifyEmail` | Token already used | `BadRequestException` |
| `verifyEmail` | Success | Returns access + refresh tokens |
| `login` | User not found | `UnauthorizedException` |
| `login` | Account locked | `UnauthorizedException` |
| `login` | Wrong password | Increments `failedLoginAttempts` |
| `login` | 5th wrong password | Sets `lockedUntil` |
| `login` | Inactive / unverified | `UnauthorizedException` |
| `login` | Success | Returns tokens; creates session; writes audit log |
| `refresh` | Expired session | `UnauthorizedException` |
| `refresh` | Valid session | Rotates refresh token |
| `logout` | — | Deletes session |
| `forgotPassword` | User not found | Silent success (no enumeration) |
| `resetPassword` | Invalid / expired / used token | `BadRequestException` |
| `resetPassword` | Success | Updates hash; deletes all sessions |
| `acceptInvite` | Expired token | `BadRequestException` |
| `acceptInvite` | Email conflict | `ConflictException` |
| `acceptInvite` | Success | Creates user; returns tokens |

---

## Task 3: `tenant.service.spec.ts`

**File:** `apps/api/src/modules/tenant/tenant.service.spec.ts`

**Key test cases:**
- `getProfile`: not found → `NotFoundException`; success → returns profile
- `updateProfile`: not found → `NotFoundException`; success → `update` called
- `getBankAccounts`: returns accounts array for tenant
- `createBankAccount`: `create` called with correct `tenantId`
- `updateBankAccount`: account not found → `NotFoundException`; success
- `deleteBankAccount`: not found → `NotFoundException`; success

---

## Task 4: `users.service.spec.ts`

**File:** `apps/api/src/modules/users/users.service.spec.ts`

**Module-level mock:** `jest.mock('bcryptjs', ...)`

**Key test cases:**
- `listUsers`: returns paginated users for tenant
- `inviteUser`: duplicate email → `ConflictException`; pending invite → `ConflictException`; success creates invitation
- `changeRole`: cannot change own role; user not found; success
- `changeStatus`: cannot deactivate self; cannot deactivate last admin; deactivation deletes sessions
- `removeUser`: cannot remove self; cannot remove last admin; success
- `getMyProfile`: returns current user record
- `changePassword`: wrong old password → `BadRequestException`; success → bcrypt hash updated

---

## Task 5: `email.service.spec.ts`

**File:** `apps/api/src/modules/email/email.service.spec.ts`

**Module-level mock:** `jest.mock('nodemailer', () => ({ createTransport: jest.fn() → { sendMail: mockSendMail } }))`

**Key test cases:**
- `sendVerificationEmail`: calls transporter with correct subject and verification link
- `sendPasswordResetEmail`: calls transporter with reset link
- `sendInvitationEmail`: includes tenant name in subject; correct invite link
- `sendWelcomeEmail`: sends to correct recipient
- No SMTP config (`ConfigService` returns undefined): falls back to `console.log` (no throw)

---

## Task 6: `party.service.spec.ts`

**File:** `apps/api/src/modules/master-data/party/party.service.spec.ts`

**Key test cases:**
- `list`: paginated; type filter applied; search filter applied to name/email
- `getById`: not found → `NotFoundException`; success
- `create`: duplicate name + type → `ConflictException`; success → `isActive: true`
- `update`: not found → `NotFoundException`; success
- `deactivate`: sets `isActive: false`
- `delete`: success
- `csvTemplate`: returns CSV string with header row
- `importCsv`: valid rows → bulk create; missing required fields → skipped with error; duplicate → `ConflictException`

---

## Task 7: `product.service.spec.ts`

**File:** `apps/api/src/modules/master-data/product/product.service.spec.ts`

**Key test cases:**
- `list`: paginated with filters
- `getById`: not found → `NotFoundException`
- `create`: duplicate product code → `ConflictException`; HS code auto-filled from reference table; rates provided → no lookup
- `update`: not found; success
- `deactivate`: `isActive: false`
- `delete`: success
- `csvTemplate`: returns CSV header
- `importCsv`: valid rows imported; bad rows skipped

---

## Task 8: `exchange-rate.service.spec.ts`

**File:** `apps/api/src/modules/master-data/exchange-rate/exchange-rate.service.spec.ts`

**Key test cases:**
- `getCurrentRates`: returns deduplicated latest rates per currency; currency filter narrows result
- `getRateHistory`: returns rates within date range; `dateFrom`/`dateTo` filters applied
- `setManualRate`: upserts rate with `source: 'MANUAL'`; default source applied when not specified

---

## Task 9: `reference.service.spec.ts`

**File:** `apps/api/src/modules/master-data/reference/reference.service.spec.ts`

**Key test cases:**
- `searchPorts`: filter by name fragment; filter by country code
- `searchCountries`: filter by name
- `searchHsCodes`: filter by numeric prefix; filter by text description
- `listUoms`: returns all UOMs
- `listIncoterms`: returns all incoterms

---

## Task 10: `terms.service.spec.ts`

**File:** `apps/api/src/modules/master-data/terms/terms.service.spec.ts`

**Key test cases:**
- `list`: returns terms; `documentType` filter applied
- `getById`: not found → `NotFoundException`
- `create`: `isDefault: true` → clears other defaults first; `isDefault: false` → no clear
- `update`: not found → `NotFoundException`; success → increments version
- `delete`: not found → `NotFoundException`; success
- `setDefault`: clears existing default, sets new default
- `getDefault`: returns term with `isDefault: true`

---

## Task 11: `proforma.service.spec.ts`

**File:** `apps/api/src/modules/exports/proforma/proforma.service.spec.ts`

**Key test cases:**

| Method | Scenario | Expected |
|---|---|---|
| `list` | Status filter | `findMany` called with `where.status` |
| `getById` | Not found | `NotFoundException` |
| `create` | — | Calls `getNextNumber('PI')`, calculates `totalAmount`, creates line items |
| `update` | Non-DRAFT | `BadRequestException` |
| `update` | DRAFT + line items | Deletes old items, recreates |
| `finalize` | Non-DRAFT | `BadRequestException` |
| `finalize` | DRAFT | Status → `FINALIZED` |
| `revise` | Non-FINALIZED | `BadRequestException` |
| `revise` | FINALIZED | `$transaction`: old → `CANCELLED`, new → DRAFT with incremented version |
| `cancel` | Non-DRAFT | `BadRequestException` |
| `cancel` | DRAFT | Status → `CANCELLED` |
| `convert` | Non-FINALIZED | `BadRequestException` |
| `convert` | FINALIZED | Creates `CommercialInvoice` with exchange rate snapshot |
| `clone` | Not found | `NotFoundException` |
| `clone` | Success | New PI number, `version=1`, status `DRAFT` |
| `calcTotal` | Via create | Correct sum of `lineItems` + freight + insurance |

---

## Task 12: `invoice.service.spec.ts`

**File:** `apps/api/src/modules/exports/invoice/invoice.service.spec.ts`

**Key test cases:**
- `list`: returns results; status filter applied
- `getById`: not found → `NotFoundException`
- `create`: fetches exchange rate snapshot; rate=1 fallback when no rate record
- `update`: `LOCKED` → `ConflictException`; `FINALIZED` → `BadRequestException`; DRAFT → success
- `finalize`: status → `FINALIZED`
- `lock`: status → `LOCKED`
- `delete`: not found → `NotFoundException`; success
- `clone`: new invoice number, today's date, fresh exchange rate
- `documentSet`: returns all linked documents in one call

---

## Task 13: `packing-list.service.spec.ts`

**File:** `apps/api/src/modules/exports/packing-list/packing-list.service.spec.ts`

**Key test cases:**
- `list`: paginated
- `getById`: not found → `NotFoundException`
- `create`: invoice not found → `NotFoundException`; pre-fills packages from invoice line items; custom packages respected
- `update`: not found; `$transaction` deletes old packages and recreates
- `finalize`: status → `FINALIZED`
- `delete`: not found; success

---

## Task 14: `shipping-bill.service.spec.ts`

**File:** `apps/api/src/modules/exports/shipping-bill/shipping-bill.service.spec.ts`

**Key test cases:**
- `list` / `getById` / `create` (invoice not found → `NotFoundException`; auto-fills line items)
- `update`: `$transaction` deletes old line items and recreates
- `transitionStatus`: invalid next status → `BadRequestException`; LEO requires `leoDate` + `leoNumber`; DRAFT→FILED locks the invoice
- `delete`: success

---

## Task 15: `brc.service.spec.ts`

**File:** `apps/api/src/modules/exports/brc/brc.service.spec.ts`

**Key test cases:**
- `list` / `getById` (not found) / `create` (invoice not found; SB not found; success)
- `update`: not found → `NotFoundException`; success
- `markReceived`: with `brcNumber`; without `brcNumber` → status still `RECEIVED`
- `delete`: not found; success

---

## Task 16: `bill-of-lading.service.spec.ts`

**File:** `apps/api/src/modules/exports/bill-of-lading/bill-of-lading.service.spec.ts`

**Key test cases:**
- `list` / `getById` / `create` (invoice not found; SB not found; success)
- `update`: not found; success
- `updateStatus`: invalid status string → `BadRequestException`; valid → `update` called
- `delete`: not found; success

---

## Task 17: `insurance.service.spec.ts`

**File:** `apps/api/src/modules/exports/insurance/insurance.service.spec.ts`

**Key test cases:**
- `list`: returns certificates for tenant
- `getById`: not found → `NotFoundException`
- `create`: invoice not found → `NotFoundException`; success → returns certificate with `policyNumber`
- `update`: not found → `NotFoundException`; success
- `delete`: not found; success → returns `{ message }`

---

## Task 18: `coo.service.spec.ts`

**File:** `apps/api/src/modules/exports/coo/coo.service.spec.ts`

**Key test cases:**
- `list` / `getById` / `create` (invoice not found; generates COO number via `DocNumberService`)
- `update`: non-DRAFT → `BadRequestException`; DRAFT → success
- `transitionStatus`: invalid next status → `BadRequestException`; DRAFT→SUBMITTED → success; ISSUED (terminal) → `BadRequestException`
- `delete`: non-DRAFT → `BadRequestException`; DRAFT → success

---

## Task 19: `buyer-po.service.spec.ts`

**File:** `apps/api/src/modules/exports/buyer-po/buyer-po.service.spec.ts`

**Key test cases:**
- `list`: paginated; status filter applied
- `getById`: not found → `NotFoundException`
- `create`: calculates `totalAmount` from line items; zero total when no line items
- `update`: not found; `deleteMany` + recreate when line items provided; no `deleteMany` when omitted
- `setStatus`: not found; success → `update` called with new status
- `delete`: not found; success

---

## Task 20: `pdf.service.spec.ts`

**File:** `apps/api/src/modules/pdf/pdf.service.spec.ts`

**Module-level mocks:**
```ts
jest.mock('@react-pdf/renderer', () => ({ renderToBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-pdf')) }));
jest.mock('@exim/pdf', () => ({ ProformaInvoicePdf: () => null, CommercialInvoicePdf: () => null, PackingListPdf: () => null }));
jest.mock('react', () => ({ ...jest.requireActual('react'), createElement: jest.fn().mockReturnValue(null) }));
```

**Key test cases:**
- `renderProforma`: not found → `NotFoundException`; success → returns Buffer; fetches `businessProfile`
- `renderInvoice`: not found → `NotFoundException`; success → returns Buffer
- `renderPackingList`: not found → `NotFoundException`; success → returns Buffer
- Bank details included in profile when `bankAccount.findFirst` returns a record

---

## Task 21: `admin.service.spec.ts`

**File:** `apps/api/src/modules/admin/admin.service.spec.ts`

**Key test cases:**
- `listTenants`: paginated; `status` filter applied; `search` filter on name/slug
- `getTenantById`: not found → `NotFoundException`; success → includes `_count` of users
- `setTenantStatus`: not found → `NotFoundException`; sets `ACTIVE`/`SUSPENDED`
- `getPlatformStats`: aggregates tenant/user counts; empty `groupBy` result handled gracefully

---

## Dependency Graph

```
Task 0: Infrastructure (jest.config, prisma-mock, fixtures)
  │
  └──→ Tasks 1–21: All spec files (depend on infra)
```

All spec files are independent of each other. They can be written and run in any order
once the infrastructure (Task 0) is in place.

---

## Execution Order

| Order | Task | File |
|---|---|---|
| 1 | Task 0: Infrastructure | `jest.config.ts`, `src/test/prisma-mock.ts`, `src/test/fixtures.ts` |
| 2 | Task 1: DocNumber | `common/services/doc-number.service.spec.ts` |
| 3 | Task 2: Auth | `modules/auth/auth.service.spec.ts` |
| 4 | Task 3: Tenant | `modules/tenant/tenant.service.spec.ts` |
| 5 | Task 4: Users | `modules/users/users.service.spec.ts` |
| 6 | Task 5: Email | `modules/email/email.service.spec.ts` |
| 7 | Task 6: Party | `modules/master-data/party/party.service.spec.ts` |
| 8 | Task 7: Product | `modules/master-data/product/product.service.spec.ts` |
| 9 | Task 8: ExchangeRate | `modules/master-data/exchange-rate/exchange-rate.service.spec.ts` |
| 10 | Task 9: Reference | `modules/master-data/reference/reference.service.spec.ts` |
| 11 | Task 10: Terms | `modules/master-data/terms/terms.service.spec.ts` |
| 12 | Task 11: Proforma | `modules/exports/proforma/proforma.service.spec.ts` |
| 13 | Task 12: Invoice | `modules/exports/invoice/invoice.service.spec.ts` |
| 14 | Task 13: PackingList | `modules/exports/packing-list/packing-list.service.spec.ts` |
| 15 | Task 14: ShippingBill | `modules/exports/shipping-bill/shipping-bill.service.spec.ts` |
| 16 | Task 15: BRC | `modules/exports/brc/brc.service.spec.ts` |
| 17 | Task 16: BillOfLading | `modules/exports/bill-of-lading/bill-of-lading.service.spec.ts` |
| 18 | Task 17: Insurance | `modules/exports/insurance/insurance.service.spec.ts` |
| 19 | Task 18: COO | `modules/exports/coo/coo.service.spec.ts` |
| 20 | Task 19: BuyerPO | `modules/exports/buyer-po/buyer-po.service.spec.ts` |
| 21 | Task 20: PDF | `modules/pdf/pdf.service.spec.ts` |
| 22 | Task 21: Admin | `modules/admin/admin.service.spec.ts` |

---

## Definition of Done

- [x] `pnpm --filter api test` runs without error — **270 tests pass, 0 failed, 0 skipped**
- [x] `pnpm --filter api test:cov` produces coverage report in `apps/api/coverage/`
- [x] Coverage gate met: ≥ 70% statement coverage on `modules/**/*.service.ts`
- [x] No real database connection required — all Prisma calls mocked
- [x] No real HTTP calls — `nodemailer`, `@react-pdf/renderer` mocked at module level
- [x] All TypeScript types satisfied — no `ts-jest` compilation errors
- [x] `bcryptjs` mocked — no actual hashing in tests
- [x] Backlog item #15 closed

### Coverage Report (actual)

| Metric | Result | Gate |
|---|---|---|
| **Statements** | **90.47%** | ≥ 70% ✓ |
| **Branches** | **74.35%** | — |
| **Functions** | **93.04%** | — |
| **Lines** | **92.58%** | — |

**Test suites:** 21 passed, 21 total
**Tests:** 270 passed, 270 total

> Note: `exchange-rate.service.ts` has lower statement coverage (~58%) due to the `syncRbiRates()` method which makes live HTTP calls to the RBI website. This method is intentionally excluded from unit testing; integration testing with HTTP mocking (e.g. `nock`) is deferred to Sprint 6+.

---

**Document Version:** 1.0
**Last Updated:** February 2026
