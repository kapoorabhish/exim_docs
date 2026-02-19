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

*Add new backlog items below this line using the same format.*
