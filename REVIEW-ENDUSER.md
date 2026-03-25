# End-User Review: Lead-to-Contract MVP

**Reviewer:** Senior B2B Energy Sales Manager (12+ years, managing 6 reps)
**Date:** 2026-03-17
**Documents reviewed:** ANALYSIS.md, PLAN.md, REVIEW-ARCHITECT.md, REVIEW-DEVELOPER.md, REVIEW-PRODUCT.md
**Incorporated changes noted:** contractEndDate/currentSupplier fields, currency on Quote, Decimal types, in-app notifications, richer seed data, "Lots" renamed to "Site Groups", "Clone quote" action added, side-by-side comparison/kanban drag-drop/contract PDF/global search/responsive polish cut.

---

## Daily Workflow Fit

### What matches how we actually work

**The lead-to-opportunity-to-quote-to-contract flow is correct.** That is the spine of our process and the plan gets the sequence right. Converting a lead into an account and then attaching sites, building a quote, getting approval, generating a proposal -- that is Monday through Friday for my team.

**Site Groups (formerly Lots) are real.** When I am pricing a portfolio for a logistics company with 30 warehouses and 5 office buildings, I absolutely group those separately because the warehouses are on high-voltage connections with completely different network tariffs. We call them "tranches" internally but "Site Groups" is clear enough.

**The component-based pricing model reflects how we actually build prices.** We do not quote a single number per kWh. We stack energy cost, network charges, energy tax, renewable levy, and our margin. Each of those comes from a different source, changes at different times, and may or may not be shown to the customer. The fact that the plan models these as separate configurable components with pass-through flags tells me someone actually talked to people in this industry.

**CSV import for sites and price components is essential.** My reps get Excel files from customers listing all their sites. Our pricing desk sends back a spreadsheet with energy costs per meter point. The grid operator provides network charges per connection. If I cannot import these into the system, my team will build the quote in Excel and only use this tool to track the deal status -- which defeats the entire purpose.

### What does not match

**There is no concept of a "pricing request" or internal handoff to a pricing desk.** In my organization, the sales rep does not calculate the energy cost. The rep gathers the site data, submits a pricing request to our wholesale/pricing team, and they come back with energy costs per site based on the customer's load profile and current market conditions. The plan assumes the sales rep enters all component values directly. In practice, the energy cost component comes from a separate team, often with a 24-48 hour turnaround. I would need at minimum a way to flag a quote as "awaiting pricing" and some mechanism for the pricing team to upload their numbers. The CSV upload for component values partially addresses this, but there is no workflow around it.

**No multi-year pricing visibility.** When I quote a 3-year fixed deal, the customer wants to see the annual cost for year 1, year 2, and year 3 separately, because network charges and taxes change annually. The current model seems to calculate a single total across the contract duration. I need per-year breakdowns, or at least the ability to flag which components are fixed for the full term versus reset annually.

**No renewal or re-contracting workflow.** Half of my pipeline is existing customers whose contracts are expiring. The addition of `contractEndDate` and `currentSupplier` fields is good -- that is the most important filter in my world. But the workflow for re-contracting should allow me to pull the previous contract's site list and pricing as a starting point, rather than rebuilding from scratch. The "Clone quote" action helps, but ideally I want to clone from a previous contract, not just a previous quote.

**No team or territory view.** I manage 6 reps. On Monday morning I need to see: which deals are each rep working, what is the total pipeline per rep, who has quotes expiring this week, who has approvals pending. The plan has a pipeline view but it is not described as filterable by assigned rep. If I cannot slice the pipeline by rep, I am back to asking each person for a status update in our weekly meeting.

---

## Pain Points Addressed

### Pain points this solves

| Current pain | How the MVP addresses it |
|---|---|
| Pricing data scattered across 6 different Excel files per deal | Component-based quoting with all pricing in one place per quote |
| No single view of all sites in a deal | Site list attached to opportunity, visible in quote builder |
| Losing track of which version of the quote we sent | Quote versioning with status tracking |
| Manager has no visibility into deal pipeline without asking each rep | Pipeline table view with deal stages |
| Manual proposal creation takes 2-3 hours per deal | PDF proposal generation from quote data |
| Site data re-entered every time we re-quote | Sites live on the account, reusable across opportunities |
| No audit trail of who changed what on a quote | Audit columns on all entities, activity logging |

