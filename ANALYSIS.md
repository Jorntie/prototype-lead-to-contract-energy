# Lead-to-Contract Value Chain — B2B Energy Supplier

## 1. Value Chain Overview

The lead-to-contract process for a B2B energy supplier covers everything from initial prospect identification through to a signed supply agreement. B2B energy is inherently complex due to multi-site customers, varying consumption profiles, regulatory metering requirements, and contract structures that differ significantly from B2C.

```
Lead Capture → Qualification → Account & Site Profiling → Pricing & Quoting → Negotiation → Contract Generation → Signing & Onboarding Handoff
```

---

## 2. Full Functional Analysis

### 2.1 Lead Management

| Capability | Description |
|---|---|
| Lead capture | Ingest leads from multiple channels: web forms, referrals, broker portals, import (CSV/API) |
| Lead deduplication | Match incoming leads against existing accounts/leads to prevent duplicates |
| Lead assignment | Rule-based or round-robin assignment to sales reps by region, segment, or capacity |
| Lead scoring | Score leads based on firmographics (company size, industry, number of sites), consumption volume, and engagement signals |
| Lead nurturing tracking | Track touchpoints: emails, calls, meetings. Integration hooks for CRM/marketing tools |
| Source attribution | Track which channel/campaign generated the lead for ROI analysis |
| Lead status lifecycle | New → Contacted → Qualified → Opportunity → Won/Lost with configurable stages |

### 2.2 Qualification & Discovery

| Capability | Description |
|---|---|
| Qualification criteria | Configurable checklist: decision-maker identified, budget authority, contract timeline, current supplier, consumption volume |
| Disqualification reasons | Structured capture of why leads are disqualified (too small, wrong segment, credit risk) |
| Competitor intelligence | Track current supplier, contract end date, known pain points |
| Decision-maker mapping | Multiple contacts per account with roles (economic buyer, technical contact, procurement) |
| Consumption discovery | Capture estimated annual consumption (kWh/MWh) per commodity (electricity, gas) at account level |

### 2.3 Account & Site Management (B2B Multi-Site Complexity)

This is the core complexity differentiator for B2B energy.

| Capability | Description |
|---|---|
| Account hierarchy | Parent company → subsidiaries → individual sites. Support for group-level deals |
| Site registry | Each site has: address, meter identifier(s), commodity type, grid connection details, consumption profile |
| Multi-site grouping | Group sites into lots/bundles for pricing purposes (e.g., all warehouses, all offices) |
| Site data collection | Capture or import: historical consumption data, meter technical details, supply capacity, voltage level (HV/MV/LV), connection type |
| Site validation | Validate site/meter data completeness before a quote can be generated |
| Consumption profiles | Per-site load profiles: flat, peak/off-peak, seasonal patterns, half-hourly data where available |
| Multi-commodity | Support electricity and gas (and potentially other commodities) per site |
| Site status tracking | Track per-site status through the sales process independently (some sites may be excluded from a deal) |
| Bulk site operations | Import/manage hundreds of sites per account via CSV/Excel upload |

### 2.4 Pricing & Quoting

#### 2.4.1 Price Component Architecture

The total price to a B2B energy customer is never a single number — it is a composite of distinct components, each with different drivers, volatility, and transparency requirements. A mature system must model these independently.

| Component Category | Examples | Characteristics |
|---|---|---|
| **Energy / Commodity** | Wholesale energy cost, shaping/profiling cost, imbalance risk premium | Market-driven, varies by contract type (fixed vs. indexed), often the negotiable part |
| **Network / Grid** | Transmission charges, distribution charges, capacity charges, connection fees | Regulated, set by grid operators, vary by voltage level and location, typically passed through |
| **Taxes & Levies** | Energy tax, renewable surcharges, strategic reserves levy, VAT | Government-mandated, vary by jurisdiction and customer exemption status |
| **Supplier Margin** | Sales margin, risk premium, credit risk surcharge | Internal, configurable per deal, subject to approval workflows |
| **Green / Sustainability** | Renewable energy certificates (RECs/GOs), carbon offset costs | Optional add-on or mandatory depending on product |
| **Metering & Services** | Meter reading fees, data services, demand response participation | Typically small, sometimes bundled |

