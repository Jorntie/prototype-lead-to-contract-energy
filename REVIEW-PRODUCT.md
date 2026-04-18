# Product Review: Lead-to-Contract MVP

**Reviewer:** Product Management
**Date:** 2026-03-17
**Documents Reviewed:** ANALYSIS.md (requirements), PLAN.md (implementation plan)

---

## Strengths

**1. The multi-site and component-based pricing model is the right hill to die on.**
B2B energy sales tools live or die by how well they handle the "50 sites, each with different network charges" scenario. Putting this at the center of the MVP is exactly right. Most generic CRMs fail here, and this is where you demonstrate domain expertise and defensibility.

**2. The end-to-end flow creates a coherent demo narrative.**
Lead to signed contract in one system is a powerful story. Even with each step simplified, walking a prospect through the full journey shows vision and completeness. The "1 complete deal flow" seed data supports this well.

**3. Smart deferral choices.**
No live market data, no broker portal, no e-signature integration, no multi-commodity. These are all correct cuts. Each of those would add 2-4 weeks and none of them are needed to demonstrate the core value proposition.

**4. CSV/Excel import is included from day one.**
This is essential. Sales reps in B2B energy receive site lists and network charge spreadsheets from customers and grid operators constantly. Without import, the demo falls apart at the first realistic scenario. Good call including this in Phase 2 and in the quoting module.

**5. The price component architecture is genuinely well thought through.**
Separating components into categories (Energy, Network, Taxes, Margin, Green, Services) with per-site variation and pass-through flags reflects how B2B energy pricing actually works. This is not something you see in generic quoting tools, and it will resonate with domain experts in the room.

**6. Show-breakdown vs. all-in toggle on proposals.**
Small feature, big impact. Some customers want full transparency; others want a single number. Including this shows you understand the sales process.

---

## Concerns (ranked by user impact)

### Critical

**C1. No "contract end date" or "current supplier" on lead/account is a major gap.**
In B2B energy, the single most important qualification data point is when the customer's current contract expires. Sales reps literally build their pipeline around contract end dates. The ANALYSIS.md mentions "competitor intelligence" and "contract end date" under qualification but neither appears in the MVP data model or the lead/account fields. This field should be on the Account (or even Lead) entity, and the pipeline should be filterable by it. Without it, a sales manager watching the demo will immediately say: "But how do I see which deals are coming up for renewal?"

**Recommendation:** Add `currentSupplier` and `contractEndDate` fields to Lead and Account. Add a "Renewals coming up" widget to the dashboard.

**C2. The quote builder UX is the make-or-break screen and it is underspecified.**
Phase 4 allocates 5-7 days to the most complex module, but the plan describes it in terms of tasks rather than user experience. With 50 sites and 6 price components, you are looking at a 300-cell data entry grid. How does the user actually interact with this? The plan mentions "per-site component value entry" but does not describe:
- How defaults cascade (component type default -> lot-level override -> site-level override)
- How the user knows which cells they still need to fill
- How they spot errors or outliers in a large dataset
- Whether they can filter/sort sites within the quote builder

This screen will be the first thing users complain about if it is not intuitive. A table with 300 editable cells and no guidance is a wall, not a tool.

**Recommendation:** Design the quote builder UX before coding. Specifically: (a) default values should auto-populate and be visually distinct from user-entered values, (b) add a "completeness indicator" per site, (c) support sorting/filtering within the quote builder, (d) highlight margin outliers (e.g., negative margin sites in red).

**C3. No email or notification mechanism at all.**
The plan explicitly excludes automated communications, but there is not even a way to notify a manager that a quote needs approval. The approval workflow (quote below margin threshold requires manager approval) has no delivery mechanism. The manager would have to log in and check. For a demo, this means the approval workflow is invisible unless you walk someone through it manually.

**Recommendation:** Add at minimum an in-app notification system (a badge on the sidebar, a list of pending actions). This does not require email integration and can be built in half a day.

### Important

