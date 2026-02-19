# E1: Platform & Tenant Management

**Phase:** 1 (Foundation)
**Priority:** P0
**Primary Actors:** A1 Super Admin, A2 Business Owner
**Dependencies:** None (foundational)

---

## Epic Summary

Enable multi-tenant SaaS operations — tenant onboarding, subscription management, business profile configuration, and platform administration.

---

## User Stories

### E1-S1: Tenant Registration

**As** a business owner,
**I want to** register my organization on the EXIM platform,
**So that** I can start managing my export-import documentation.

**Acceptance Criteria:**
- [ ] Registration form collects: company name, email, phone, password
- [ ] Email verification with OTP
- [ ] Creates tenant with unique tenant ID
- [ ] Redirects to business profile setup wizard after verification
- [ ] 14-day free trial activated automatically

**Story Points:** 5

---

### E1-S2: Business Profile Setup

**As** a business owner,
**I want to** configure my company profile with trade-specific details,
**So that** these details auto-populate on all my documents.

**Acceptance Criteria:**
- [ ] Company name, registered address, communication address
- [ ] IEC number (with format validation: 10 digits)
- [ ] GSTIN (with format validation: 15 characters, checksum)
- [ ] PAN number
- [ ] Logo upload (PNG/JPG, max 2MB, displayed on documents)
- [ ] Bank details (account number, IFSC, SWIFT code)
- [ ] Authorized signatory name and designation
- [ ] Digital signature upload (PNG, for document generation)
- [ ] Profile can be edited later from Settings

**Story Points:** 5

---

### E1-S3: Multi-Branch Support

**As** a business owner,
**I want to** add multiple branches/locations for my organization,
**So that** I can manage separate GST registrations and addresses.

**Acceptance Criteria:**
- [ ] Add branch with name, address, GSTIN (different state)
- [ ] Each branch can have its own bank account
- [ ] Documents can be issued from a specific branch
- [ ] Branch selection available during document creation
- [ ] Default branch configurable

**Story Points:** 3

---

### E1-S4: Subscription Plan Selection

**As** a business owner,
**I want to** choose a subscription plan for my organization,
**So that** I can access features appropriate for my business size.

**Acceptance Criteria:**
- [ ] Display plan comparison (Starter, Professional, Enterprise)
- [ ] Plan limits clearly shown (users, transactions/month, storage)
- [ ] Razorpay payment gateway integration
- [ ] Monthly and annual billing options (annual = 2 months free)
- [ ] Plan activates immediately after payment
- [ ] Invoice generated for the subscription payment

**Story Points:** 5

---

### E1-S5: Subscription Management

**As** a business owner,
**I want to** upgrade, downgrade, or cancel my subscription,
**So that** I can adjust the plan as my business needs change.

**Acceptance Criteria:**
- [ ] View current plan details and usage
- [ ] Upgrade takes effect immediately (prorated billing)
- [ ] Downgrade takes effect at next billing cycle
- [ ] Cancel retains access until current period ends
- [ ] Grace period of 7 days after expiry before data lockout
- [ ] Data export available even in expired state

**Story Points:** 3

---

### E1-S6: Platform Admin — Tenant Dashboard

**As** a super admin,
**I want to** view and manage all tenant accounts,
**So that** I can monitor platform health and resolve issues.

**Acceptance Criteria:**
- [ ] List all tenants with: name, plan, status, created date, last active, user count
- [ ] Filter by plan type, status (active/expired/trial), date range
- [ ] Search by company name, IEC, or email
- [ ] View tenant details (profile, usage stats, subscription history)
- [ ] Activate/deactivate tenant accounts
- [ ] Cannot access tenant's business data (invoices, payments, etc.)

**Story Points:** 5

---

### E1-S7: Platform Admin — Usage Analytics

**As** a super admin,
**I want to** view platform-wide usage metrics,
**So that** I can plan capacity and identify growth opportunities.

**Acceptance Criteria:**
- [ ] Total tenants (active, trial, expired)
- [ ] New signups this month
- [ ] MRR (Monthly Recurring Revenue)
- [ ] Transactions processed this month (platform-wide)
- [ ] Storage used vs available
- [ ] Top 10 tenants by transaction volume

**Story Points:** 3

---

### E1-S8: Financial Year Configuration

**As** a business owner,
**I want to** configure my financial year settings,
**So that** reports and document numbering align with my accounting period.

**Acceptance Criteria:**
- [ ] Select financial year start month (default: April for India)
- [ ] Document numbering resets annually based on FY
- [ ] Reports can be filtered by financial year
- [ ] Year format display configurable (2025-26 vs FY2026)

**Story Points:** 2

---

## Total Story Points: 31
