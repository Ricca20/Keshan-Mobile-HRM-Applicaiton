# HRM System — Implementation Plan
## Next.js + PostgreSQL (Supabase) + Prisma

> **Target:** Full HRM module for a two-location phone shop  
> **Stack:** Next.js 14 (App Router) · PostgreSQL via Supabase · Prisma ORM · NextAuth.js · Tailwind CSS  
> **Scale:** ~10 employees, 2 shops, 1 owner  
> **Hosting:** Vercel (free) + Supabase (free tier)  
> **Anti-fake clock-in:** GPS + IP double verification

---

## Table of Contents

1. [Project Setup](#1-project-setup)
2. [Environment Variables](#2-environment-variables)
3. [Database Schema (Prisma)](#3-database-schema)
4. [Folder Structure](#4-folder-structure)
5. [Authentication](#5-authentication)
6. [Module Implementation Order](#6-module-implementation-order)
   - Phase 1 — Foundation
   - Phase 2 — Core HR
   - Phase 3 — Leave Management
   - Phase 4 — Paysheets & Reports
   - Phase 5 — Dashboards & Polish
7. [API Routes Reference](#7-api-routes-reference)
8. [Anti-Fake Clock-In Logic](#8-anti-fake-clock-in-logic)
9. [Key Business Logic Rules](#9-key-business-logic-rules)
10. [Libraries & Packages](#10-libraries--packages)
11. [Hosting & Deployment](#11-hosting--deployment)
12. [Pre-Build Checklist](#12-pre-build-checklist)
13. [AI Agent Prompting Tips](#13-ai-agent-prompting-tips)

---

## 1. Project Setup

### Commands to run in order

```bash
# Create Next.js app
npx create-next-app@latest hrm-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd hrm-app

# Install all required packages
npm install prisma @prisma/client
npm install next-auth@beta @auth/prisma-adapter
npm install bcryptjs
npm install @types/bcryptjs --save-dev
npm install xlsx
npm install date-fns
npm install zod
npm install @tanstack/react-query @tanstack/react-query-devtools
npm install recharts
npm install lucide-react
npm install clsx tailwind-merge

# Init Prisma
npx prisma init
```

After `npx prisma init`, update `prisma/schema.prisma` with the full schema in Section 3.

---

## 2. Environment Variables

Create `.env` in the project root. **Never commit this file.**

```env
# Supabase / PostgreSQL
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# NextAuth
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"

# App
NEXT_PUBLIC_APP_NAME="PhoneShop HRM"
```

For production on Vercel, add these same variables in:
`Vercel Dashboard → Project → Settings → Environment Variables`

And update `NEXTAUTH_URL` to your Vercel deployment URL.

---

## 3. Database Schema

Replace entire contents of `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  password      String
  role          Role      @default(EMPLOYEE)
  isActive      Boolean   @default(true)
  joinDate      DateTime  @default(now())
  salary        Float     @default(0)
  phone         String?
  address       String?

  shopId        String
  shop          Shop      @relation(fields: [shopId], references: [id])

  shifts        Shift[]
  clockLogs     ClockLog[]
  leaveRequests LeaveRequest[]
  leaveBalances LeaveBalance[]
  paySheets     PaySheet[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

enum Role {
  ADMIN
  EMPLOYEE
}

model Shop {
  id           String   @id @default(cuid())
  name         String
  address      String
  locationLat  Float
  locationLng  Float
  allowedIp    String
  radiusMeters Int      @default(100)

  users        User[]
  shifts       Shift[]
  clockLogs    ClockLog[]

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Shift {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  shopId      String
  shop        Shop     @relation(fields: [shopId], references: [id])
  date        DateTime @db.Date
  startTime   String   // "08:00"
  endTime     String   // "17:00"
  notes       String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([userId, date])
}

model ClockLog {
  id          String      @id @default(cuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  shopId      String
  shop        Shop        @relation(fields: [shopId], references: [id])
  type        ClockType
  timestamp   DateTime    @default(now())
  gpsLat      Float?
  gpsLng      Float?
  ipAddress   String
  isValid     Boolean     @default(false)
  flagReason  String?     // "GPS_FAIL" | "IP_FAIL" | "BOTH_FAIL" | null
  overriddenBy String?    // admin userId who manually overrode
  overrideNote String?

  createdAt   DateTime    @default(now())
}

enum ClockType {
  IN
  OUT
}

model LeaveType {
  id           String         @id @default(cuid())
  name         String         @unique // "Annual", "Sick", "Casual", "No-Pay"
  daysAllowed  Int            @default(14)
  isPaid       Boolean        @default(true)
  isActive     Boolean        @default(true)

  leaveRequests LeaveRequest[]
  leaveBalances LeaveBalance[]

  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
}

model LeaveBalance {
  id           String    @id @default(cuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id])
  leaveTypeId  String
  leaveType    LeaveType @relation(fields: [leaveTypeId], references: [id])
  year         Int
  totalDays    Int
  usedDays     Int       @default(0)

  @@unique([userId, leaveTypeId, year])
}

model LeaveRequest {
  id           String        @id @default(cuid())
  userId       String
  user         User          @relation(fields: [userId], references: [id])
  leaveTypeId  String
  leaveType    LeaveType     @relation(fields: [leaveTypeId], references: [id])
  startDate    DateTime      @db.Date
  endDate      DateTime      @db.Date
  totalDays    Int
  reason       String
  status       LeaveStatus   @default(PENDING)
  approvedBy   String?
  approverNote String?
  reviewedAt   DateTime?

  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
}

enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
}

model PaySheet {
  id           String        @id @default(cuid())
  userId       String
  user         User          @relation(fields: [userId], references: [id])
  month        Int           // 1–12
  year         Int
  baseSalary   Float
  paidDays     Int
  unpaidDays   Int
  deductions   Float         @default(0)
  bonuses      Float         @default(0)
  deductionNote String?
  bonusNote     String?
  netPay       Float
  status       PaySheetStatus @default(DRAFT)
  finalizedAt  DateTime?
  finalizedBy  String?

  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@unique([userId, month, year])
}

enum PaySheetStatus {
  DRAFT
  FINALIZED
}
```

After writing the schema, run:

```bash
npx prisma generate
npx prisma db push
```

---

## 4. Folder Structure

```
/hrm-app
├── prisma/
│   └── schema.prisma
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                    ← Root layout, fonts, providers
│   │   ├── page.tsx                      ← Redirect to /login or /dashboard
│   │   │
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx              ← Login page
│   │   │
│   │   ├── (admin)/                      ← Admin-only pages (role guard)
│   │   │   ├── layout.tsx                ← Admin sidebar/nav + role check
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── employees/
│   │   │   │   ├── page.tsx              ← List all employees
│   │   │   │   ├── new/page.tsx          ← Add employee
│   │   │   │   └── [id]/page.tsx         ← Edit employee
│   │   │   ├── shops/
│   │   │   │   └── page.tsx              ← Manage shop GPS + IP settings
│   │   │   ├── attendance/
│   │   │   │   └── page.tsx              ← Daily attendance overview
│   │   │   ├── shifts/
│   │   │   │   └── page.tsx              ← Assign shifts to employees
│   │   │   ├── leave/
│   │   │   │   ├── page.tsx              ← Pending requests + history
│   │   │   │   └── types/page.tsx        ← Configure leave types
│   │   │   ├── paysheets/
│   │   │   │   ├── page.tsx              ← Generate + manage paysheets
│   │   │   │   └── [id]/page.tsx         ← Individual paysheet detail
│   │   │   └── reports/
│   │   │       └── page.tsx              ← Monthly reports + export
│   │   │
│   │   ├── (employee)/                   ← Employee-only pages (role guard)
│   │   │   ├── layout.tsx                ← Employee nav + role check
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── clock/
│   │   │   │   └── page.tsx              ← Clock in/out button
│   │   │   ├── schedule/
│   │   │   │   └── page.tsx              ← My shifts this week
│   │   │   ├── leave/
│   │   │   │   └── page.tsx              ← My leave requests + balances
│   │   │   └── paysheet/
│   │   │       └── page.tsx              ← My finalized paysheets
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...nextauth]/route.ts
│   │       ├── clock/
│   │       │   ├── in/route.ts
│   │       │   └── out/route.ts
│   │       ├── employees/
│   │       │   ├── route.ts              ← GET list, POST create
│   │       │   └── [id]/route.ts         ← GET, PUT, DELETE
│   │       ├── shops/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── shifts/
│   │       │   └── route.ts
│   │       ├── leave/
│   │       │   ├── types/route.ts
│   │       │   ├── requests/route.ts
│   │       │   └── requests/[id]/route.ts
│   │       ├── paysheets/
│   │       │   ├── generate/route.ts
│   │       │   ├── finalize/[id]/route.ts
│   │       │   └── export/route.ts
│   │       └── reports/
│   │           └── route.ts
│   │
│   ├── components/
│   │   ├── ui/                           ← Reusable: Button, Card, Badge, Modal, Table
│   │   ├── admin/                        ← Admin-specific components
│   │   └── employee/                     ← Employee-specific components
│   │
│   ├── lib/
│   │   ├── prisma.ts                     ← Prisma client singleton
│   │   ├── auth.ts                       ← NextAuth config
│   │   ├── geo.ts                        ← GPS distance calculator
│   │   ├── ip.ts                         ← IP address extractor from request
│   │   ├── paysheet.ts                   ← Paysheet calculation logic
│   │   └── excel.ts                      ← Excel export helpers
│   │
│   ├── types/
│   │   └── index.ts                      ← Shared TypeScript types
│   │
│   └── middleware.ts                     ← Route protection by role
│
├── .env
├── .env.example
└── package.json
```

---

## 5. Authentication

### `src/lib/prisma.ts`
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ['query'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### `src/lib/auth.ts`
```typescript
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { shop: true },
        })

        if (!user || !user.isActive) return null

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        if (!passwordMatch) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          shopId: user.shopId,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.shopId = (user as any).shopId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub
        ;(session.user as any).role = token.role
        ;(session.user as any).shopId = token.shopId
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
})
```

### `src/middleware.ts`
```typescript
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl, auth: session } = req as any
  const isLoggedIn = !!session

  const isAdminRoute = nextUrl.pathname.startsWith('/admin')
  const isEmployeeRoute = nextUrl.pathname.startsWith('/employee')
  const isAuthRoute = nextUrl.pathname.startsWith('/login')

  if (!isLoggedIn && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  if (isAdminRoute && session?.user?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/employee/dashboard', nextUrl))
  }

  if (isEmployeeRoute && session?.user?.role !== 'EMPLOYEE') {
    return NextResponse.redirect(new URL('/admin/dashboard', nextUrl))
  }
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

### Seed script — create the owner account first

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create shop 1
  const shop1 = await prisma.shop.create({
    data: {
      name: 'Phone Shop - Main Branch',
      address: '123 Main Street, Colombo',
      locationLat: 6.9271,   // REPLACE with actual GPS
      locationLng: 79.8612,  // REPLACE with actual GPS
      allowedIp: '203.0.113.1',  // REPLACE with shop WiFi public IP
      radiusMeters: 100,
    },
  })

  // Create shop 2
  const shop2 = await prisma.shop.create({
    data: {
      name: 'Phone Shop - Branch 2',
      address: '456 Second Street, Colombo',
      locationLat: 6.9350,   // REPLACE with actual GPS
      locationLng: 79.8500,  // REPLACE with actual GPS
      allowedIp: '203.0.113.2',  // REPLACE with shop WiFi public IP
      radiusMeters: 100,
    },
  })

  // Create admin (owner)
  await prisma.user.create({
    data: {
      name: 'Shop Owner',
      email: 'owner@phoneshop.lk',
      password: await bcrypt.hash('changeme123', 12),
      role: 'ADMIN',
      shopId: shop1.id,
    },
  })

  // Create default leave types
  const leaveTypes = [
    { name: 'Annual Leave', daysAllowed: 14, isPaid: true },
    { name: 'Sick Leave', daysAllowed: 7, isPaid: true },
    { name: 'Casual Leave', daysAllowed: 3, isPaid: true },
    { name: 'No-Pay Leave', daysAllowed: 30, isPaid: false },
  ]

  for (const lt of leaveTypes) {
    await prisma.leaveType.create({ data: lt })
  }

  console.log('Seed complete.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
```

Add to `package.json`:
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

Run with:
```bash
npx prisma db seed
```

---

## 6. Module Implementation Order

### Phase 1 — Foundation (Days 1–2)

**Goal:** App runs, DB connected, login works, routing protected.

Tasks:
- [ ] Run setup commands from Section 1
- [ ] Configure `.env` with Supabase DB URL and NextAuth secret
- [ ] Write `prisma/schema.prisma` from Section 3
- [ ] Run `npx prisma db push` and `npx prisma db seed`
- [ ] Implement `src/lib/prisma.ts`, `src/lib/auth.ts`
- [ ] Implement `src/middleware.ts`
- [ ] Build `/login` page (email/password form, NextAuth `signIn()`)
- [ ] Build admin layout with sidebar (links to all admin sections)
- [ ] Build employee layout with navigation
- [ ] Verify role-based routing works

**Test:** Log in as owner → lands on admin dashboard. Log in as employee → lands on employee dashboard.

---

### Phase 2 — Core HR (Days 3–5)

**Goal:** Owner can manage employees and shops. Employees can clock in/out with GPS+IP verification.

#### 2a. Shop Management

API: `GET/POST /api/shops`, `PUT /api/shops/[id]`

Admin UI: Form to set shop name, address, GPS coordinates, allowed IP, radius.

**How to get the GPS coordinates:** Tell your friend to open Google Maps on his phone at each shop → long press → copy the coordinates shown at the bottom.

**How to get the shop's public IP:** Tell your friend to visit [https://whatismyip.com](https://whatismyip.com) while connected to the shop WiFi. Save that IP in the shop record.

---

#### 2b. Employee Management

API: `GET/POST /api/employees`, `GET/PUT/DELETE /api/employees/[id]`

Admin UI:
- Employee list table (name, shop, status, join date)
- Add employee form: name, email, temporary password, shop assignment, salary
- Edit employee: all fields, deactivate toggle
- Deactivating an employee: set `isActive = false`, do NOT delete — preserves all history

When creating an employee via API, hash the password before saving:
```typescript
const hashedPassword = await bcrypt.hash(temporaryPassword, 12)
```

---

#### 2c. Shift Assignment

API: `GET/POST /api/shifts`, `DELETE /api/shifts/[id]`

Admin UI:
- Weekly calendar view per shop
- Click a day + employee → assign shift (start time, end time)
- Bulk assign: assign same shift to multiple employees for a date range

---

#### 2d. Clock In / Clock Out (MOST IMPORTANT)

See full details in **Section 8** below.

Employee UI (`/employee/clock`):
- Single prominent "Clock In" button (or "Clock Out" if already clocked in)
- Shows current status, today's hours, last clock event
- Requests GPS permission on page load

Admin UI (attendance page):
- Live list: who's clocked in right now, at which shop, since when
- Flagged entries highlighted in red
- Manual override button (enter reason → mark as valid)

---

### Phase 3 — Leave Management (Days 6–8)

**Goal:** Employees request leave. Owner approves/rejects. Balances tracked.

#### 3a. Leave Types (Admin)

API: `GET/POST/PUT /api/leave/types`

Admin UI: Table of leave types with edit inline. Fields: name, days allowed per year, paid toggle, active toggle.

When a new leave type is created, automatically create `LeaveBalance` records for all active employees for the current year:
```typescript
const employees = await prisma.user.findMany({ where: { isActive: true, role: 'EMPLOYEE' } })
for (const emp of employees) {
  await prisma.leaveBalance.upsert({
    where: { userId_leaveTypeId_year: { userId: emp.id, leaveTypeId: lt.id, year: currentYear } },
    create: { userId: emp.id, leaveTypeId: lt.id, year: currentYear, totalDays: lt.daysAllowed, usedDays: 0 },
    update: {},
  })
}
```

#### 3b. Leave Requests (Employee)

API: `POST /api/leave/requests`

Employee UI:
- Form: select leave type, start date, end date, reason text
- Show current balance for selected leave type (remaining days)
- Validation: cannot select dates in the past, cannot exceed remaining balance, cannot overlap existing approved leave

On submit, calculate `totalDays` (excluding weekends — use `date-fns` `eachDayOfInterval` + filter `getDay() !== 0 && getDay() !== 6`).

#### 3c. Leave Approval (Admin)

API: `PUT /api/leave/requests/[id]` — body: `{ status: 'APPROVED' | 'REJECTED', approverNote: string }`

Admin UI:
- Pending requests list (badge count on sidebar)
- Each card: employee name, leave type, dates, total days, reason
- Approve / Reject buttons with optional note input

On approval:
1. Update `LeaveRequest.status = APPROVED`
2. Increment `LeaveBalance.usedDays` by `totalDays`
3. On rejection: do NOT change balance

On rejection after prior approval (if owner wants to undo):
1. Decrement `LeaveBalance.usedDays`

---

### Phase 4 — Paysheets & Reports (Days 9–12)

**Goal:** Owner generates monthly paysheets, finalizes them, exports to Excel.

#### 4a. Paysheet Generation Logic (src/lib/paysheet.ts)

```typescript
// Called once per employee per month
async function generatePaySheet(userId: string, month: number, year: number) {

  const user = await prisma.user.findUnique({ where: { id: userId } })

  // Get all working days in the month (Mon-Fri)
  const workingDays = getWorkingDaysInMonth(year, month) // use date-fns

  // Get approved paid leave days in this month
  const paidLeave = await prisma.leaveRequest.findMany({
    where: {
      userId,
      status: 'APPROVED',
      leaveType: { isPaid: true },
      startDate: { gte: startOfMonth },
      endDate: { lte: endOfMonth },
    },
    include: { leaveType: true }
  })
  const paidLeaveDays = sumTotalDays(paidLeave)

  // Get approved unpaid leave days
  const unpaidLeave = await prisma.leaveRequest.findMany({
    where: {
      userId,
      status: 'APPROVED',
      leaveType: { isPaid: false },
      // same date range
    },
  })
  const unpaidLeaveDays = sumTotalDays(unpaidLeave)

  // Get valid clock-in days (days where at least one valid CLOCK_IN exists)
  const clockedDays = await countValidClockDays(userId, month, year)

  // Days employee was absent (no clock in, no leave)
  const absentDays = workingDays - clockedDays - paidLeaveDays - unpaidLeaveDays

  // Paid days = working days minus unpaid leave minus absent days
  const paidDays = workingDays - unpaidLeaveDays - absentDays
  const dailyRate = user.salary / workingDays
  const deductionFromAbsence = absentDays * dailyRate
  const deductionFromUnpaid = unpaidLeaveDays * dailyRate

  const totalDeductions = deductionFromAbsence + deductionFromUnpaid
  const netPay = user.salary - totalDeductions

  return { baseSalary: user.salary, paidDays, unpaidDays: unpaidLeaveDays + absentDays,
           deductions: totalDeductions, netPay }
}
```

#### 4b. Paysheet API Routes

- `POST /api/paysheets/generate` — body: `{ month, year }` → generates for all active employees. Skips if already FINALIZED.
- `PUT /api/paysheets/[id]` — owner edits bonuses, deductions, notes on DRAFT paysheet
- `POST /api/paysheets/finalize/[id]` — locks paysheet (status = FINALIZED, records timestamp and who finalized)
- `GET /api/paysheets/export` — query: `{ month, year }` → returns Excel file

#### 4c. Excel Export (src/lib/excel.ts)

```typescript
import * as XLSX from 'xlsx'

export function generatePaysheetExcel(paysheets: PaysheetWithUser[]) {
  const rows = paysheets.map(p => ({
    'Employee': p.user.name,
    'Shop': p.user.shop.name,
    'Month': `${p.month}/${p.year}`,
    'Base Salary': p.baseSalary,
    'Paid Days': p.paidDays,
    'Unpaid Days': p.unpaidDays,
    'Deductions': p.deductions,
    'Bonuses': p.bonuses,
    'Net Pay': p.netPay,
    'Status': p.status,
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Paysheet')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}
```

In the API route, return the buffer as a file download response:
```typescript
return new Response(buffer, {
  headers: {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="paysheet-${month}-${year}.xlsx"`,
  },
})
```

---

### Phase 5 — Dashboards & Polish (Days 13–15)

#### Admin Dashboard widgets
- Today's attendance: query `ClockLog` where `type = IN` AND `timestamp >= today 00:00` AND no subsequent `OUT` — these are currently clocked-in employees
- Flagged entries count this week
- Pending leave requests count
- This month's estimated payroll total (sum of net pay from DRAFT paysheets for current month)
- Absent today: employees with a shift today but no valid clock-in

#### Employee Dashboard widgets
- Current clock status (IN / OUT)
- Today's hours worked (if clocked out: difference; if clocked in: live timer)
- This week's shifts
- Remaining leave balances per type
- Latest finalized paysheet

#### Mobile responsiveness
Employee pages (especially `/employee/clock`) MUST be mobile-friendly — employees will use their phone to clock in. Use Tailwind responsive classes (`sm:`, `md:`). The clock button should be large (minimum 80px height) and centered.

---

## 7. API Routes Reference

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/[...nextauth]` | — | NextAuth handler |
| POST | `/api/clock/in` | Employee | Clock in with GPS + IP |
| POST | `/api/clock/out` | Employee | Clock out with GPS + IP |
| GET | `/api/employees` | Admin | List all employees |
| POST | `/api/employees` | Admin | Create employee |
| GET | `/api/employees/[id]` | Admin | Get employee detail |
| PUT | `/api/employees/[id]` | Admin | Update employee |
| DELETE | `/api/employees/[id]` | Admin | Deactivate employee |
| GET | `/api/shops` | Admin | List shops |
| POST | `/api/shops` | Admin | Create shop |
| PUT | `/api/shops/[id]` | Admin | Update shop (GPS, IP) |
| GET | `/api/shifts` | Admin/Employee | Get shifts (filtered by user/date) |
| POST | `/api/shifts` | Admin | Assign shift |
| DELETE | `/api/shifts/[id]` | Admin | Remove shift |
| GET | `/api/leave/types` | Admin | List leave types |
| POST | `/api/leave/types` | Admin | Create leave type |
| PUT | `/api/leave/types/[id]` | Admin | Update leave type |
| GET | `/api/leave/requests` | Admin | All requests / Employee: own requests |
| POST | `/api/leave/requests` | Employee | Submit leave request |
| PUT | `/api/leave/requests/[id]` | Admin | Approve / Reject |
| POST | `/api/paysheets/generate` | Admin | Generate monthly paysheets |
| GET | `/api/paysheets` | Admin | List paysheets (filter by month/year) |
| PUT | `/api/paysheets/[id]` | Admin | Edit bonus/deduction on DRAFT |
| POST | `/api/paysheets/finalize/[id]` | Admin | Finalize and lock |
| GET | `/api/paysheets/export` | Admin | Download Excel |
| GET | `/api/reports` | Admin | Monthly report data |

### API route pattern — always check session and role

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // your logic here
}
```

---

## 8. Anti-Fake Clock-In Logic

This is the core security feature. Full implementation:

### `src/lib/geo.ts`
```typescript
// Haversine formula — returns distance in meters between two GPS coordinates
export function getDistanceMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000 // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
```

### `src/lib/ip.ts`
```typescript
import { NextRequest } from 'next/server'

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    '0.0.0.0'
  )
}
```

### `src/app/api/clock/in/route.ts`
```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDistanceMeters } from '@/lib/geo'
import { getClientIp } from '@/lib/ip'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const shopId = (session.user as any).shopId
  const { gpsLat, gpsLng } = await req.json()

  // Prevent double clock-in (must clock out first)
  const lastLog = await prisma.clockLog.findFirst({
    where: { userId },
    orderBy: { timestamp: 'desc' },
  })
  if (lastLog?.type === 'IN') {
    return NextResponse.json({ error: 'Already clocked in. Please clock out first.' }, { status: 400 })
  }

  // Get shop configuration
  const shop = await prisma.shop.findUnique({ where: { id: shopId } })
  if (!shop) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

  const requestIp = getClientIp(req)

  // Validation checks
  const gpsDistance = getDistanceMeters(gpsLat, gpsLng, shop.locationLat, shop.locationLng)
  const gpsPass = gpsDistance <= shop.radiusMeters
  const ipPass = requestIp === shop.allowedIp

  const isValid = gpsPass && ipPass

  let flagReason: string | null = null
  if (!gpsPass && !ipPass) flagReason = 'BOTH_FAIL'
  else if (!gpsPass) flagReason = 'GPS_FAIL'
  else if (!ipPass) flagReason = 'IP_FAIL'

  // Always save the log regardless of validity
  const log = await prisma.clockLog.create({
    data: {
      userId,
      shopId,
      type: 'IN',
      gpsLat,
      gpsLng,
      ipAddress: requestIp,
      isValid,
      flagReason,
    },
  })

  if (!isValid) {
    return NextResponse.json({
      success: false,
      flagReason,
      message: flagReason === 'GPS_FAIL'
        ? 'You are not at the registered shop location.'
        : flagReason === 'IP_FAIL'
        ? 'You are not connected to the shop WiFi.'
        : 'Location and network check failed.',
    }, { status: 403 })
  }

  return NextResponse.json({ success: true, log })
}
```

### Employee Clock UI (key part — `src/app/(employee)/clock/page.tsx`)
```typescript
'use client'

const handleClockIn = async () => {
  // 1. Request GPS — MUST be HTTPS
  if (!navigator.geolocation) {
    setError('GPS not supported on this device.')
    return
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords
      const res = await fetch('/api/clock/in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gpsLat: latitude, gpsLng: longitude }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus('IN')
        setMessage('Clocked in successfully.')
      } else {
        setMessage(data.message)
      }
    },
    (err) => {
      setError('GPS permission denied. Please allow location access.')
    },
    { enableHighAccuracy: true, timeout: 10000 }
  )
}
```

---

## 9. Key Business Logic Rules

These rules must be enforced at the API level (not just UI):

| Rule | Where to enforce |
|------|-----------------|
| Employee cannot clock in twice without clocking out | `POST /api/clock/in` — check last log type |
| Finalized paysheets cannot be edited | `PUT /api/paysheets/[id]` — check status before allowing update |
| Leave request cannot exceed remaining balance | `POST /api/leave/requests` — query LeaveBalance before creating |
| Leave dates cannot overlap with existing approved leave | `POST /api/leave/requests` — check for overlapping date range |
| Leave start date cannot be in the past | `POST /api/leave/requests` — compare with today |
| Admin manual clock override must have a reason | `PUT /api/clock/[id]/override` — require `overrideNote` field |
| Deactivated employees cannot log in | `authorize()` in `auth.ts` — check `isActive` |
| Only the paysheet's employee can view their own paysheet | `GET /api/paysheets/[id]` — compare userId with session |

---

## 10. Libraries & Packages

| Package | Purpose |
|---------|---------|
| `next-auth@beta` | Authentication, sessions, role management |
| `@auth/prisma-adapter` | NextAuth ↔ Prisma integration |
| `@prisma/client` | Type-safe DB queries |
| `bcryptjs` | Password hashing |
| `xlsx` | Generate and export Excel files |
| `date-fns` | Date math — leave day counting, working day calculations |
| `zod` | Input validation on all API routes |
| `@tanstack/react-query` | Data fetching, caching, refetch on focus |
| `recharts` | Charts for dashboards (attendance trends, hours) |
| `lucide-react` | Icons |
| `clsx` + `tailwind-merge` | Conditional Tailwind class merging |

---

## 11. Hosting & Deployment

### Step 1 — Supabase (Database)

1. Go to [supabase.com](https://supabase.com) → New project
2. Save the database password
3. Go to Settings → Database → copy the **Connection string (URI)**
4. Paste into `.env` as `DATABASE_URL`
5. Run `npx prisma db push` to create tables
6. Run `npx prisma db seed` to create owner account + default data

### Step 2 — GitHub

```bash
git init
git add .
git commit -m "initial commit"
gh repo create hrm-app --private --push
```

### Step 3 — Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Add all environment variables from `.env` (Settings → Environment Variables)
3. Set `NEXTAUTH_URL` to your Vercel URL (e.g. `https://hrm-app.vercel.app`)
4. Deploy

Every `git push` to `main` auto-deploys.

### Custom Domain (Optional, free via Vercel)

Vercel gives you a free `.vercel.app` subdomain. If your friend wants a custom domain (e.g. `hrm.phoneshop.lk`), he can register one at [Cloudflare](https://cloudflare.com) for ~$10/year and point it to Vercel.

---

## 12. Pre-Build Checklist

Before writing any code, confirm these with your friend:

- [ ] GPS coordinates of Shop 1 (open Google Maps at shop → long press → copy lat/lng)
- [ ] GPS coordinates of Shop 2 (same process)
- [ ] Public IP of Shop 1 WiFi (visit whatismyip.com on shop WiFi)
- [ ] Public IP of Shop 2 WiFi (same process)
- [ ] Ask ISP for static IP on both shop WiFi lines — or set up dynamic DNS
- [ ] Decide working hours (e.g. Mon–Sat, 9am–6pm)
- [ ] Confirm leave entitlements (annual leave days, sick leave days per year)
- [ ] Confirm if weekends count as working days (affects paysheet calculation)
- [ ] Owner email and initial password for the admin account
- [ ] Final app name / branding

---

## 13. AI Agent Prompting Tips

When using an AI agent (Cursor, GitHub Copilot, Claude Code) to build this:

### Give context upfront in every session
> "I am building an HRM web app with Next.js 14 App Router, TypeScript, Prisma with PostgreSQL (Supabase), NextAuth.js v5, and Tailwind CSS. The app has two roles: ADMIN (owner) and EMPLOYEE. I have the full Prisma schema already set up."

### Build one module at a time
Do not ask the agent to build everything at once. Use this pattern:
> "Build the `POST /api/clock/in` API route. It must: (1) check session, (2) get GPS lat/lng from request body, (3) get client IP from headers, (4) load the shop from DB using the user's shopId, (5) check GPS distance using the Haversine formula, (6) compare IP to shop.allowedIp, (7) save a ClockLog record with isValid and flagReason, (8) return success or error with a message."

### Always specify return types
> "Return a typed NextResponse. Use Zod to validate the request body."

### Ask for error handling explicitly
> "Include proper try/catch. Return 400 for validation errors, 401 for unauthenticated, 403 for forbidden, 500 for server errors."

### Review before moving on
After each module: ask the agent to write a summary of what was built and list any edge cases not yet handled.

---

*Document version: 1.0 — Generated for PhoneShop HRM project*