**C4. The seed data is too thin for a convincing demo.**
The plan calls for 2 demo accounts, some sample leads, and 1 complete deal flow. This creates a nearly empty pipeline. When a prospect sees the kanban board or dashboard, it will look barren. A convincing demo needs enough data to show patterns: a pipeline with 8-12 opportunities at various stages, a dashboard that shows meaningful conversion metrics, and at least 2-3 quotes at different statuses.

**Recommendation:** Expand seed data significantly:
- 8-10 leads at various stages
- 4-5 accounts (mix of small and large)
- 8-12 opportunities across all pipeline stages
- 3-4 quotes (one draft, one pending approval, one approved/sent, one accepted)
- 1-2 signed contracts
- Activity log entries across entities so the timeline views are not empty

**C5. Activity logging is described but the UX is not.**
Activity logs appear on leads, opportunities, and potentially accounts. But the plan does not describe: what does the activity feed look like? Is it a simple list? Can you filter by type? Is it unified across entities (account-level view showing all activity across its opportunities)? For sales users, the activity timeline IS the context of the deal. If it is just a flat list of text entries, it will feel like a note-taking app rather than a sales tool.

**Recommendation:** Design a unified activity timeline on the Account detail page that aggregates activities from the account's leads, opportunities, and quotes. Include visual differentiation by activity type (call, email, note, status change, quote created).

**C6. No way to duplicate or clone a quote.**
Sales reps frequently create a new quote by copying a previous one and adjusting a few values. The plan describes versioning (deep copy) but only in the context of creating a "new version" of the same quote. There is no mechanism to create a quote for a new opportunity based on a previous one, or to use a quote as a template. This is a daily workflow in practice.

**Recommendation:** Add a "Clone quote" action that creates a new quote (linked to any opportunity) from an existing one.

### Minor

**C7. The Lot concept may confuse demo audiences.**
"Lots" are a valid concept in multi-site energy deals, but the term is not universal. Some organizations call them "bundles," "groups," or "portfolios." In a demo, the word "lot" without context may cause confusion.

**Recommendation:** Either rename to "Site Groups" for clarity, or ensure the UI has a brief explanation tooltip.

**C8. No "quick actions" or shortcut workflows.**
The journey from lead to contract requires navigating through 5-6 different modules, each with its own CRUD flow. For a demo, this is fine (you want to show each module). For actual usage or extended testing, users will want shortcuts like "Create quote" directly from the opportunity detail page, or "Convert to opportunity" as a button on the lead detail.

**Recommendation:** The plan does mention lead conversion, but ensure every entity detail page has contextual action buttons for the logical next step in the workflow.

---

## Recommendations: Specific Scope Adjustments

| # | Adjustment | Effort | Impact |
|---|---|---|---|
| R1 | Add `currentSupplier` and `contractEndDate` to Lead and Account | 0.25d | High - fundamental sales workflow |
| R2 | Add in-app notifications for pending approvals | 0.5d | High - makes approval workflow visible |
| R3 | Expand seed data to 8-12 opportunities, 3-4 quotes, multiple accounts | 0.5d | High - transforms demo from "empty app" to "working system" |
| R4 | Design quote builder UX with defaults cascade, completeness indicators, outlier highlighting | 0d (design only) | Critical - prevents Phase 4 from shipping an unusable screen |
| R5 | Add unified activity timeline on Account detail page | 0.5d | Medium - makes the system feel like a real sales tool |
| R6 | Rename "Lots" to "Site Groups" in the UI | 0d | Low - clarity for demos |
| R7 | Add "Clone quote" action | 0.25d | Medium - common sales workflow |

**Total additional effort: ~2 days.** Worth it.

---

## Demo Scenario Assessment

### What works
The planned seed data creates one complete happy path. You can walk a prospect through: "Here is a lead that came in, we qualified it, created an account with 50 sites, built a quote with component-based pricing, generated a proposal, and got the contract signed." This is a solid 10-minute demo narrative.

### What is missing

**1. The "wow" moment is buried.**
The most impressive part of this system is the component-based pricing across 50 sites. But in the current plan, you have to click through several screens to get there. The demo should be designed so you can get to the quote builder within 2-3 clicks from the dashboard and immediately show a large multi-site quote with the full component breakdown.

