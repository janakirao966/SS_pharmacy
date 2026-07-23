# 🌿 S.S. PHARMACY — Premium Ayurvedic E-Commerce & Lead Platform

> **Authentic Ayurvedic Medicines & Licensed Manufacturing Facility (Mfg. Lic. No. R-1970/Ayur)**  
> High-performance e-commerce storefront, B2B distributor lead generation engine, customer order tracking portal, and isolated enterprise Admin Control Center.

---

## 🌟 Key Features

* **Authentic Ayurvedic Catalog**: Interactive catalog showcasing traditional formulations (*Arishtas*, *Asavas*, *Tailas*, *Bhasmas*, *Lauhas*, *Ghulikas*).
* **Enterprise Admin Control Center (`/admin/login` & `/admin/orders`)**:
  * Isolated standalone dashboard layout (no storefront Header/Footer).
  * Primetek-inspired dark glassmorphism night theme (`#0C1A12`) with `#C5A059` gold accents.
  * Real-time order fulfillment tracker (Status accordions, debounced 400ms search, itemized product tables).
  * B2B Distributor Lead Manager connected to Supabase database.
  * Hardened Row-Level Security (RLS) & `is_admin` role authorization.
* **Customer Account & Tracking (`/account` & `/track-order`)**:
  * 4-step live order progress timeline (*Placed* ➔ *Preparing* ➔ *Dispatched* ➔ *Delivered*).
  * Seamless customer profile management and order history.
* **Seamless Payment Integration**:
  * Razorpay India online checkout + Cash on Delivery (COD).
* **High Performance & PWA Support**:
  * Vite 8 + React 19 + TypeScript stack.
  * Sub-2.0s LCP load time & offline Progressive Web App (PWA) service worker caching.
* **Vercel & Supabase Ready**:
  * Pre-configured `vercel.json` SPA rewrites & security headers.
  * Production-ready SQL migrations in `supabase/migrations/`.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Core** | React 19 + Vite 8 | Ultra-fast UI component tree & build bundle |
| **Language** | TypeScript | Strict type safety across components and schemas |
| **Styling System** | Vanilla CSS + Tokens | Custom design variables (`variables.css`, `components.css`) |
| **Routing** | React Router 7 | Client-side SEO route management |
| **Database & Auth** | Supabase (PostgreSQL) | Auth users, Row-Level Security (RLS) policies & database tables |
| **Payments** | Razorpay India | Online UPI, Debit/Credit Cards & Net Banking |
| **PWA** | Vite PWA Plugin | Offline caching & web app manifest |
| **Deployment** | Vercel | Automatic CI/CD build deployment pipeline |

---

## 🚀 Quick Start (Local Development)

### 1. Clone the repository
```bash
git clone https://github.com/janakirao966/SS_pharmacy.git
cd SS_pharmacy
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_RAZORPAY_KEY_ID=rzp_live_...
```

### 4. Run local development server
```bash
npm run dev
```
Open `http://localhost:5173/SS_pharmacy/` in your browser.

---

## 🗄️ Database Setup & SQL Migrations

Run the SQL migration scripts located in `supabase/migrations/` inside your **Supabase SQL Editor**:

1. **`supabase/migrations/01_ss_pharmacy.sql`**: Base tables (`orders`, `order_items`, `profiles`).
2. **`supabase/migrations/02_hardened_rls.sql`**: Hardened Row Level Security (RLS), `is_admin()` helper function, and `distributor_applications` table.

---

## 🔐 Granting Admin Access

To authorize an administrator account:
```sql
INSERT INTO public.profiles (id, full_name, email, is_admin)
SELECT id, 'S.S. Pharmacy Admin', email, true
FROM auth.users
WHERE email = 'your-admin-email@example.com'
ON CONFLICT (id) DO UPDATE SET is_admin = true;
```

---

## 📜 License & Copyright

© 2026 **S.S. PHARMACY**. All Rights Reserved.  
Manufacturing License No: **R-1970/Ayur**