### Pain points this misses

| Current pain | Not addressed in MVP |
|---|---|
| No connection to wholesale market prices -- reps guess or wait for pricing desk | No market data integration (acknowledged as deferred) |
| Cannot see which sites are already under contract with us vs. genuinely new | No existing contract/supply status per site |
| Credit check is a separate manual process that delays deals by days | No credit integration (acknowledged as deferred) |
| Customer asks "can you match competitor X's offer" and we have no way to model it | No competitor offer tracking or comparison |
| Half-hourly consumption data determines whether a site is profitable -- annual consumption is too crude | HH data deferred, annual only in MVP |
| Broker deals follow a different flow and make up 40% of our volume | No broker channel (acknowledged as deferred) |

The deferred items are defensible for an MVP. But I want to flag that the lack of half-hourly data is not just a "nice to have." For any customer with more than 10 sites, annual consumption is insufficient to price accurately. We use it for initial screening, but any real quote requires at least peak/off-peak split. The system should at minimum support a peak and off-peak consumption value per site, even if full HH profiles are deferred.

---

## Usability Concerns

### What will frustrate my reps

**The quote builder with 50 sites and 6 components is 300 cells.** I have seen this movie before. If the interface is a giant editable grid with no guidance, my reps will stare at it, fill in three rows, and then build the rest of the quote in Excel. The incorporated changes mention no specific UX guidance for this screen. It needs:
- Default values clearly shown and visually distinct from manually entered values
- A completeness bar ("42 of 50 sites fully priced")
- The ability to sort and filter sites within the builder (by Site Group, by consumption size, by address)
- Inline validation that flags negative margins immediately, not after you click save
- Bulk editing: select 10 sites, set the same margin on all of them

Without these, the quote builder will be the reason my team does not adopt the tool.

**No quick way to see "my day."** When a rep opens the system in the morning, they want to see: my leads that need follow-up, my quotes expiring this week, my opportunities with upcoming expected close dates, my pending approvals. The dashboard shows aggregate KPIs which are useful for me as a manager but not for a rep planning their day. A "My Tasks" or "My Action Items" view is missing.

**Activity logging as a manual process will be skipped.** My reps already hate logging calls in Salesforce. If activity logging in this system is manual text entry, they will not do it. At minimum, the system should auto-log status changes, quote creation/submission, and lead conversion. Manual notes should be optional, not the only source of activity data.

**Table-only pipeline view (kanban cut).** I understand cutting the drag-and-drop kanban for timeline reasons, but a table view of the pipeline is not how my team thinks about deals. They think in stages, visually. Even a read-only kanban (no drag, just click to open) would help. A flat table of opportunities sorted by stage is just a filtered list -- it does not give you the spatial sense of "we have too many deals stuck in Negotiation."

### What my reps will work around

- If bulk editing in the quote builder is not smooth, they will price in Excel and enter a single "all-in" rate per site, defeating the component model.
- If the activity log requires manual entry, they will keep their notes in Outlook/Teams and the system will have no interaction history.
- If there is no "my open items" view, each rep will build their own tracking spreadsheet on the side.

---

## Data Entry Reality

### Fields that are missing

| Missing field | Where it belongs | Why I need it |
|---|---|---|
| **Peak/off-peak consumption split** | Site | Annual consumption alone cannot produce an accurate energy cost. At minimum, a peak % split. |
| **Voltage level** (HV/MV/LV) | Site | Network charges differ dramatically by voltage level. Without this, the CSV import of network charges has no context. |
| **Connection type** (grid connection vs. behind-the-meter) | Site | Affects which network charges apply. |
| **Existing supplier supply end date** | Site | Individual sites within a portfolio may have different contract end dates, not just the account level. |
| **Payment terms** | Quote or Contract | Net 14, net 30, net 60 -- this affects pricing and is part of every contract. |
| **Billing frequency** | Quote or Contract | Monthly, quarterly -- customer expectation, part of the commercial terms. |
| **Contact role: "Procurement"** | Contact | The decision-maker mapping mentions economic buyer and technical contact. In B2B energy, the procurement department is almost always the primary counterpart, distinct from the "decision maker." |
| **Account: sector/SBI code** | Account | Industry alone is too vague. In the Netherlands, the SBI code determines energy tax exemptions. In other markets, similar sector codes apply. |

