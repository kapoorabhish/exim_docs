# E2: User Management & RBAC

**Phase:** 1 (Foundation)
**Priority:** P0
**Primary Actors:** A2 Business Owner, all tenant-level actors
**Dependencies:** E1 (Tenant exists)

---

## Epic Summary

Role-based access control with user invitation, permission management, and activity logging. Ensures each team member sees only what their role allows.

---

## User Stories

### E2-S1: Invite User via Email

**As** a business owner,
**I want to** invite team members to my EXIM account via email,
**So that** they can access the platform with appropriate permissions.

**Acceptance Criteria:**
- [ ] Enter email address and select role
- [ ] System sends invitation email with signup link
- [ ] Link expires after 7 days
- [ ] Invited user sets their password during signup
- [ ] User is auto-assigned to the tenant and role
- [ ] Duplicate email check (within tenant and across platform)
- [ ] Pending invitations visible in user management

**Story Points:** 3

---

### E2-S2: Role Assignment

**As** a business owner,
**I want to** assign predefined roles to users,
**So that** they have the right level of access for their job function.

**Acceptance Criteria:**
- [ ] Predefined roles: Admin, Accountant, Export Manager, Import Manager, Sales Manager, Purchase Manager, Inventory Manager, Data Entry Operator, Viewer
- [ ] Role descriptions visible during assignment
- [ ] One user can have one role (no multi-role for simplicity in v1)
- [ ] Role can be changed by Admin at any time
- [ ] Role change takes effect on next login

**Story Points:** 3

---

### E2-S3: Permission Matrix View

**As** a business owner,
**I want to** view the permission matrix showing what each role can access,
**So that** I understand the access levels before assigning roles.

**Acceptance Criteria:**
- [ ] Matrix view: rows = modules, columns = roles
- [ ] Each cell shows: Full / Create-Edit / View / No Access
- [ ] Read-only in v1 (custom permissions in future)
- [ ] Accessible from Settings > Users > Permissions

**Story Points:** 2

---

### E2-S4: User Profile Management

**As** a user,
**I want to** manage my personal profile (name, phone, password, avatar),
**So that** my information is accurate and my account is secure.

**Acceptance Criteria:**
- [ ] Edit display name, phone number, avatar
- [ ] Change password (requires current password)
- [ ] Email is read-only (linked to authentication)
- [ ] Profile picture shown in app header and activity logs

**Story Points:** 2

---

### E2-S5: Deactivate / Remove User

**As** a business owner,
**I want to** deactivate or remove a team member,
**So that** they lose access when they leave the organization.

**Acceptance Criteria:**
- [ ] Deactivate: user cannot log in, data is retained, can be reactivated
- [ ] Remove: user is permanently removed, their activity logs retained
- [ ] Cannot deactivate self (Admin)
- [ ] Cannot remove the last Admin
- [ ] Confirmation dialog with impact summary

**Story Points:** 2

---

### E2-S6: Authentication — Login

**As** a user,
**I want to** log in with email and password,
**So that** I can access my organization's EXIM account securely.

**Acceptance Criteria:**
- [ ] Email + password authentication
- [ ] JWT access token (15 min) + refresh token (7 days)
- [ ] Remember me option (extends refresh token to 30 days)
- [ ] Account lockout after 5 failed attempts (15 min cooldown)
- [ ] Redirect to last visited page after login
- [ ] Multi-tenant: user lands in their tenant's workspace

**Story Points:** 5

---

### E2-S7: Authentication — Forgot Password

**As** a user,
**I want to** reset my password via email,
**So that** I can regain access if I forget my credentials.

**Acceptance Criteria:**
- [ ] Enter email → receive reset link
- [ ] Reset link expires after 1 hour
- [ ] Single-use link (invalidated after use)
- [ ] New password must meet strength requirements (8+ chars, 1 upper, 1 number)
- [ ] All active sessions invalidated after password reset

**Story Points:** 3

---

### E2-S8: Session Management

**As** a business owner,
**I want to** see and manage active sessions for all users,
**So that** I can identify unauthorized access and force logout if needed.

**Acceptance Criteria:**
- [ ] View active sessions: user, device, IP, last active timestamp
- [ ] Force logout a specific session or all sessions for a user
- [ ] Auto-logout after 30 minutes of inactivity (configurable)
- [ ] Own sessions viewable by each user in their profile

**Story Points:** 3

---

### E2-S9: User Activity Log

**As** a business owner,
**I want to** see an audit trail of user actions,
**So that** I can track who did what and when for compliance and accountability.

**Acceptance Criteria:**
- [ ] Log captures: user, action, module, entity (e.g., Invoice #42), timestamp, IP
- [ ] Actions logged: create, update, delete, approve, login, logout, export
- [ ] Filter by user, module, action type, date range
- [ ] Export to CSV
- [ ] Retained for 2 years minimum
- [ ] Read-only (cannot delete audit logs)

**Story Points:** 5

---

### E2-S10: Tenant-Level Settings Access Control

**As** a business owner,
**I want to** ensure only Admins can change business settings and manage users,
**So that** critical configurations are protected from unauthorized changes.

**Acceptance Criteria:**
- [ ] Settings menu visible only to Admin role
- [ ] User management visible only to Admin role
- [ ] API enforces role check (not just UI hiding)
- [ ] Attempting unauthorized access returns 403 with audit log entry

**Story Points:** 2

---

## Total Story Points: 30
