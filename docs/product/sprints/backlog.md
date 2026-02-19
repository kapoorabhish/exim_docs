# Product & Technical Backlog

Items identified during development that are deferred to a future sprint.
Pick these up during sprint planning when capacity allows.

---

## Security

### BL-001 · Password Policy
**Area:** Auth
**Identified in:** Sprint 2
**Priority:** High
**Epic:** E1 (Tenant & Auth)

**Problem:**
Registration and password-change endpoints accept any non-empty string. There is no
minimum length, complexity, or common-password check enforced either on the backend
(`auth.service.ts`) or in the frontend registration/change-password forms.

**Acceptance Criteria:**
- [ ] Minimum 8 characters
- [ ] At least one uppercase letter, one lowercase letter, one digit, one special character
- [ ] Reject passwords from a common-passwords list (e.g. "password123", "Admin@1234")
- [ ] Backend: `class-validator` decorator or custom validation pipe on `CreateUserDto` / `ChangePasswordDto`
- [ ] Frontend: real-time strength indicator on registration and change-password forms (Ant Design `Input.Password` with `visibilityToggle` + custom meter)
- [ ] Consistent error message: `"Password must be at least 8 characters and include uppercase, lowercase, digit, and special character."`
- [ ] Password change requires current password confirmation before accepting new one (already partially modelled — verify this is enforced end-to-end)

**Suggested implementation:**
```typescript
// apps/api/src/modules/auth/dto/register.dto.ts
@MinLength(8)
@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/, {
  message: 'Password too weak',
})
password: string;
```

---

---

## Testing

### BL-002 · Unit & Integration Test Coverage
**Area:** Quality / All modules
**Identified in:** Sprint 2
**Priority:** High
**Target:** Sprint 4 onwards (introduce alongside new feature work)

**Problem:**
No automated tests exist anywhere in the codebase. As the document chain grows
(PI → CI → PL → SB → BRC), manual regression becomes expensive and unreliable.
Business logic (document number generation, status machine transitions, exchange
rate snapshots, duty drawback eligibility) must be protected by tests.

---

**Coverage Targets (to be met by Sprint 6)**

| Layer | Tool | Minimum Coverage |
|---|---|---|
| API services (unit) | Jest | 80% line coverage |
| API controllers (integration) | Jest + Supertest | All happy paths + key error paths |
| Business logic utilities | Jest | 100% (doc number, status machine, calc helpers) |
| Frontend components | Vitest + React Testing Library | 70% line coverage |
| Frontend pages | Vitest | Critical flows: create, submit, error state |
| E2E (optional, Sprint 7+) | Playwright | Core export workflow: PI → SB |

---

**What to test first (priority order)**

1. **`DocNumberService`** — financial year detection, sequence atomicity, prefix format
2. **Status machine transitions** — ShippingBill, ProformaInvoice, CommercialInvoice
3. **`ExchangeRateService.syncRbiRates()`** — mock fetch, verify upsert logic
4. **Auth flows** — register, login, refresh, email verify
5. **Party / Product CSV import** — valid file, malformed file, duplicate SKU
6. **UI components** — Button variants, StatusBadge, CurrencyDisplay

---

**Setup tasks (one-time, ~1 sprint)**

Backend (`apps/api`):
- [ ] Configure Jest with `ts-jest`, coverage thresholds in `jest.config.ts`
- [ ] Add `PrismaService` mock factory (`jest.mock`)
- [ ] Add test database (separate `TEST_DATABASE_URL` in `.env.example`)
- [ ] Add `test` and `test:cov` scripts to `package.json`
- [ ] Configure coverage reporting (lcov for CI, text-summary for local)

Frontend (`apps/web`, `packages/ui`):
- [ ] Configure Vitest + React Testing Library
- [ ] Add `@testing-library/user-event` for interaction testing
- [ ] Add `msw` (Mock Service Worker) for API mocking in component tests
- [ ] Add `test` and `coverage` scripts

CI (when GitHub Actions is added):
- [ ] Run `pnpm test` on every PR to `develop`
- [ ] Block merge if coverage drops below threshold
- [ ] Upload coverage report as PR comment

---

**Example test structure**

```
apps/api/src/
  modules/
    exports/
      proforma/
        proforma.service.spec.ts   ← unit: mock Prisma
        proforma.controller.spec.ts ← integration: Supertest
  common/
    services/
      doc-number.service.spec.ts   ← 100% coverage required

packages/ui/src/
  components/
    Button.test.tsx
    StatusBadge.test.tsx
    CurrencyDisplay.test.tsx
```

---

*Add new backlog items below this line using the same format.*