### Fields that nobody fills in (honestly)

- **Lead: estimated annual consumption** at the lead stage -- this is rarely known until we have the site data. Reps will leave this blank or guess wildly. Make it optional.
- **Site: supply capacity** -- most reps do not know this and the customer does not either until they dig up their connection agreement. Make it optional.
- **Opportunity: estimated value** -- if it is not auto-calculated from the quote, nobody will maintain this manually. It should compute from the latest quote's total value.

---

## Quote Builder Reaction

### How we price deals today

When I am pricing a portfolio for a retail chain with 45 shops:

1. The rep gets the site list from the customer (Excel), usually with addresses and meter IDs, sometimes with consumption.
2. We look up meter data in a registry (manually or via a portal) to fill in missing consumption and connection details.
3. The rep sends a pricing request to our pricing/wholesale desk with the site list and requested contract duration.
4. The pricing desk runs the sites through their models and returns an Excel with energy cost per site (sometimes per Site Group).
5. We pull network charges from the grid operator's published tariff sheets or a separate tool.
6. We add taxes and levies based on the customer's sector and exemptions.
7. We add our margin.
8. We build a summary in Excel, calculate totals, check margins, get manager sign-off.
9. We copy-paste into a Word proposal template.
10. The whole process takes 2-5 days for a 45-site deal.

### What the MVP quote builder gets right

- Component stacking is correct -- energy + network + taxes + margin = total. That is exactly how we do it.
- CSV upload for component values is critical and I am glad it is included. The network charge CSV upload mapped by meter ID is precisely how we would use it.
- Per-site variation with the ability to set values at Site Group level and override per site matches reality.
- The pass-through flag is important for transparency and for how we present to customers.
- Show-breakdown vs. all-in toggle on proposals is something I have wanted in every tool I have used.

### What concerns me

- **No workflow for the pricing desk handoff.** Steps 3-4 above are where the process stalls. The system should support exporting a site list for the pricing desk (or at minimum a CSV download of the sites in the opportunity) and then importing their response back as the energy cost component. The import path exists, but the export does not seem to be planned.
- **Margin as a percentage "of other components" is ambiguous.** In practice, we set margin as a percentage of the energy cost component specifically, not of the total. If the system calculates margin as % of (energy + network + taxes), the margin will be overstated because network and taxes are pass-throughs that do not contribute to our actual cost base. The calculation logic needs to allow specifying which components the margin percentage applies to.
- **No support for per-kW/month or per-meter/month components in the total calculation.** The plan lists these as unit types, but the total calculation seems to be: sum of components x annual kWh x contract duration. A per-kW/month charge (like capacity charges) depends on the site's supply capacity, not its consumption. A per-meter/month charge is a fixed monthly fee. The calculation engine needs to handle different units correctly, or the totals will be wrong.

---

## What Would Make Me Switch from Salesforce + Excel

I am not going to switch for a tool that does 80% of what Salesforce does but worse. I will switch for a tool that does the 20% that Salesforce cannot do, and does it so well that it justifies running both systems (or replacing Salesforce over time).

**The 20% that would make me pilot this:**

1. **The quote builder actually works for 50+ sites with component pricing.** If I can import a site list, import network charges, set energy costs at Site Group level, override margins on specific sites, and generate a proposal PDF in under 30 minutes for a 50-site deal -- that alone saves my team 3-4 hours per deal. That is the killer feature.

2. **The proposal PDF looks professional and includes a proper site schedule.** If the PDF output is something I can actually send to a customer without editing it in Word first, that removes another hour per deal.

3. **I can see my full pipeline with contract end dates.** If I can filter my pipeline by "contracts expiring in Q3 2026" and see which accounts are up for renewal, that replaces the master Excel spreadsheet my team maintains separately.

4. **Approval workflow is visible and fast.** If my reps can submit a quote and I get a notification, review the margin breakdown, and approve with one click -- that replaces the current process of emails back and forth with Excel attachments.