#### 2.4.2 Price Component Behaviors

| Behavior | Description |
|---|---|
| Component stacking | Total price = sum of all applicable components per unit (kWh/MWh) |
| Per-site variation | Network charges and taxes may differ per site based on location, voltage level, or exemptions |
| Fixed vs. pass-through | Some components are locked at quote time (energy, margin); others are passed through at actual cost (network, taxes) |
| Component visibility | Configurable: show full breakdown to customer, or present as all-in price |
| Temporal variation | Some components change annually (network tariffs, tax rates) or intra-day (wholesale) |
| Exemptions | Certain customers/sites qualify for reduced taxes or levies (e.g., energy-intensive industries) |

#### 2.4.3 Rate Structures

| Capability | Description |
|---|---|
| Flat rate | Single price per kWh for all hours |
| Time-of-use | Different rates for peak, off-peak, shoulder periods |
| Seasonal | Rates vary by season (winter/summer) |
| Banded / tiered | Price changes at volume thresholds |
| Indexed / formula-based | Price linked to market index + adder |

#### 2.4.4 Quoting Capabilities

| Capability | Description |
|---|---|
| Quote generation | Generate quotes at site level, lot level, and portfolio (account) level |
| Component-level quoting | Each quote line shows the full price component breakdown per site |
| Multi-scenario quotes | Create multiple pricing scenarios for comparison (e.g., 1yr fixed vs. 3yr fixed vs. indexed) |
| Quote versioning | Track quote iterations with full audit trail |
| Quote validity | Configurable validity period; auto-expire quotes |
| Margin management | Set minimum margins, approval workflows for below-threshold margins |
| Green/renewable options | Price adder for renewable energy certificates, carbon offsets |
| Contract duration options | Quote for different contract lengths (1, 2, 3+ years) |
| Price refresh | Ability to refresh energy cost component based on current market conditions |
| Quote approval workflow | Multi-level approval for large deals or low-margin quotes |
| Volume-based pricing | Price tiers based on total portfolio volume across sites |
| Price simulation | Model impact of changing individual components on total customer price |

### 2.5 Proposal & Document Generation

| Capability | Description |
|---|---|
| Proposal builder | Generate branded proposal documents from quote data |
| Site appendices | Auto-generate per-site pricing appendices for multi-site deals |
| Template management | Configurable templates per product type, customer segment |
| Document format | Generate PDF proposals and contracts |
| Cover letter / executive summary | Auto-generated or manually crafted summary for decision makers |

### 2.6 Negotiation & Deal Management

| Capability | Description |
|---|---|
| Opportunity pipeline | Kanban/pipeline view of all active deals with stage tracking |
| Activity logging | Log all interactions: calls, emails, meetings, notes |
| Task management | Sales tasks and reminders tied to opportunities |
| Win/loss tracking | Capture structured win/loss reasons for pipeline analytics |
| Deal value calculation | Estimated annual revenue, total contract value, margin |
| Probability & forecasting | Stage-based probability for revenue forecasting |
| Competitor tracking | Track competing offers and suppliers per deal |
| Collaboration | Multiple team members on a deal (sales, pricing analyst, account manager) |

### 2.7 Contract Management

| Capability | Description |
|---|---|
| Contract generation | Auto-generate contracts from accepted quotes with all commercial terms |
| Contract templates | Configurable templates with standard terms and conditions |
| Variable injection | Populate contract with: account details, site list, pricing, duration, payment terms |
| Site schedule | Detailed appendix with per-site commercial terms |
| Digital signature | Integration-ready for e-signature workflows |
| Contract versioning | Track contract drafts and amendments |
| Approval workflow | Internal approval before contract is sent to customer |
| Contract status | Draft → Sent → Signed → Active → Expired with lifecycle tracking |

