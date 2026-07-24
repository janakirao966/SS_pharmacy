<!-- GSD:project-start source:PROJECT.md -->
## Project

**SS_Pharmacy**

S.S. PHARMACY official online presence — a premium informational and lead-generation platform. It showcases authentic Ayurvedic medicines and healthcare products, highlighting high manufacturing and quality standards, to generate distributor leads and customer inquiries.

**Core Value:** Build trust and connect distributors and customers with S.S. PHARMACY's licensed Ayurvedic manufacturing facility (Mfg. Lic. No. R-1970/Ayur).

### Constraints

- **Tech Stack**: React (v19) + Vite (v8) + TypeScript
- **Backend Stack**: Static site with Supabase integration (Database, Auth, and RLS)
- **Performance**: LCP < 2.0s, TTI < 3.0s, bundle < 150KB
- **Security**: HTTPS-only, strict input validation, compliance-checked medical claims
- **UX Boundaries**: Mobile-first, custom spring-physics transitions, WCAG 2.2 AA accessibility
<!-- GSD:project-end -->

<!-- GSD:design-system-start source:.agents/local-overrides.json -->
## Design System

- **Fonts**:
  - Primary Display Font: `Playfair Display` (titles, headers)
  - Secondary/Body Font: `Plus Jakarta Sans` (body text, UI labels)
  - Serif Accents: `Cormorant Garamond` (elegant quotes, minor headers)
- **Brand Color Palette**:
  - Forest Green Primary Accent: `#2D5016` (brand logo, deep buttons, header cues)
  - Dark Olive Primary BG: `#1D3A28` (admin header, footer, rich sections)
  - Golden Amber Accent: `#C5A059` / `#7A6027` (gold borders, premium pills, badges)
  - Warm Sand / Cream Background: `#FEFDF8` (storefront body, clean cards)
  - Deep Surface Gray/Charcoal: `#1A1A1A` (primary body text color)
<!-- GSD:design-system-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

| Layer | Technology | Purpose |
|:---|:---|:---|
| **Core UI** | React 19.x | Component rendering and reactive state |
| **Build System** | Vite 8.x | High-speed local dev server and bundling |
| **Styling** | Vanilla CSS | Custom variables (`variables.css`) and rules (`components.css`) |
| **Routing** | React Router 7.x | URL Routing and SEO metadata rendering |
| **Backend & Auth** | Supabase | Auth user sessions, database RLS, and data tables |
| **Payments** | Razorpay India | Online credit cards, UPI, net banking checkout |
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Refer to [CONVENTIONS.md](./CONVENTIONS.md) for detailed UI, state, and development patterns.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

- **Storefront Navigation**: Handled by `<BrowserRouter>` in [src/main.tsx](file:///c:/Users/janak/Downloads/SS_Pharmacy/src/main.tsx) mapping to `/SS_pharmacy/`.
- **Database Tables**:
  - `orders`: Stores customer purchase orders.
  - `order_items`: Stores itemized lines per order.
  - `profiles`: Stores user details including the crucial `is_admin` boolean flag.
  - `distributor_applications`: Stores contact leads and B2B inquiries.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

Retained core skills are pre-installed in `.agents/skills/`. See [SKILLS_REPORT.md](./SKILLS_REPORT.md) for the 10 active skills inventory.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