**2. No "before and after" story.**
The demo would be stronger if the seed data included a scenario that shows the problem being solved. For example: "This customer sent us a spreadsheet with 50 sites. Watch me import it, and in 3 minutes I have a fully priced quote." The CSV import of sites + CSV import of network charges into the quote builder is the killer demo flow, and it should be rehearsed and optimized.

**3. The dashboard needs to tell a story on first load.**
When a prospect first sees the system, the dashboard is the first impression. With only 1 complete deal, the pipeline chart will have one bar and the conversion funnel will show "1" at each stage. This looks like a test environment, not a working system. You need enough seed data that the dashboard looks like a real team has been using it for a month.

**4. Manager vs. rep perspective is not demoed.**
The three roles (Admin, Manager, Rep) are defined but the demo scenario does not call out how you would show the difference. A strong demo shows: "As a sales rep, I see my deals. As a manager, I see the full pipeline and I have this quote waiting for my approval." Consider adding a moment in the demo script where you switch users.

### Recommended Demo Script

1. **Open on dashboard** (as Sales Manager) - show pipeline with 10+ deals, KPIs, "renewals coming up" widget
2. **Drill into a new lead** - show qualification, convert to account + opportunity
3. **Show multi-site account** - the 50-site account with 3 site groups, imported via CSV
4. **Build a quote** - show the component pricing grid, import network charges via CSV, adjust supplier margin
5. **Show the margin calculation** - "we are at 8% margin across the portfolio, but these 3 sites are below threshold"
6. **Submit for approval** - switch to manager view, approve the quote
7. **Generate proposal PDF** - download, show the all-in vs. breakdown versions
8. **Generate contract** - show the site schedule appendix
9. **Back to dashboard** - "and now this deal moves to Won, our pipeline updates"

Total demo time: 12-15 minutes.

---

## MVP Cut Candidates

If the timeline is tight and you need to ship faster, here is what I would cut (in order of "cut first"):

| Feature | Module | Effort Saved | Why It Can Wait |
|---|---|---|---|
| Quote version comparison (side-by-side) | Phase 4 | 0.5d | Versioning itself is needed; side-by-side comparison is a nice-to-have. Users can open two browser tabs. |
| Global search | Phase 6 | 0.5d | Navigation and list-page filters are sufficient for a demo. |
| Account hierarchy (parent-child) | Phase 2 | 0.5d | Important for enterprise customers but not needed to demonstrate the core flow. Can add post-MVP. |
| Lot-level pricing (propagate to sites) | Phase 4 | 0.5d | Site-level pricing with CSV upload is sufficient. Lot-level propagation is a convenience feature. |
| Responsive/tablet polish | Phase 6 | 0.5d | Demo on desktop. No one demos B2B enterprise software on a tablet. |
| Contract PDF generation | Phase 5 | 1d | The proposal PDF demonstrates the capability. The contract PDF is structurally similar. Ship proposal PDF first, add contract PDF if time permits. |

**Total recoverable: ~3.5 days.** This compresses the timeline from 4-6 weeks to approximately 3.5-5 weeks for a single developer.

### What you absolutely cannot cut

- Multi-site management with CSV import
- Component-based pricing on quotes
- The kanban pipeline view
- Proposal PDF generation (the tangible output)
- Seed data (invest here, not cut here)

---

## Final Verdict

This is a well-scoped MVP with a clear understanding of what makes B2B energy sales software different from a generic CRM. The analysis document is thorough, and the plan is realistic in its time estimates.

The biggest risks are:

1. **The quote builder UX** - this will make or break the demo. Invest design time before coding.
2. **Thin seed data** - a half-day investment in richer seed data will dramatically improve every demo and test session.
3. **Missing contract end date** - this is table-stakes for B2B energy sales and its absence will be noticed immediately by any domain expert in the room.

Address those three items and this MVP will be demo-ready and credible for B2B energy sales stakeholders.