### 2.8 Credit & Risk Assessment

| Capability | Description |
|---|---|
| Credit check | Assess customer creditworthiness before contract finalization |
| Credit score integration | Hook for external credit bureau data |
| Risk categorization | Classify accounts by risk level (low/medium/high) |
| Security deposit rules | Auto-calculate required deposits based on risk + contract value |
| Credit limit management | Set and enforce credit limits per account |

### 2.9 Onboarding Handoff

| Capability | Description |
|---|---|
| Handoff checklist | Structured handoff from sales to operations/onboarding |
| Site registration data | Package all site/meter data needed for supplier switching |
| Welcome communication | Trigger customer welcome flow upon contract signing |
| Supply start tracking | Track expected supply start date per site |

### 2.10 Analytics & Reporting

| Capability | Description |
|---|---|
| Pipeline dashboard | Value, volume, and count of deals by stage |
| Conversion metrics | Lead → Qualified → Quote → Won conversion rates |
| Sales performance | Rep-level metrics: deals, revenue, win rate, cycle time |
| Quote analytics | Quotes generated vs. accepted, average margin, time-to-quote |
| Revenue forecasting | Weighted pipeline forecast by expected close date |
| Lost deal analysis | Breakdown of loss reasons by segment, competitor, rep |
| Site analytics | Sites quoted, sites won, average sites per deal |

### 2.11 Integration Points

| System | Purpose |
|---|---|
| CRM | Bi-directional sync of accounts, contacts, activities |
| Market data / ETRM | Real-time energy prices for quote generation |
| Metering / MDM | Historical consumption data, meter validation |
| Billing system | Handoff of contract and site data for invoicing |
| E-signature | DocuSign, Adobe Sign, or equivalent |
| Credit bureau | Automated credit checks |
| Document management | Store and retrieve proposals, contracts, correspondence |
| Email / Calendar | Activity tracking, meeting scheduling |
| Grid operator / DSO | Meter point registration, switching |

---

## 3. MVP Definition

### 3.1 MVP Guiding Principles

- **Include multi-site complexity** — this is the defining characteristic of B2B energy sales
- **End-to-end flow** — cover the full lead-to-contract journey, even if each step is simplified
- **Manual over automated** — where full automation is complex, allow manual input with structured data capture
- **Single commodity** — start with electricity only; gas follows the same patterns
- **No external integrations** — mock/manual data entry instead of live API integrations
- **Single currency** — configurable but not multi-currency in MVP
- **No broker portal** — direct sales channel only

### 3.2 MVP Scope

#### Module 1: Lead Management (Simplified)
- **In scope:**
  - Manual lead creation (form-based)
  - CSV import of leads
  - Lead status lifecycle (New → Contacted → Qualified → Disqualified → Converted to Opportunity)
  - Basic lead details: company name, contact person, email, phone, estimated number of sites, estimated annual consumption, current supplier, contract end date
  - Lead assignment to sales user
  - Notes / activity log on lead
- **Out of scope:**
  - Lead scoring, automated nurturing, marketing integration, deduplication, source attribution

#### Module 2: Account & Site Management (Core Complexity — Full Depth)
- **In scope:**
  - Account creation from converted lead (or direct creation)
  - Account hierarchy: parent account → child accounts (one level)
  - Multiple contacts per account with role designation
  - Site management: create, edit, list sites per account
  - Site data: address, meter identifier, commodity (electricity), supply capacity, estimated annual consumption (kWh)
  - CSV/Excel bulk site import with validation and error reporting
  - Site grouping into "site groups" for pricing purposes
  - Site status: Active, Inactive, Pending Validation
  - Consumption data: annual consumption per site with optional peak/off-peak split (percentage or absolute values — no full half-hourly profiles in MVP)
  - Site-level fields: voltage level (HV/MV/LV), connection type, per-site contract end date (sites in a portfolio may have different end dates)