**What I would need before going beyond a pilot:**

- Integration with at least one market data source for energy pricing
- Half-hourly consumption data support (or at minimum peak/off-peak)
- Email integration for activity tracking
- A proper mobile/tablet view for reps who visit customer sites
- Export to Excel for everything (pipeline, quotes, site lists)

---

## Deal Breakers

Things that would make me say "this is not ready for us to test":

1. **If the quote builder cannot handle 100+ sites without becoming unusable.** I have customers with 200 sites. If the page freezes, scrolling lags, or saving takes 30 seconds, it is not ready. This needs to be tested with large datasets before any demo.

2. **If the total price calculation is wrong.** If per-kW/month and per-meter/month components are not handled correctly in the total, every quote will have incorrect numbers. I cannot show incorrect numbers to a customer. This is non-negotiable.

3. **If there is no way to export data out of the system.** My team will not enter data into a system they cannot get data out of. At minimum: export pipeline to CSV, export quote to CSV/Excel, download site list. If the only export is the proposal PDF, that is not enough.

4. **If the approval notification does not work.** The incorporated changes mention in-app notifications for pending approvals. If this is just a badge that requires the manager to be logged in and looking, it is barely useful. At minimum it should be visible on login and updated without a page refresh.

5. **If there is no "undo" or correction path for mistakes.** When a rep accidentally converts a lead that should not have been converted, or submits a quote with wrong pricing -- what happens? If statuses are one-directional with no way to revert, the system will accumulate errors that require admin intervention.

---

## Nice Surprises

Things that made me think "finally, someone gets it":

1. **Pass-through flag on price components.** Every tool I have used either treats all components as fixed or all as variable. The reality is that energy cost and margin are fixed at contract signing, while network charges and taxes are passed through at actual cost. Modeling this as a flag per component is exactly right, and it matters for how we present the quote to the customer and how we manage risk internally.

2. **Component visibility toggle on proposals.** Some customers -- especially sophisticated procurement departments at large corporates -- want the full breakdown because they want to benchmark each component. Others -- typically smaller businesses -- just want a single price per kWh. Being able to generate either from the same quote data without re-doing anything is a genuine time saver.

3. **Site Groups with per-group pricing that can be overridden per site.** This is how we think about deals. Price the warehouse group at one rate, the office group at another, then override the three sites in expensive grid areas. The fact that this is baked into the data model rather than bolted on as a workaround tells me the domain modeling was done well.

4. **CSV import in the quoting module, not just for sites.** Most tools let you import sites but then force you to enter pricing manually. The ability to upload a CSV of network charges mapped by meter ID and have them populate the quote builder is the workflow we actually use. This is the feature that would save the most time per deal.

5. **The `contractEndDate` and `currentSupplier` fields on Lead and Account.** (Glad these are being added.) My entire prospecting strategy revolves around "whose contracts are expiring in the next 6-12 months." If this field is filterable and sortable on the lead/account list, it immediately becomes the most-used filter in the system.

6. **Clone quote action.** This was called out in the product review and I am glad it is being incorporated. We re-quote accounts constantly -- when market prices move, when the customer asks for a different contract length, when they add or remove sites. Starting from a previous quote instead of from zero is essential.

---

## Summary: Top 5 Requests Before Pilot

If I had to prioritize five changes before I would put this in front of my team:

1. **Make the quote builder usable at scale** -- bulk editing, completeness indicators, sort/filter within the builder, margin highlighting. This is the product.
2. **Get the total price calculation right** -- handle per-kWh, per-kW/month, and per-meter/month units correctly. Test with real pricing data.
3. **Add data export** -- CSV/Excel export for pipeline, quotes, and site lists. My team will not use a system they cannot get data out of.
4. **Add a "My Action Items" view for reps** -- pending follow-ups, expiring quotes, upcoming close dates. Not just aggregate KPIs.
5. **Auto-log system events** -- quote created, status changed, lead converted, approval requested/granted. Do not rely on reps to manually log what the system already knows.

Get those five right and I will run a 4-week pilot with two of my reps. Get the quote builder wrong and nothing else matters.
