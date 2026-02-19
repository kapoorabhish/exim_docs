# E12: Communication & Notifications

**Phase:** 3 (Collaboration & Intelligence)
**Priority:** P1
**Primary Actors:** A2 Admin, A3 Accountant, A4 Export Manager, A5 Import Manager, A6 Sales Manager
**Dependencies:** E4, E5, E7 (data triggers)

---

## Epic Summary

Multi-channel communication — email, WhatsApp, SMS, and in-app notifications. Automated alerts for deadlines, overdue payments, clearance updates, and document sharing.

---

## User Stories

### E12-S1: In-App Notification Center

**As** a user,
**I want to** see real-time notifications for events relevant to my role,
**So that** I stay informed without checking every module.

**Acceptance Criteria:**
- [ ] Bell icon in header with unread count badge
- [ ] Notification panel: list of notifications with icon, title, message, timestamp
- [ ] Click notification → navigate to relevant document/page
- [ ] Mark as read (individual or all)
- [ ] Notification types: document status change, payment received, LC expiry, overdue alert, assignment, approval request
- [ ] Role-filtered: users see only notifications for their modules
- [ ] Persist notifications for 90 days

**Story Points:** 5

---

### E12-S2: Email — Send Document

**As** an export manager,
**I want to** email a document to a buyer with the PDF attached,
**So that** I can share documents directly from the platform.

**Acceptance Criteria:**
- [ ] "Send via Email" action on any finalized document
- [ ] Pre-filled: to (party's email), CC, subject, body from template
- [ ] PDF auto-attached
- [ ] Body editable before sending
- [ ] Sent via configured SMTP or platform email service (AWS SES)
- [ ] Delivery status: sent / failed / bounced
- [ ] Email history stored on document record

**Story Points:** 3

---

### E12-S3: Email Templates

**As** a business owner,
**I want to** create reusable email templates for common scenarios,
**So that** my team sends consistent, professional communications.

**Acceptance Criteria:**
- [ ] Template types: document sharing, payment reminder, shipment notification, LC notice, custom
- [ ] Merge fields: {{buyer_name}}, {{invoice_number}}, {{amount}}, {{due_date}}, etc.
- [ ] Rich text editor for body
- [ ] Subject line with merge fields
- [ ] Default template per scenario (editable)
- [ ] Preview with sample data

**Story Points:** 3

---

### E12-S4: Automated Payment Reminders

**As** an accountant,
**I want to** configure automated payment reminders,
**So that** buyers are reminded of upcoming and overdue payments without manual effort.

**Acceptance Criteria:**
- [ ] Configuration: remind X days before due, on due date, X days after due
- [ ] Reminder levels: Friendly (before due), Firm (on due), Urgent (overdue)
- [ ] Channel: email (v1), WhatsApp (future)
- [ ] Template per reminder level
- [ ] Auto-include: invoice details, amount, due date, bank details
- [ ] Stop reminders when payment is recorded
- [ ] Reminder history per invoice
- [ ] Enable/disable per party (some parties should not get automated reminders)

**Story Points:** 5

---

### E12-S5: WhatsApp — Share Document

**As** an export manager,
**I want to** share a document via WhatsApp to the buyer's contact,
**So that** they receive it instantly on their preferred channel.

**Acceptance Criteria:**
- [ ] "Share via WhatsApp" action on finalized documents
- [ ] Uses WhatsApp Business API (Gupshup/Twilio)
- [ ] Pre-approved template message with document link
- [ ] PDF shared as attachment or cloud link
- [ ] Delivery status tracking: sent / delivered / read
- [ ] Message history stored on document record
- [ ] Requires business owner to configure WhatsApp API credentials

**Story Points:** 5

---

### E12-S6: SMS Notifications

**As** a system,
**I want to** send SMS for critical alerts,
**So that** users are notified even when they're not in the app.

**Acceptance Criteria:**
- [ ] SMS triggers: OTP for login, payment received above threshold, LC expiry (3 days), shipment arrived, BoE out of charge
- [ ] SMS gateway: MSG91 or Twilio
- [ ] SMS templates registered with DLT (TRAI compliance for India)
- [ ] User can opt-in/out of SMS notifications
- [ ] SMS delivery status tracking

**Story Points:** 3

---

### E12-S7: Notification Preferences

**As** a user,
**I want to** configure which notifications I receive and through which channels,
**So that** I'm not overwhelmed with irrelevant alerts.

**Acceptance Criteria:**
- [ ] Per-event toggle: in-app, email, SMS
- [ ] Events grouped by category: Documents, Payments, Shipping, Compliance, System
- [ ] "Mute all" option for temporary silence
- [ ] Default preferences based on role
- [ ] Admin can set organization-wide defaults

**Story Points:** 3

---

### E12-S8: Shipment Status Notifications

**As** a buyer (external),
**I want to** receive shipment status updates automatically,
**So that** I can plan my receiving operations.

**Acceptance Criteria:**
- [ ] Triggered on: shipped, in transit, arrived at destination port, customs cleared
- [ ] Channel: email to buyer's contact
- [ ] Includes: shipment reference, vessel, ETA, container number
- [ ] Configurable: enable/disable per buyer
- [ ] Unsubscribe link in email

**Story Points:** 3

---

### E12-S9: Internal Comments / Notes

**As** an export manager,
**I want to** add internal comments on a document,
**So that** my team can collaborate without using external tools.

**Acceptance Criteria:**
- [ ] Comment thread on any document (invoice, SB, BoE, payment, etc.)
- [ ] @mention team members → triggers notification
- [ ] Comments visible to all users with access to the document
- [ ] Timestamp and author on each comment
- [ ] Not visible on PDF/external documents (internal only)
- [ ] Edit/delete own comments (within 15 min)

**Story Points:** 3

---

### E12-S10: Communication Log per Party

**As** a sales manager,
**I want to** see all communications sent to a buyer in one place,
**So that** I have a complete history of interactions.

**Acceptance Criteria:**
- [ ] Party detail page → Communication tab
- [ ] Chronological list: emails sent, WhatsApp messages, documents shared
- [ ] Filter by: channel, date range, document type
- [ ] Click entry to see full message and attachments
- [ ] Manual note entry (e.g., "Called buyer, confirmed shipment date")

**Story Points:** 3

---

## Total Story Points: 36
