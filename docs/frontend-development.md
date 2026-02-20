# EXIM — Frontend Development Guide

**Version:** 1.0
**Date:** February 2026
**Status:** Active

---

## Table of Contents

1. [Project Setup](#1-project-setup)
2. [Design System](#2-design-system)
3. [Design Tokens](#3-design-tokens)
4. [Theme Configuration](#4-theme-configuration)
5. [Components](#5-components)
6. [Storybook](#6-storybook)
7. [Development Workflow](#7-development-workflow)
8. [Architecture Decisions](#8-architecture-decisions)
9. [UI/UX Implementation Guidelines](#9-uiux-implementation-guidelines) ⭐ Read before writing any UI code

---

## 1. Project Setup

### Prerequisites

- Node.js v20+
- pnpm 9.x

### Installation

```bash
pnpm install
```

### Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start all apps in dev mode (Next.js at http://localhost:3000) |
| `pnpm storybook` | Start Storybook at http://localhost:6006 |
| `pnpm build` | Build all packages and apps |
| `pnpm build-storybook` | Build static Storybook site |
| `pnpm lint` | Type-check all packages |

### Filtered Commands

Run commands for specific packages:

```bash
pnpm --filter @exim/ui storybook     # Storybook only
pnpm --filter web dev                # Next.js app only
pnpm --filter @exim/shared build     # Build shared package
```

### Workspace Packages

| Package | Path | Description |
|---|---|---|
| `web` | `apps/web/` | Next.js 15 application (App Router + Turbopack) |
| `@exim/ui` | `packages/ui/` | Design system — tokens, theme, components, Storybook |
| `@exim/shared` | `packages/shared/` | Shared types, constants, validation schemas |

---

## 2. Design System

The design system lives in `packages/ui/` and is published as `@exim/ui`. It wraps Ant Design 5 with EXIM-specific theming and custom components.

### Directory Structure

```
packages/ui/
├── .storybook/
│   ├── main.ts               # Storybook config (Vite, addons)
│   └── preview.tsx            # Global decorators (ThemeProvider)
└── src/
    ├── tokens/                # Design tokens
    │   ├── colors.ts          # Color palette
    │   ├── typography.ts      # Font family, sizes, weights
    │   ├── spacing.ts         # 4px grid, border radius
    │   ├── shadows.ts         # Elevation levels
    │   ├── antdTheme.ts       # Ant Design ConfigProvider theme
    │   └── index.ts
    ├── theme/
    │   └── ThemeProvider.tsx   # App-level theme wrapper
    ├── components/            # UI components + stories
    │   ├── Button.tsx
    │   ├── Button.stories.tsx
    │   ├── StatusBadge.tsx
    │   ├── StatusBadge.stories.tsx
    │   ├── CurrencyDisplay.tsx
    │   ├── CurrencyDisplay.stories.tsx
    │   ├── DocumentCard.tsx
    │   ├── DocumentCard.stories.tsx
    │   ├── PageHeader.tsx
    │   ├── PageHeader.stories.tsx
    │   ├── StatCard.tsx
    │   ├── StatCard.stories.tsx
    │   ├── DataTable.tsx
    │   ├── DataTable.stories.tsx
    │   ├── EmptyState.tsx
    │   ├── EmptyState.stories.tsx
    │   └── index.ts
    ├── stories/               # Foundation documentation stories
    │   ├── Colors.stories.tsx
    │   ├── Typography.stories.tsx
    │   ├── Spacing.stories.tsx
    │   └── Shadows.stories.tsx
    └── index.ts               # Public API exports
```

### Usage in Apps

```tsx
// apps/web/app/layout.tsx
import { ThemeProvider } from '@exim/ui';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

```tsx
// Any page or component
import { Button, StatCard, DocumentCard, colors } from '@exim/ui';
import { DocumentStatus } from '@exim/shared';
```

---

## 3. Design Tokens

All visual design decisions are defined as TypeScript constants in `packages/ui/src/tokens/`. These tokens feed into Ant Design's theme system and are available for custom styling.

### 3.1 Colors

**File:** `packages/ui/src/tokens/colors.ts`

#### Primary — Indigo / Royal Blue

The primary palette conveys trust and professionalism, suitable for a financial/trade platform.

| Token | Hex | Usage |
|---|---|---|
| `primary.50` | `#EEF2FF` | Backgrounds, hover states |
| `primary.100` | `#E0E7FF` | Active backgrounds, focus rings |
| `primary.200` | `#C7D2FE` | Borders, dividers |
| `primary.300` | `#A5B4FC` | Decorative |
| `primary.400` | `#818CF8` | Icons, secondary actions |
| `primary.500` | `#6366F1` | Hover state |
| `primary.600` | `#4F46E5` | **Primary buttons, links, active elements** |
| `primary.700` | `#4338CA` | Pressed state |
| `primary.800` | `#3730A3` | High-contrast text |
| `primary.900` | `#312E81` | Dark backgrounds |
| `primary.950` | `#1E1B4B` | Darkest |

#### Semantic Colors

| Scale | Usage |
|---|---|
| `success` (Green) | Approved, cleared, delivered, positive trends |
| `warning` (Amber) | Pending, amendments, alerts, expiring items |
| `danger` (Red) | Errors, rejected, overdue, cancelled |
| `info` (Blue) | Informational messages, processing states |
| `neutral` (Slate) | Text, borders, backgrounds, disabled states |

#### Module Accent Colors

Each major product module has a distinct accent for visual orientation:

| Module | Color | Accent Token | Example Hex |
|---|---|---|---|
| Export | Emerald | `module.export` | `#059669` (600) |
| Import | Orange | `module.import` | `#EA580C` (600) |
| Finance | Violet | `module.finance` | `#7C3AED` (600) |
| Shipping | Cyan | `module.shipping` | `#0891B2` (600) |

These accents are used in:
- `Button` component `intent` prop (`export`, `import`, `finance`)
- `StatCard` component `accentColor` prop (top border)
- Sidebar navigation active indicators
- Module-specific page accents

### 3.2 Typography

**File:** `packages/ui/src/tokens/typography.ts`

| Token | Value | Usage |
|---|---|---|
| `fontFamily.sans` | `'Inter', -apple-system, ...` | All UI text |
| `fontFamily.mono` | `'JetBrains Mono', 'Fira Code', ...` | Code, HS codes, reference numbers |
| `fontSize.xs` | `0.75rem` (12px) | Captions, timestamps |
| `fontSize.sm` | `0.8125rem` (13px) | Secondary text, table cells |
| `fontSize.base` | `0.875rem` (14px) | Default body text (antd default) |
| `fontSize.md` | `1rem` (16px) | Card titles, emphasis |
| `fontSize.lg` | `1.125rem` (18px) | Section headers |
| `fontSize.xl` | `1.25rem` (20px) | Page subtitles |
| `fontSize.2xl` | `1.5rem` (24px) | Page titles |
| `fontSize.3xl` | `1.875rem` (30px) | Hero headings |
| `fontSize.4xl` | `2.25rem` (36px) | Dashboard KPIs |
| `fontWeight.regular` | 400 | Body text |
| `fontWeight.medium` | 500 | Buttons, labels |
| `fontWeight.semibold` | 600 | Headings, card titles |
| `fontWeight.bold` | 700 | KPI values, strong emphasis |

### 3.3 Spacing

**File:** `packages/ui/src/tokens/spacing.ts`

Based on a **4px grid system**. Key values:

| Token | Value | Common Usage |
|---|---|---|
| `1` | `4px` | Tight gaps (inline elements) |
| `2` | `8px` | Icon-to-text gap, compact lists |
| `3` | `12px` | Small padding (tags, badges) |
| `4` | `16px` | Default padding (cards, inputs) |
| `5` | `20px` | Medium spacing |
| `6` | `24px` | Section padding, large gaps |
| `8` | `32px` | Page section margins |
| `12` | `48px` | Empty state padding |

#### Border Radius

| Token | Value | Usage |
|---|---|---|
| `sm` | `4px` | Tags, badges, small elements |
| `md` | `6px` | Buttons, inputs (antd default) |
| `lg` | `8px` | Cards, dropdowns |
| `xl` | `12px` | Modals, large cards |
| `full` | `9999px` | Pills, avatars |

### 3.4 Shadows

**File:** `packages/ui/src/tokens/shadows.ts`

| Token | Usage |
|---|---|
| `none` | Flat elements |
| `xs` | Subtle depth (buttons resting) |
| `sm` | Cards, dropdowns |
| `md` | Popovers, floating panels |
| `lg` | Modals, dialogs |
| `xl` | Drawers, high-elevation overlays |

---

## 4. Theme Configuration

**File:** `packages/ui/src/tokens/antdTheme.ts`

The Ant Design 5 theme is configured using a `ThemeConfig` object that maps EXIM design tokens to antd's token system. This ensures every antd component (Button, Table, Input, Card, Menu, Layout, etc.) uses the EXIM palette automatically.

### Key Overrides

#### Global Tokens

- Primary colors mapped from `colors.primary` scale
- Semantic colors (success, warning, error, info) mapped from respective scales
- Font family set to Inter
- Base font size: 14px
- Control heights: 28px (SM), 36px (default), 44px (LG)
- Border radius: 4px (SM), 6px (default), 8px (LG)

#### Component-Level Tokens

| Component | Customization |
|---|---|
| **Button** | `fontWeight: 500`, no primary shadow |
| **Table** | Slate header background, indigo hover, light borders |
| **Card** | Header font size 16px |
| **Menu** | Indigo selected background and text |
| **Layout** | Dark sidebar (`neutral.900`), white header |
| **Input** | Indigo focus ring (`primary.100`) |

### ThemeProvider

**File:** `packages/ui/src/theme/ThemeProvider.tsx`

Wraps antd's `ConfigProvider` and `App` components:

```tsx
import { ThemeProvider } from '@exim/ui';

// Wrap your app root
<ThemeProvider>
  <App />
</ThemeProvider>
```

The `App` wrapper from antd is included to enable `message`, `notification`, and `modal` static methods within the theme context.

---

## 5. Components

### 5.1 Button

**File:** `packages/ui/src/components/Button.tsx`

Extends antd `Button` with an `intent` prop for module-specific coloring.

```tsx
import { Button } from '@exim/ui';

<Button intent="primary">Save Invoice</Button>
<Button intent="export">Ship Goods</Button>
<Button intent="import">File BoE</Button>
<Button intent="finance">Record Payment</Button>
<Button intent="danger">Cancel</Button>
<Button intent="default">Back</Button>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `intent` | `'primary' \| 'default' \| 'export' \| 'import' \| 'finance' \| 'danger'` | `'primary'` | Visual intent/module color |
| ...rest | `AntButtonProps` | — | All standard antd Button props |

### 5.2 StatusBadge

**File:** `packages/ui/src/components/StatusBadge.tsx`

Renders a color-coded `Tag` for document statuses. Colors are driven by `DocumentStatusConfig` from `@exim/shared`.

```tsx
import { StatusBadge } from '@exim/ui';

<StatusBadge status="filed" />
<StatusBadge status="approved" size="small" />
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `status` | `DocumentStatusType` | — | One of: draft, pending, filed, assessed, approved, rejected, cleared, shipped, delivered, cancelled, amended |
| `size` | `'small' \| 'default'` | `'default'` | Badge size |

### 5.3 CurrencyDisplay

**File:** `packages/ui/src/components/CurrencyDisplay.tsx`

Displays formatted currency amounts with symbol, code, and optional INR equivalent. Uses the Indian numbering system (lakh/crore format via `en-IN` locale).

```tsx
import { CurrencyDisplay } from '@exim/ui';

<CurrencyDisplay amount={25000} currencyCode="USD" />
<CurrencyDisplay amount={25000} currencyCode="USD" inrEquivalent={2075000} />
<CurrencyDisplay amount={25000} currencyCode="USD" size="large" />
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `amount` | `number` | — | Numeric amount |
| `currencyCode` | `string` | — | ISO currency code (USD, EUR, INR, etc.) |
| `inrEquivalent` | `number` | — | Optional INR converted value (shown below) |
| `showCode` | `boolean` | `true` | Show currency code next to amount |
| `size` | `'small' \| 'default' \| 'large'` | `'default'` | Display size |

### 5.4 DocumentCard

**File:** `packages/ui/src/components/DocumentCard.tsx`

Compact card summarizing a trade document — shows type icon, document number, status, party name, date, and optional amount.

```tsx
import { DocumentCard } from '@exim/ui';

<DocumentCard
  documentType="commercial_invoice"
  documentNumber="EXP/INV/2026/0042"
  date="17 Feb 2026"
  status="approved"
  partyName="Global Traders LLC"
  amount="$ 25,000.00"
  onClick={() => router.push('/invoices/42')}
/>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `documentType` | `DocumentTypeValue` | — | Type from `@exim/shared` (commercial_invoice, shipping_bill, etc.) |
| `documentNumber` | `string` | — | Display number |
| `date` | `string` | — | Formatted date string |
| `status` | `DocumentStatusType` | — | Document status |
| `partyName` | `string` | — | Buyer/supplier name |
| `amount` | `string` | — | Optional formatted amount string |
| `onClick` | `() => void` | — | Click handler (card becomes hoverable) |

### 5.5 PageHeader

**File:** `packages/ui/src/components/PageHeader.tsx`

Consistent page header with optional breadcrumbs, subtitle, and action buttons.

```tsx
import { PageHeader, Button } from '@exim/ui';

<PageHeader
  title="Export Invoices"
  subtitle="12 pending approval"
  breadcrumbs={[
    { label: 'Home', href: '/' },
    { label: 'Exports', href: '/exports' },
    { label: 'Invoices' },
  ]}
  actions={<Button intent="primary">New Invoice</Button>}
/>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | — | Page title |
| `subtitle` | `string` | — | Optional subtitle/description |
| `breadcrumbs` | `BreadcrumbItem[]` | — | Breadcrumb trail (`{ label, href? }`) |
| `actions` | `ReactNode` | — | Action buttons (right-aligned) |

### 5.6 StatCard

**File:** `packages/ui/src/components/StatCard.tsx`

Dashboard KPI card with value, trend indicator, and module accent color.

```tsx
import { StatCard, colors } from '@exim/ui';
import { ExportOutlined } from '@ant-design/icons';

<StatCard
  label="Total Exports (YTD)"
  value="$2.4M"
  trend={{ direction: 'up', percentage: 12.5, label: 'vs last year' }}
  icon={<ExportOutlined />}
  accentColor={colors.module.export[600]}
/>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | KPI label |
| `value` | `string` | — | Formatted value |
| `trend` | `{ direction, percentage, label? }` | — | Optional trend indicator |
| `icon` | `ReactNode` | — | Optional icon |
| `accentColor` | `string` | `primary.600` | Top border color |

### 5.7 DataTable

**File:** `packages/ui/src/components/DataTable.tsx`

Thin wrapper around antd `Table` with sensible defaults for the platform — pagination with size changer, total count, and middle size.

```tsx
import { DataTable } from '@exim/ui';

<DataTable
  columns={columns}
  dataSource={invoices}
  pageSize={20}
/>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `pageSize` | `number` | `10` | Rows per page |
| `pagination` | `false \| TablePaginationConfig` | — | Override or disable pagination |
| ...rest | `TableProps<T>` | — | All standard antd Table props |

Default pagination shows: size changer (10/20/50/100), total count ("1-10 of 42").

### 5.8 EmptyState

**File:** `packages/ui/src/components/EmptyState.tsx`

Consistent empty state for lists and search results with optional action button.

```tsx
import { EmptyState } from '@exim/ui';

<EmptyState
  title="No invoices yet"
  description="Create your first export invoice to get started."
  actionLabel="Create Invoice"
  onAction={() => router.push('/invoices/new')}
/>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | `'No data'` | Empty state title |
| `description` | `string` | `'There are no items to display.'` | Description text |
| `icon` | `ReactNode` | `<InboxOutlined />` | Custom icon |
| `actionLabel` | `string` | — | CTA button label |
| `onAction` | `() => void` | — | CTA click handler |

---

## 6. Storybook

Storybook serves as the living documentation for the design system. It is configured in `packages/ui/.storybook/`.

### Running Storybook

```bash
pnpm storybook          # http://localhost:6006
pnpm build-storybook    # Static build to storybook-static/
```

### Story Organization

```
Foundation/
  ├── Colors         # Full color palette with swatches
  ├── Typography     # Font samples, headings, sizes, weights
  ├── Spacing        # Spacing scale visualization, border radius
  └── Shadows        # Elevation level preview

Components/
  ├── Button         # All intents, sizes, icons, loading, disabled
  ├── StatusBadge    # All 11 document statuses, both sizes
  ├── CurrencyDisplay # Multiple currencies, INR equivalent, sizes
  ├── DocumentCard   # All document types, statuses, clickable
  ├── PageHeader     # With/without breadcrumbs, actions, subtitle
  ├── StatCard       # KPI cards, trends, module accents
  ├── DataTable      # Invoice table with sorting, pagination
  └── EmptyState     # No data, no results, with/without action
```

### Configuration

**`packages/ui/.storybook/main.ts`** — Uses `@storybook/react-vite` framework, loads stories from `src/**/*.stories.tsx`.

**`packages/ui/.storybook/preview.tsx`** — Wraps all stories in `ThemeProvider` so components render with the EXIM theme.

### Writing New Stories

Place story files alongside components:

```
src/components/
  MyComponent.tsx
  MyComponent.stories.tsx
```

Story template:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { MyComponent } from './MyComponent';

const meta: Meta<typeof MyComponent> = {
  title: 'Components/MyComponent',
  component: MyComponent,
  argTypes: {
    // control definitions
  },
};

export default meta;
type Story = StoryObj<typeof MyComponent>;

export const Default: Story = {
  args: {
    // default props
  },
};
```

---

## 7. Development Workflow

### Adding a New Component

1. Create `packages/ui/src/components/MyComponent.tsx`
2. Create `packages/ui/src/components/MyComponent.stories.tsx`
3. Export from `packages/ui/src/components/index.ts`
4. Export from `packages/ui/src/index.ts`
5. Verify in Storybook

### Using Design Tokens in Custom Styles

```tsx
import { colors, spacing, typography } from '@exim/ui';

const styles = {
  container: {
    padding: spacing[4],        // 16px
    color: colors.neutral[700],
    fontFamily: typography.fontFamily.sans,
    borderLeft: `3px solid ${colors.module.export[600]}`,
  },
};
```

### Shared Constants

Import document types, statuses, and currencies from `@exim/shared`:

```tsx
import {
  DocumentStatus,
  DocumentStatusConfig,
  DocumentType,
  DocumentTypeConfig,
  currencies,
} from '@exim/shared';

// Get status label and color
const config = DocumentStatusConfig[DocumentStatus.FILED];
// → { label: 'Filed', color: 'processing' }

// Get document type label
const typeConfig = DocumentTypeConfig[DocumentType.SHIPPING_BILL];
// → { label: 'Shipping Bill', shortLabel: 'SB' }

// Get currency info
const usd = currencies['USD'];
// → { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2 }
```

---

## 8. Architecture Decisions

### Why Ant Design over Shadcn/ui?

- **Data tables** — antd Table has built-in sorting, filtering, pagination, row selection, expandable rows. Critical for invoice registers, import/export lists.
- **Complex forms** — antd Form has field-level validation, dynamic fields, form arrays. Needed for invoice line items, LC document checklists.
- **Enterprise components** — Tree (HS code hierarchy), Cascader (port selection), DatePicker (with range), Transfer, Steps (document workflow). All built-in.
- **Theming** — antd 5's token system allows deep customization without CSS overrides.

### Why Tailwind alongside antd?

Tailwind handles layout and custom spacing/positioning that antd's grid and Space components don't cover well. It's not used for component styling (antd handles that) but for page layouts, custom sections, and one-off utility needs.

### Why Storybook over Docusaurus/custom docs?

- Interactive component playground with controls
- Visual regression testing integration
- Industry standard for design system documentation
- Auto-generated prop tables from TypeScript types

### Why structured template config over drag-and-drop?

Export-import documents have rigid, standardized structures. A config-driven approach (logo placement, column visibility, terms text, numbering format) gives tenants meaningful customization without the complexity of building and maintaining a full template designer.

---

## 9. UI/UX Implementation Guidelines

> **⭐ Mandatory process:** Before implementing any new page, feature, or UI component, invoke the `ux-ui-designer` skill to review the design approach. This prevents inconsistencies, wasted effort, and rework. The skill should be consulted during planning — not after the fact.
>
> Use the skill for: new page layouts, new form patterns, new table actions, new navigation items, any component that involves user decision-making.

---

### 9.1 Button Hierarchy — The Most Critical Rule

The `@exim/ui` `Button` component defaults to `intent="primary"` (filled indigo) when no `intent` is specified. **This means every `<Button>` without an explicit intent renders as a primary CTA.** Always declare intent explicitly.

#### One Primary Action Per Section

Every view section (page header, drawer footer, table row) may have **at most one** visually primary action. All others must be `intent="default"`.

```tsx
// ✅ CORRECT — clear visual hierarchy
<Space>
  <Button intent="default" icon={<DownloadOutlined />}>Export CSV</Button>
  <Button intent="default" icon={<UploadOutlined />}>Import</Button>
  <Button intent="primary" icon={<PlusOutlined />}>New Invoice</Button>  {/* ONE primary */}
</Space>

// ❌ WRONG — three indigo-filled buttons competing
<Space>
  <Button icon={<DownloadOutlined />}>Export CSV</Button>   {/* defaults to primary */}
  <Button icon={<UploadOutlined />}>Import</Button>         {/* defaults to primary */}
  <Button intent="primary" icon={<PlusOutlined />}>New Invoice</Button>
</Space>
```

#### Button Intent Decision Table

| Situation | Intent | Visual |
|---|---|---|
| Main page CTA ("New …") | `primary` or module intent (see below) | Filled indigo |
| Export module CTA | `export` | Filled emerald |
| Import module CTA | `import` | Filled orange |
| Finance module CTA | `finance` | Filled violet |
| Secondary / utility ("Cancel", "Back", "Close") | `default` | Outlined |
| Drawer footer Cancel | `default` | Outlined |
| Row-level Edit, View, History, Update Status | `default` | Outlined |
| Table footer "Add Line", "Add Package" | `default` | Outlined |
| Destructive action (Delete, Remove) | `danger` | Filled red |
| Irreversible but positive (Finalize, Archive) | `primary` wrapped in `Popconfirm` | Filled indigo + confirmation |

#### Module Accent CTAs

When users are already in a module context, use the module's accent color for primary create actions:

```tsx
// In an Exports page:
<Button intent="export" icon={<PlusOutlined />}>New Packing List</Button>

// In an Imports page:
<Button intent="import" icon={<PlusOutlined />}>New Purchase Order</Button>

// At the dashboard level (cross-module), use primary:
<Button intent="primary" icon={<PlusOutlined />}>New Document</Button>
```

---

### 9.2 Status Display — Always Use `StatusBadge`

Never use raw `<Tag color="...">` for document statuses. Use `<StatusBadge>` from `@exim/ui`, which reads from the central `DocumentStatusConfig` in `@exim/shared`.

```tsx
// ✅ CORRECT
import { StatusBadge } from '@exim/ui';
<StatusBadge status="filed" />
<StatusBadge status="assessed" size="small" />

// ❌ WRONG — hardcoded colors, not using design system
const STATUS_COLOR = { FILED: 'processing', ASSESSED: 'cyan' };
<Tag color={STATUS_COLOR[record.status]}>{record.status}</Tag>
```

If a new status type is required, add it to `DocumentStatusConfig` in `packages/shared/src/constants/documentStatuses.ts` first, then use `StatusBadge`.

---

### 9.3 Empty States — Always Use `EmptyState`

When a data table has no records, use the `EmptyState` component from `@exim/ui` via the antd Table's `locale.emptyText` prop.

```tsx
import { EmptyState, Button } from '@exim/ui';
import { PlusOutlined } from '@ant-design/icons';

<Table
  dataSource={records}
  locale={{
    emptyText: statusFilter
      // Filter-active empty state: no CTA, explain why
      ? <EmptyState message="No results match your filters" />
      // First-run empty state: give clear next action
      : (
        <EmptyState
          message="No packing lists yet"
          description="Create your first packing list to get started."
          action={
            <Button intent="export" icon={<PlusOutlined />} onClick={() => openDrawer()}>
              Create First
            </Button>
          }
        />
      ),
  }}
/>
```

Rules:
- **Filter-active empty**: "No results match your filters" — no create CTA (the user applied a filter, not a setup step)
- **First-run empty**: Descriptive copy + create CTA in the module's accent color
- Never leave the Ant Design default empty graphic without a meaningful message

---

### 9.4 Color Tokens — Never Hardcode Colors

Import `colors` from `@exim/ui` and use the token. Never use hex literals, `rgba()` strings, or named CSS colors inline.

```tsx
// ✅ CORRECT
import { colors } from '@exim/ui';
<span style={{ color: colors.neutral[500] }}>Secondary text</span>
<div style={{ background: colors.neutral[100] }}>Page background</div>
<Text style={{ color: colors.primary[600] }}>Brand link</Text>

// ❌ WRONG — hardcoded magic strings
<span style={{ color: '#888' }}>Secondary text</span>
<div style={{ background: '#f5f5f5' }}>Page background</div>
<Text style={{ color: '#4F46E5' }}>Brand link</Text>
```

#### Common Token Reference

| Purpose | Token |
|---|---|
| Primary brand / links | `colors.primary[600]` |
| Page / content background | `colors.neutral[100]` |
| Card / surface | `colors.white` |
| Primary text | `colors.neutral[900]` |
| Secondary text | `colors.neutral[500]` |
| Placeholder / disabled | `colors.neutral[400]` |
| Faint / muted | `colors.neutral[300]` |
| Borders | `colors.neutral[200]` |
| Dark sidebar | `colors.primary[950]` |
| Success indicators | `colors.success[600]` |
| Warning indicators | `colors.warning[500]` |
| Error / danger | `colors.danger[600]` |

---

### 9.5 Confirmations — Required for Irreversible Actions

Any action that **cannot be undone** must be wrapped in a `Popconfirm` before calling the API. This includes:

- **Finalize** — document transitions from editable to read-only
- **Convert** — proforma → commercial invoice
- **Delete** — permanent removal
- **Status transitions** that skip states or lock records
- **Suspend / Expire** — tenant status changes (admin)

```tsx
// ✅ CORRECT
<Popconfirm
  title="Finalize this packing list?"
  description="This cannot be undone. The packing list will become read-only."
  onConfirm={() => doFinalize(record.id)}
  okText="Finalize"
>
  <Button intent="primary" icon={<CheckOutlined />} aria-label="Finalize" />
</Popconfirm>

// ❌ WRONG — one-click irreversible action
<Button icon={<CheckOutlined />} onClick={() => doFinalize(record.id)} />
```

Actions that are easily reversible (e.g., filter changes, form edits, pagination) do **not** need confirmation.

---

### 9.6 Accessibility — `aria-label` on All Icon-Only Buttons

Every `<Button>` that contains only an icon (no visible text) must have an `aria-label`. This is required for WCAG 2.1 AA compliance and screen reader support.

```tsx
// ✅ CORRECT
<Button size="small" icon={<EditOutlined />} aria-label="Edit" />
<Button size="small" icon={<DeleteOutlined />} danger aria-label="Delete" />
<Button size="small" icon={<CheckOutlined />} aria-label="Finalize" />

// ❌ WRONG — no accessible name
<Button size="small" icon={<EditOutlined />} />
```

Buttons with visible text labels do not need `aria-label`.

---

### 9.7 Drawer Width Standards

Use these three widths consistently. Do not use arbitrary values (860, 900, etc.):

| Tier | Width | Use for |
|---|---|---|
| Standard | `640px` | Simple forms ≤ 10 fields, no inline tables (party detail, user invite, tenant detail) |
| Wide | `960px` | Complex forms with inline editable tables (invoices, packing lists, shipping bills) |
| Narrow | `480px` | Simple confirmation / info drawers (rarely needed; prefer Modal for confirmations) |

---

### 9.8 Page Structure Checklist

Before submitting a new page, verify:

- [ ] `PageHeader` used with `breadcrumbs` and `actions`
- [ ] Page-level CTA uses the correct module intent (`export`, `import`, `finance`, or `primary`)
- [ ] All secondary/utility buttons have `intent="default"`
- [ ] All destructive buttons have `intent="danger"` or `danger` prop
- [ ] Drawer Cancel/Close button has `intent="default"`
- [ ] Table footer "Add …" buttons have `intent="default"`
- [ ] All icon-only buttons have `aria-label`
- [ ] Irreversible actions are wrapped in `Popconfirm`
- [ ] Empty table state uses `EmptyState` component
- [ ] Document statuses use `<StatusBadge>` not raw `<Tag>`
- [ ] No hardcoded hex/rgba color strings — use `colors.*` tokens
- [ ] Drawer width is 640px or 960px (not an arbitrary value)
- [ ] `tsc --noEmit` passes clean before committing

---

**Document Version:** 1.1
**Last Updated:** February 2026

---

*This is a living document. Update it when adding new components, tokens, or patterns to the design system.*
