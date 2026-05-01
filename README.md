# SplitMint 

> A full-stack debt settlement app — split expenses with friends, track balances, and settle debts with minimal transactions.

**Live Demo:** [splitmint.vercel.app](https://splitmint-next.vercel.app/) &nbsp;|&nbsp; **Backend (Legacy):** Deployed on AWS Lambda

---

## What It Does

SplitMint lets you create groups, add shared expenses, and automatically calculates who owes who — and how much. The settlement engine minimizes the number of transactions needed to clear all debts.

- Create a group (up to 4 people)
- Add expenses with Equal, Percentage, or Custom splits
- View real-time net balances per participant
- One-click debt settlement with full audit trail
- Protected dashboard — only accessible when logged in

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | Supabase Auth |
| Database | Supabase (PostgreSQL) |
| ORM | Supabase JS Client |
| Deployment | Vercel |
| CI/CD | GitHub → Vercel (auto-deploy) |

---

## Architecture

```
app/
├── login/
│   ├── page.tsx          # Login UI (useActionState)
│   └── actions.ts        # Server Action — signInWithPassword
├── signup/
│   ├── page.tsx          # Signup UI (useActionState)
│   └── actions.ts        # Server Action — signUp + profile insert
├── dashboard/
│   └── page.tsx          # Protected — shows groups list
└── group/
    └── [id]/
        └── page.tsx      # Group detail — expenses, balances, settlements

components/
├── GroupDetails.tsx       # Full interactive group page (client)
├── AddGroupModal.tsx      # Create group with participants
├── AddExpenseModal.tsx    # Add expense with split engine
├── DeleteGroupButton.tsx  # Delete group with confirm dialog
└── LogoutButton.tsx       # Signs out and redirects

lib/
└── supabase/
    ├── client.ts          # Browser client (for client components)
    ├── server.ts          # Server client (for server components)
    └── middleware.ts      # Session refresh + route protection

middleware.ts              # Protects /dashboard and /group/* routes
```

---

## Key Features

### 🔐 Authentication
- Email/password signup and login via Supabase Auth
- Server Actions handle all auth logic — no tokens exposed to the client
- Next.js middleware protects routes — unauthenticated users are redirected to `/login`
- Session managed via cookies with automatic refresh

### 👥 Groups
- Create groups with up to 4 participants (you + 3 others)
- Each group stores participants separately for flexible split assignments
- Cascade delete — removing a group cleans up all expenses, splits and participants via Supabase foreign key rules

### 💸 Expense Splitting

Three split modes supported:

| Mode | How It Works |
|---|---|
| **Equal** | Total divided evenly across all participants |
| **Percentage** | Each person assigned a % of the total |
| **Custom** | Manually enter exact amount per person |

Rounding errors are automatically corrected — the difference is adjusted on the first participant so totals always match exactly.

### 📊 Debt Settlement Engine (Greedy Algorithm)

```
1. Compute net balance per participant
   balance[payer]       += amount_paid
   balance[participant] -= share_amount

2. Separate into creditors (+) and debtors (-)

3. Greedily match debtor to creditor
   payment = min(creditor.amount, debtor.amount)
   → record settlement transaction
   → reduce both by payment amount
   → repeat until all balances cleared
```

This minimizes the number of transactions needed to settle all debts in the group.

---

## Database Schema

```sql
profiles
  id          uuid  (references auth.users)
  email       text
  full_name   text

groups
  id          uuid
  name        text
  owner_id    uuid       (references profiles)
  created_at  timestamp

participants
  id          uuid
  group_id    uuid       (references groups — CASCADE DELETE)
  name        text

expenses
  id          uuid
  group_id    uuid       (references groups — CASCADE DELETE)
  description text
  amount      numeric
  payer_id    uuid       (references participants)
  created_at  timestamp

expense_splits
  id              uuid
  expense_id      uuid   (references expenses — CASCADE DELETE)
  participant_id  uuid   (references participants)
  share_amount    numeric
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project (free tier works)

### 1. Clone the repo
```bash
git clone https://github.com/govind-sing/splitmint.git
cd splitmint
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run locally
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment

Deployed on **Vercel** with automatic CI/CD — every push to `main` triggers a new deployment.

```bash
git add .
git commit -m "your message"
git push origin main
# → Vercel auto-deploys in ~60 seconds
```

After deploying, update Supabase:
- **Authentication → URL Configuration → Site URL** → your Vercel URL
- **Redirect URLs** → `https://your-app.vercel.app/**`

---

## Design Decisions

**Server Actions over REST API**
The previous version used an Express.js backend on AWS Lambda with separate API routes for every operation. Rebuilding in Next.js 15 replaced all of that with Server Actions — auth runs entirely server-side, no tokens are sent to the client, and the codebase went from two repos to one.

**Supabase over custom backend**
Supabase provides PostgreSQL, Auth, and a typed JS client in one platform. Cascade deletes are enforced at the database level, keeping application code clean and removing the need to manually delete related records in order.

**Minimal client components**
Dashboard and group pages are server components that fetch data directly on the server — no `useEffect`, no loading states, no client-side fetching. Only interactive parts (modals, forms, the group detail UI) are marked `'use client'`.

---

## Author

**Govind Singh Tanwar**

[![GitHub](https://img.shields.io/badge/GitHub-govind--sing-181717?style=flat&logo=github)](https://github.com/govind-sing)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-govindsi--v-0A66C2?style=flat&logo=linkedin)](https://linkedin.com/in/govindsi-v)

---

## License

MIT — feel free to use this as a reference or starting point for your own expense-splitting app.