- **Out of scope:**
  - Half-hourly / interval consumption data, load profile analysis, grid operator validation, multi-commodity per site

#### Module 3: Opportunity / Deal Management
- **In scope:**
  - Create opportunity linked to account
  - Select which sites are included in the opportunity
  - Opportunity stages: Discovery → Quoting → Proposal Sent → Negotiation → Won → Lost
  - Deal metadata: expected close date, contract duration, estimated annual value
  - Win/loss reason capture
  - Activity log: notes, call logs, meeting records (manual entry)
  - Pipeline view (kanban board)
- **Out of scope:**
  - Revenue forecasting, probability weighting, competitor tracking, task automation

#### Module 4: Pricing & Quoting (Component-Based)

The MVP includes a proper price component model — this is essential for B2B energy where customers expect transparency and where different components have fundamentally different commercial behaviors.

- **In scope:**
  - Create a quote linked to an opportunity
  - Quote contains: selected sites, contract duration, pricing per site

  **Price Component Model:**
  - Configurable price component types, each with:
    - Name (e.g., "Energy Cost", "Network Charges", "Energy Tax", "Supplier Margin")
    - Category: Energy | Network | Taxes & Levies | Margin | Green | Services
    - Unit: per kWh, per kW/month, per meter/month, or fixed annual
    - Input method: Manual entry | CSV/Excel upload | Calculated (formula)
    - Pass-through flag: indicates whether component is fixed at quote time or passed through at actual cost
    - Applies-to: all sites, per lot, or per individual site
  - Admin can configure which components exist and their default values
  - **Manual entry**: sales user enters component values per site or per lot when building a quote
  - **CSV/Excel upload**: upload a spreadsheet of component values per site (e.g., network charges per meter point received from the grid operator, or a pricing team's energy cost calculations)
  - **Calculated components**: supplier margin can be entered as a fixed value or as a percentage on top of other components
  - Per-site price breakdown: each quote line shows all components and their individual values
  - Total price per site = sum of all applicable components, calculated correctly per unit type:
    - **per-kWh** components: value × annual consumption
    - **per-kW/month** components: value × supply capacity × 12 months
    - **per-meter/month** components: value × 12 months (fixed per connection point)
    - **fixed annual** components: value as entered
  - Total quote value = sum across all sites × contract duration
  - Component-level visibility toggle: choose whether the customer-facing proposal shows full breakdown or an all-in price
  - Ability to set different component values per site (e.g., network charges differ by location)
  - Ability to override individual components at site level while keeping defaults for others
  - Volume discount: manual adjustment applied as a separate component or as a modifier to margin

  **Quoting Workflow:**
  - Quote versioning: create new versions, compare side-by-side
  - Quote status: Draft → Pending Approval → Approved → Sent → Accepted → Rejected → Expired
  - Quote validity period with manual expiry
  - Margin calculation: total revenue minus sum of cost components (energy + network + taxes), displayed at site and portfolio level. Margin percentage calculated against configurable base components (typically energy cost only, not pass-throughs)
  - Simple approval workflow: quotes below a configurable margin threshold require manager approval
  - **Payment terms** (net 14/30/60) and **billing frequency** (monthly/quarterly) on quote — carried to contract
  - **Pricing desk export**: download opportunity site list as CSV for submission to internal pricing/wholesale team. Upload energy cost response via component CSV import

  **MVP Component Defaults (pre-configured, editable by Admin):**

  | Component | Category | Default Input Method | Per-Site Variation | Pass-Through |
  |---|---|---|---|---|
  | Energy Cost | Energy | Manual or CSV upload | Optional | No (fixed at quote) |
  | Network Charges | Network | CSV upload | Yes (varies by site) | Yes |
  | Energy Tax | Taxes & Levies | Manual (single rate) | Optional (exemptions) | Yes |
  | Renewable Levy | Taxes & Levies | Manual (single rate) | No | Yes |
  | Supplier Margin | Margin | Manual | Optional | No |
  | Green Certificates | Green | Manual | No | No |

- **Out of scope:**
  - Market-linked / live price feeds, indexed/click pricing, time-of-use rates, automated price refresh, multi-scenario comparison, formula builder for complex calculated components

#### Module 5: Proposal Generation (Basic)
- **In scope:**
  - Generate a PDF proposal from an accepted/approved quote
  - Proposal includes: account details, site list with pricing, total costs, contract duration, validity date
  - Single configurable template
- **Out of scope:**
  - Rich template editor, branded design system, executive summaries, cover letters

#### Module 6: Contract Generation & Signing
- **In scope:**
  - Generate a contract document (PDF) from an accepted quote
  - Contract includes: parties, commercial terms, site schedule (appendix listing all sites with pricing)
  - Contract status tracking: Draft → Sent → Signed → Active
  - Upload signed contract (manual process — no e-signature integration in MVP)
  - Contract linked to account, opportunity, and quote
- **Out of scope:**
  - E-signature integration, clause library, amendment workflows, automated approval, legal review workflow

#### Module 7: Dashboard & Reporting (Minimal)
- **In scope:**
  - Pipeline dashboard: deal count and value by stage
  - Lead conversion funnel: leads → qualified → opportunity → won
  - Basic KPIs: open opportunities, quotes pending, contracts signed (current period)
  - List views with filtering and sorting for leads, accounts, opportunities, quotes, contracts
  - **"My Action Items" view** for sales reps: pending follow-ups, expiring quotes, upcoming close dates, assigned leads needing action
  - **Data export**: CSV/Excel export for pipeline, quote details, and site lists — users will not adopt a system they cannot get data out of
- **Out of scope:**
  - Advanced analytics, drill-down reports, sales rep comparisons, forecasting

#### Cross-Cutting Concerns (MVP)
- **Authentication & Authorization:** User login, role-based access (Admin, Sales Manager, Sales Rep)
- **Audit trail:** Track who created/modified key entities and when. **Auto-log system events** (quote created, status changed, lead converted, approval requested/granted) — do not rely on users to manually log what the system already knows
- **Search:** Global search across accounts, sites, opportunities
- **Data model:** Designed for multi-commodity and multi-currency extension even if MVP is single
- **Notifications:** In-app notification system for pending approvals and alerts
- **Service layer:** Business logic in dedicated service layer, independent of Next.js framework

### 3.3 MVP Data Model (Conceptual)

```
┌─────────────┐
│    Lead      │
│─────────────│
│ company_name │
│ contact_name │
│ email/phone  │
│ est_sites    │
│ est_volume   │
│ status       │
│ assigned_to  │
└──────┬──────┘
       │ converts to
       ▼
┌─────────────┐       ┌──────────────┐
│   Account    │──────▶│   Contact    │
│─────────────│  1:N  │──────────────│
│ name         │       │ name         │
│ parent_id    │       │ role         │
│ industry     │       │ email/phone  │
│ credit_status│       └──────────────┘
└──────┬──────┘
       │ 1:N
       ▼
┌─────────────┐       ┌──────────────┐
│    Site      │──────▶│  SiteGroup   │
│─────────────│  N:1  │──────────────│
│ address      │       │ name         │
│ meter_id     │       │ description  │
│ commodity    │       └──────────────┘
│ capacity     │
│ annual_kwh   │
│ status       │
└──────┬──────┘
       │ N:M (via opportunity)
       ▼
┌─────────────┐
│ Opportunity  │
│─────────────│
│ account_id   │
│ stage        │
│ exp_close    │
│ contract_dur │
│ est_value    │
│ win_loss     │
└──────┬──────┘
       │ 1:N
       ▼
┌─────────────┐
│    Quote     │
│─────────────│
│ version      │
│ status       │
│ valid_until  │
│ total_value  │
│ total_margin │
│ show_breakdown│ (customer sees components or all-in)
└──────┬──────┘
       │ 1:N
       ▼
┌──────────────┐       ┌───────────────────┐
│  QuoteLine   │──────▶│ QuoteLineComponent│
│──────────────│  1:N  │───────────────────│
│ site_id      │       │ component_type_id │
│ annual_kwh   │       │ value             │
│ total_price  │       │ unit              │
│ total_cost   │       │ is_pass_through   │
│ margin       │       │ annual_amount     │
└──────────────┘       └───────────────────┘

┌────────────────────┐
│ PriceComponentType │ (Admin-configured)
│────────────────────│
│ name               │
│ category           │ (Energy|Network|Tax|Margin|Green|Services)
│ default_unit       │ (per_kwh|per_kw_month|fixed_annual|per_meter_month)
│ default_value      │
│ is_pass_through    │
│ is_required        │
│ display_order      │
└────────────────────┘
       │
       ▼
┌─────────────┐
│  Contract    │
│─────────────│
│ quote_id     │
│ status       │
│ start_date   │
│ end_date     │
│ signed_date  │
│ document_url │
└─────────────┘
```

### 3.4 MVP User Roles

| Role | Permissions |
|---|---|
| **Sales Rep** | Create/manage own leads, accounts, opportunities, quotes. Cannot approve quotes below margin threshold. |
| **Sales Manager** | Everything a Sales Rep can do + approve quotes + view pipeline across all reps + reassign leads |
| **Admin** | Full access + user management + configuration (margin thresholds, quote templates, stages) |

### 3.5 MVP Complexity Profile

| Aspect | Complexity | Notes |
|---|---|---|
| Multi-site management | **High** | Core B2B differentiator — fully included |
| Bulk site import | **Medium** | CSV import with validation — essential for real-world usability |
| Account hierarchy | **Medium** | One level of parent-child — sufficient for MVP |
| Pricing | **Medium-High** | Component-based pricing with manual entry + CSV upload, no market integration |
| Quoting workflow | **Medium** | Versioning + approval workflow included |
| Contract generation | **Low-Medium** | PDF generation from template, no e-sign |
| Reporting | **Low** | Dashboard + list views only |
| Integrations | **None** | All data manually entered or imported |

### 3.6 What MVP Explicitly Defers

1. **Market integration** — no live wholesale price feeds
2. **Complex pricing models** — indexed, click/tranche, time-of-use rates, formula builder
3. **Multi-commodity** — electricity only (data model supports extension)
4. **Broker channel** — no external portal
5. **Credit bureau integration** — manual credit assessment
6. **E-signature** — manual upload of signed documents
7. **Half-hourly data** — annual consumption only
8. **Automated communications** — no email triggers or templates
9. **API integrations** — no CRM, billing, or metering system integration
10. **Advanced analytics** — no forecasting, cohort analysis, or drill-downs
11. **Multi-language / multi-currency** — single language, single currency (configurable)
12. **Workflow automation** — minimal; most processes are manual with status tracking

### 3.7 Suggested Tech Stack (for Prototype)

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React + TypeScript | Component-based, strong ecosystem |
| UI Framework | Tailwind CSS + shadcn/ui | Rapid prototyping, professional look |
| Backend | Node.js (Express or Fastify) | JavaScript full-stack, fast development |
| Database | PostgreSQL | Relational model fits the hierarchical data well |
| ORM | Prisma | Type-safe, excellent DX, migration support |
| PDF Generation | @react-pdf/renderer or Puppeteer | Proposal and contract PDF output |
| Auth | NextAuth.js or Clerk | Quick auth setup with role support |
| Deployment | Docker + any cloud | Portable, no vendor lock-in |

**Alternative:** Next.js full-stack (App Router) to combine frontend + API in one project for faster prototyping.
