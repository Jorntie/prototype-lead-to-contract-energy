import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.quoteLineComponent.deleteMany();
  await prisma.quoteLine.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.opportunitySite.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.site.deleteMany();
  await prisma.siteGroup.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.account.deleteMany();
  await prisma.priceComponentType.deleteMany();
  await prisma.user.deleteMany();

  // ============================================================
  // USERS
  // ============================================================
  const passwordHash = await hash("password123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@energy.com",
      name: "Admin User",
      role: "ADMIN",
      passwordHash,
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: "manager@energy.com",
      name: "Sarah Chen",
      role: "SALES_MANAGER",
      passwordHash,
    },
  });

  const rep1 = await prisma.user.create({
    data: {
      email: "rep1@energy.com",
      name: "James Wilson",
      role: "SALES_REP",
      passwordHash,
    },
  });

  const rep2 = await prisma.user.create({
    data: {
      email: "rep2@energy.com",
      name: "Maria Garcia",
      role: "SALES_REP",
      passwordHash,
    },
  });

  console.log("  ✅ Users created");

  // ============================================================
  // PRICE COMPONENT TYPES
  // ============================================================
  const energyCost = await prisma.priceComponentType.create({
    data: {
      name: "Energy Cost",
      category: "ENERGY",
      defaultUnit: "PER_KWH",
      defaultValue: 0.082,
      isPassThrough: false,
      isRequired: true,
      displayOrder: 1,
    },
  });

  const networkCharges = await prisma.priceComponentType.create({
    data: {
      name: "Network Charges",
      category: "NETWORK",
      defaultUnit: "PER_KW_MONTH",
      defaultValue: 3.50,
      isPassThrough: true,
      isRequired: true,
      displayOrder: 2,
    },
  });

  const energyTax = await prisma.priceComponentType.create({
    data: {
      name: "Energy Tax",
      category: "TAXES_LEVIES",
      defaultUnit: "PER_KWH",
      defaultValue: 0.035,
      isPassThrough: true,
      isRequired: true,
      displayOrder: 3,
    },
  });

  const renewableLevy = await prisma.priceComponentType.create({
    data: {
      name: "Renewable Levy",
      category: "TAXES_LEVIES",
      defaultUnit: "PER_KWH",
      defaultValue: 0.012,
      isPassThrough: true,
      isRequired: true,
      displayOrder: 4,
    },
  });

  const supplierMargin = await prisma.priceComponentType.create({
    data: {
      name: "Supplier Margin",
      category: "MARGIN",
      defaultUnit: "PER_KWH",
      defaultValue: 0.005,
      isPassThrough: false,
      isRequired: true,
      displayOrder: 5,
      marginBaseComponentIds: JSON.stringify([energyCost.id]),
    },
  });

  const greenCerts = await prisma.priceComponentType.create({
    data: {
      name: "Green Certificates",
      category: "GREEN",
      defaultUnit: "PER_KWH",
      defaultValue: 0.002,
      isPassThrough: false,
      isRequired: false,
      displayOrder: 6,
    },
  });

  console.log("  ✅ Price component types created");

  // ============================================================
  // LEADS
  // ============================================================
  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        companyName: "Alpine Manufacturing GmbH",
        contactName: "Klaus Weber",
        email: "k.weber@alpine-mfg.example.com",
        phone: "+49 89 1234567",
        estimatedSites: 12,
        estimatedVolume: 4500000,
        currentSupplier: "EnergyCorp",
        contractEndDate: new Date("2026-09-30"),
        status: "NEW",
        assignedToId: rep1.id,
      },
    }),
    prisma.lead.create({
      data: {
        companyName: "Nordic Retail Group",
        contactName: "Erik Svensson",
        email: "erik@nordic-retail.example.com",
        phone: "+46 8 9876543",
        estimatedSites: 45,
        estimatedVolume: 12000000,
        currentSupplier: "PowerNow",
        contractEndDate: new Date("2026-06-30"),
        status: "CONTACTED",
        assignedToId: rep1.id,
      },
    }),
    prisma.lead.create({
      data: {
        companyName: "Central Logistics BV",
        contactName: "Pieter de Vries",
        email: "p.devries@central-logistics.example.com",
        estimatedSites: 8,
        estimatedVolume: 2200000,
        currentSupplier: "GreenEnergy",
        contractEndDate: new Date("2026-12-31"),
        status: "QUALIFIED",
        assignedToId: rep2.id,
      },
    }),
    prisma.lead.create({
      data: {
        companyName: "Micro Solutions Ltd",
        contactName: "Tom Brown",
        email: "tom@microsolutions.example.com",
        estimatedSites: 1,
        estimatedVolume: 15000,
        status: "DISQUALIFIED",
        notes: "Too small — single site with very low consumption",
        assignedToId: rep2.id,
      },
    }),
    prisma.lead.create({
      data: {
        companyName: "Southern Hotels SA",
        contactName: "Ana Moreno",
        email: "ana@southern-hotels.example.com",
        estimatedSites: 22,
        estimatedVolume: 8500000,
        currentSupplier: "ElectraPower",
        contractEndDate: new Date("2026-08-15"),
        status: "NEW",
        assignedToId: rep1.id,
      },
    }),
    prisma.lead.create({
      data: {
        companyName: "Eastside Pharma Inc",
        contactName: "Dr. Li Wei",
        email: "l.wei@eastside-pharma.example.com",
        estimatedSites: 4,
        estimatedVolume: 6800000,
        currentSupplier: "IndustrialPower",
        contractEndDate: new Date("2027-03-31"),
        status: "CONTACTED",
        assignedToId: rep2.id,
      },
    }),
    prisma.lead.create({
      data: {
        companyName: "Metro Fresh Markets",
        contactName: "Sophie Laurent",
        email: "s.laurent@metro-fresh.example.com",
        estimatedSites: 35,
        estimatedVolume: 5000000,
        status: "NEW",
        assignedToId: rep1.id,
      },
    }),
    prisma.lead.create({
      data: {
        companyName: "Atlantic Shipping Co",
        contactName: "John O'Brien",
        email: "jobrien@atlantic-shipping.example.com",
        estimatedSites: 6,
        estimatedVolume: 3200000,
        currentSupplier: "MarineEnergy",
        contractEndDate: new Date("2026-11-30"),
        status: "QUALIFIED",
        assignedToId: rep2.id,
      },
    }),
  ]);

  console.log("  ✅ Leads created");

  // ============================================================
  // ACCOUNTS
  // ============================================================

  // Small account
  const acctSmall = await prisma.account.create({
    data: {
      name: "TechPark Solutions AG",
      industry: "Technology",
      creditStatus: "LOW_RISK",
      currentSupplier: "EnergyCorp",
      contractEndDate: new Date("2026-10-31"),
      createdById: rep1.id,
    },
  });

  // Medium account
  const acctMedium = await prisma.account.create({
    data: {
      name: "Europa Retail Holdings",
      industry: "Retail",
      creditStatus: "LOW_RISK",
      currentSupplier: "PowerNow",
      contractEndDate: new Date("2026-07-31"),
      createdById: rep1.id,
    },
  });

  // Large account with many sites
  const acctLarge = await prisma.account.create({
    data: {
      name: "Continental Logistics Group",
      industry: "Logistics & Warehousing",
      creditStatus: "MEDIUM_RISK",
      currentSupplier: "GreenEnergy",
      contractEndDate: new Date("2026-12-31"),
      createdById: rep2.id,
    },
  });

  // Another medium account
  const acctMedium2 = await prisma.account.create({
    data: {
      name: "Northern Healthcare Foundation",
      industry: "Healthcare",
      creditStatus: "LOW_RISK",
      currentSupplier: "CleanPower",
      contractEndDate: new Date("2027-01-31"),
      createdById: rep2.id,
    },
  });

  console.log("  ✅ Accounts created");

  // ============================================================
  // CONTACTS
  // ============================================================
  await prisma.contact.createMany({
    data: [
      { accountId: acctSmall.id, name: "Andreas Müller", email: "a.muller@techpark.example.com", role: "Decision Maker", isPrimary: true },
      { accountId: acctSmall.id, name: "Lisa Braun", email: "l.braun@techpark.example.com", role: "Procurement" },
      { accountId: acctMedium.id, name: "Marco Rossi", email: "m.rossi@europa-retail.example.com", role: "Procurement", isPrimary: true },
      { accountId: acctMedium.id, name: "Elena Popov", email: "e.popov@europa-retail.example.com", role: "Technical" },
      { accountId: acctLarge.id, name: "Hans Becker", email: "h.becker@continental-logistics.example.com", role: "Decision Maker", isPrimary: true },
      { accountId: acctLarge.id, name: "Yuki Tanaka", email: "y.tanaka@continental-logistics.example.com", role: "Procurement" },
      { accountId: acctLarge.id, name: "David Kim", email: "d.kim@continental-logistics.example.com", role: "Technical" },
      { accountId: acctMedium2.id, name: "Dr. Eva Schmidt", email: "e.schmidt@northern-health.example.com", role: "Decision Maker", isPrimary: true },
    ],
  });

  console.log("  ✅ Contacts created");

  // ============================================================
  // SITE GROUPS
  // ============================================================
  const sgSmallOffices = await prisma.siteGroup.create({
    data: { accountId: acctSmall.id, name: "Office Buildings" },
  });

  const sgRetailStores = await prisma.siteGroup.create({
    data: { accountId: acctMedium.id, name: "Retail Stores" },
  });
  const sgRetailWarehouses = await prisma.siteGroup.create({
    data: { accountId: acctMedium.id, name: "Distribution Centers" },
  });

  const sgLargeWarehouses = await prisma.siteGroup.create({
    data: { accountId: acctLarge.id, name: "Warehouses" },
  });
  const sgLargeOffices = await prisma.siteGroup.create({
    data: { accountId: acctLarge.id, name: "Regional Offices" },
  });
  const sgLargeDepots = await prisma.siteGroup.create({
    data: { accountId: acctLarge.id, name: "Transport Depots" },
  });

  console.log("  ✅ Site groups created");

  // ============================================================
  // SITES
  // ============================================================

  // Small account: 4 sites
  const smallSites = [];
  for (let i = 1; i <= 4; i++) {
    smallSites.push(
      await prisma.site.create({
        data: {
          accountId: acctSmall.id,
          siteGroupId: sgSmallOffices.id,
          address: `Tech Park Building ${i}, Innovation Street ${i * 10}, Business City`,
          meterId: `TP-${String(i).padStart(4, "0")}`,
          commodity: "ELECTRICITY",
          supplyCapacity: 25 + i * 5,
          annualConsumption: 80000 + i * 20000,
          peakPercentage: 65,
          voltageLevel: "LV",
          status: "ACTIVE",
        },
      })
    );
  }

  // Medium account: 15 sites (10 stores + 5 warehouses)
  const mediumSites = [];
  for (let i = 1; i <= 10; i++) {
    mediumSites.push(
      await prisma.site.create({
        data: {
          accountId: acctMedium.id,
          siteGroupId: sgRetailStores.id,
          address: `Europa Store #${i}, High Street ${i * 5}, City ${i}`,
          meterId: `ER-S${String(i).padStart(4, "0")}`,
          commodity: "ELECTRICITY",
          supplyCapacity: 15 + i * 2,
          annualConsumption: 45000 + i * 8000,
          peakPercentage: 70,
          voltageLevel: "LV",
          status: "ACTIVE",
        },
      })
    );
  }
  for (let i = 1; i <= 5; i++) {
    mediumSites.push(
      await prisma.site.create({
        data: {
          accountId: acctMedium.id,
          siteGroupId: sgRetailWarehouses.id,
          address: `Europa DC ${i}, Industrial Zone ${i}, Logistics Park`,
          meterId: `ER-W${String(i).padStart(4, "0")}`,
          commodity: "ELECTRICITY",
          supplyCapacity: 80 + i * 20,
          annualConsumption: 350000 + i * 50000,
          peakPercentage: 55,
          voltageLevel: "MV",
          status: "ACTIVE",
        },
      })
    );
  }

  // Large account: 50 sites (30 warehouses + 12 offices + 8 depots)
  const largeSites = [];
  for (let i = 1; i <= 30; i++) {
    largeSites.push(
      await prisma.site.create({
        data: {
          accountId: acctLarge.id,
          siteGroupId: sgLargeWarehouses.id,
          address: `Continental Warehouse ${i}, Logistics Boulevard ${i}, Zone ${Math.ceil(i / 10)}`,
          meterId: `CL-W${String(i).padStart(4, "0")}`,
          commodity: "ELECTRICITY",
          supplyCapacity: 100 + (i % 5) * 30,
          annualConsumption: 400000 + (i % 8) * 60000,
          peakPercentage: 50 + (i % 10),
          voltageLevel: i <= 10 ? "HV" : "MV",
          status: "ACTIVE",
        },
      })
    );
  }
  for (let i = 1; i <= 12; i++) {
    largeSites.push(
      await prisma.site.create({
        data: {
          accountId: acctLarge.id,
          siteGroupId: sgLargeOffices.id,
          address: `Continental Regional Office ${i}, Business Park ${i}`,
          meterId: `CL-O${String(i).padStart(4, "0")}`,
          commodity: "ELECTRICITY",
          supplyCapacity: 20 + i * 3,
          annualConsumption: 60000 + i * 12000,
          peakPercentage: 68,
          voltageLevel: "LV",
          status: "ACTIVE",
        },
      })
    );
  }
  for (let i = 1; i <= 8; i++) {
    largeSites.push(
      await prisma.site.create({
        data: {
          accountId: acctLarge.id,
          siteGroupId: sgLargeDepots.id,
          address: `Continental Depot ${i}, Transport Hub ${i}`,
          meterId: `CL-D${String(i).padStart(4, "0")}`,
          commodity: "ELECTRICITY",
          supplyCapacity: 60 + i * 10,
          annualConsumption: 180000 + i * 25000,
          peakPercentage: 45,
          voltageLevel: "MV",
          status: "ACTIVE",
        },
      })
    );
  }

  // Healthcare account: 6 sites
  const healthSites = [];
  for (let i = 1; i <= 6; i++) {
    healthSites.push(
      await prisma.site.create({
        data: {
          accountId: acctMedium2.id,
          address: `Northern Health Facility ${i}, Medical Park ${i}`,
          meterId: `NH-${String(i).padStart(4, "0")}`,
          commodity: "ELECTRICITY",
          supplyCapacity: 50 + i * 15,
          annualConsumption: 200000 + i * 40000,
          peakPercentage: 60,
          voltageLevel: i <= 2 ? "MV" : "LV",
          status: "ACTIVE",
        },
      })
    );
  }

  console.log("  ✅ Sites created (75 total)");

  // ============================================================
  // OPPORTUNITIES
  // ============================================================
  const opp1 = await prisma.opportunity.create({
    data: {
      accountId: acctSmall.id,
      stage: "QUOTING",
      expectedCloseDate: new Date("2026-05-15"),
      contractDuration: 24,
      assignedToId: rep1.id,
    },
  });

  const opp2 = await prisma.opportunity.create({
    data: {
      accountId: acctMedium.id,
      stage: "PROPOSAL_SENT",
      expectedCloseDate: new Date("2026-04-30"),
      contractDuration: 36,
      assignedToId: rep1.id,
    },
  });

  const opp3 = await prisma.opportunity.create({
    data: {
      accountId: acctLarge.id,
      stage: "NEGOTIATION",
      expectedCloseDate: new Date("2026-06-30"),
      contractDuration: 24,
      assignedToId: rep2.id,
    },
  });

  const opp4 = await prisma.opportunity.create({
    data: {
      accountId: acctMedium2.id,
      stage: "DISCOVERY",
      expectedCloseDate: new Date("2026-07-31"),
      contractDuration: 12,
      assignedToId: rep2.id,
    },
  });

  const opp5 = await prisma.opportunity.create({
    data: {
      accountId: acctSmall.id,
      stage: "WON",
      contractDuration: 12,
      estimatedValue: 85000,
      assignedToId: rep1.id,
    },
  });

  const opp6 = await prisma.opportunity.create({
    data: {
      accountId: acctMedium.id,
      stage: "LOST",
      contractDuration: 24,
      winLossReason: "Price too high — competitor offered 5% lower on energy cost",
      assignedToId: rep1.id,
    },
  });

  // Additional opportunities to fill pipeline
  await prisma.opportunity.create({
    data: {
      accountId: acctLarge.id,
      stage: "QUOTING",
      expectedCloseDate: new Date("2026-08-15"),
      contractDuration: 36,
      assignedToId: rep2.id,
    },
  });

  await prisma.opportunity.create({
    data: {
      accountId: acctMedium.id,
      stage: "DISCOVERY",
      expectedCloseDate: new Date("2026-09-30"),
      contractDuration: 24,
      assignedToId: rep1.id,
    },
  });

  console.log("  ✅ Opportunities created (8 total)");

  // Link sites to opportunities
  await Promise.all(
    smallSites.map((site) =>
      prisma.opportunitySite.create({
        data: { opportunityId: opp1.id, siteId: site.id },
      })
    )
  );

  await Promise.all(
    mediumSites.map((site) =>
      prisma.opportunitySite.create({
        data: { opportunityId: opp2.id, siteId: site.id },
      })
    )
  );

  await Promise.all(
    largeSites.slice(0, 30).map((site) =>
      prisma.opportunitySite.create({
        data: { opportunityId: opp3.id, siteId: site.id },
      })
    )
  );

  await Promise.all(
    healthSites.map((site) =>
      prisma.opportunitySite.create({
        data: { opportunityId: opp4.id, siteId: site.id },
      })
    )
  );

  console.log("  ✅ Opportunity-site links created");

  // ============================================================
  // QUOTES
  // ============================================================

  // Draft quote (being built)
  const quote1 = await prisma.quote.create({
    data: {
      opportunityId: opp1.id,
      accountId: acctSmall.id,
      version: 1,
      status: "DRAFT",
      validUntil: new Date("2026-05-30"),
      currency: "EUR",
      paymentTerms: "NET_30",
      billingFrequency: "MONTHLY",
      showBreakdown: true,
      createdById: rep1.id,
    },
  });

  // Pending approval (below margin threshold)
  const quote2 = await prisma.quote.create({
    data: {
      opportunityId: opp2.id,
      accountId: acctMedium.id,
      version: 1,
      status: "PENDING_APPROVAL",
      validUntil: new Date("2026-04-15"),
      currency: "EUR",
      paymentTerms: "NET_30",
      billingFrequency: "MONTHLY",
      totalValue: 285000,
      totalMargin: 8500,
      marginPercentage: 3.1,
      showBreakdown: true,
      createdById: rep1.id,
    },
  });

  // Approved and sent
  const quote3 = await prisma.quote.create({
    data: {
      opportunityId: opp3.id,
      accountId: acctLarge.id,
      version: 2,
      status: "SENT",
      validUntil: new Date("2026-06-15"),
      currency: "EUR",
      paymentTerms: "NET_60",
      billingFrequency: "QUARTERLY",
      totalValue: 1250000,
      totalMargin: 95000,
      marginPercentage: 8.2,
      showBreakdown: false,
      createdById: rep2.id,
      approvedById: manager.id,
    },
  });

  // Accepted quote (for the won opportunity)
  const quote4 = await prisma.quote.create({
    data: {
      opportunityId: opp5.id,
      accountId: acctSmall.id,
      version: 1,
      status: "ACCEPTED",
      currency: "EUR",
      paymentTerms: "NET_30",
      billingFrequency: "MONTHLY",
      totalValue: 85000,
      totalMargin: 6800,
      marginPercentage: 8.7,
      showBreakdown: true,
      createdById: rep1.id,
      approvedById: manager.id,
    },
  });

  console.log("  ✅ Quotes created (4 total)");

  // ============================================================
  // CONTRACT
  // ============================================================
  await prisma.contract.create({
    data: {
      quoteId: quote4.id,
      accountId: acctSmall.id,
      status: "SIGNED",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      signedDate: new Date("2025-12-15"),
    },
  });

  console.log("  ✅ Contract created");

  // ============================================================
  // ACTIVITY LOG
  // ============================================================
  const activityData = [
    { entityType: "Lead", entityId: leads[0].id, userId: rep1.id, type: "CREATED", content: 'Lead "Alpine Manufacturing GmbH" created' },
    { entityType: "Lead", entityId: leads[1].id, userId: rep1.id, type: "STATUS_CHANGE", content: "Status changed from NEW to CONTACTED" },
    { entityType: "Account", entityId: acctSmall.id, userId: rep1.id, type: "CREATED", content: 'Account "TechPark Solutions AG" created' },
    { entityType: "Account", entityId: acctLarge.id, userId: rep2.id, type: "CREATED", content: 'Account "Continental Logistics Group" created' },
    { entityType: "Opportunity", entityId: opp1.id, userId: rep1.id, type: "CREATED", content: "Opportunity created for TechPark Solutions AG" },
    { entityType: "Opportunity", entityId: opp3.id, userId: rep2.id, type: "STATUS_CHANGE", content: "Status changed from PROPOSAL_SENT to NEGOTIATION" },
    { entityType: "Quote", entityId: quote2.id, userId: rep1.id, type: "QUOTE_SUBMITTED", content: "Quote v1 submitted for approval (margin 3.1% — below threshold)" },
    { entityType: "Quote", entityId: quote3.id, userId: manager.id, type: "QUOTE_APPROVED", content: "Quote v2 approved by Sarah Chen" },
    { entityType: "Quote", entityId: quote4.id, userId: rep1.id, type: "STATUS_CHANGE", content: "Status changed from APPROVED to ACCEPTED" },
    { entityType: "Opportunity", entityId: opp5.id, userId: rep1.id, type: "STATUS_CHANGE", content: "Deal won! Status changed from NEGOTIATION to WON" },
    { entityType: "Opportunity", entityId: opp2.id, userId: rep1.id, type: "NOTE", content: "Customer requested revised pricing for the distribution centers — network charges seem high" },
    { entityType: "Account", entityId: acctMedium.id, userId: rep1.id, type: "CALL", content: "Call with Marco Rossi — discussed renewal timeline, they want proposals by end of April" },
  ];

  await prisma.activityLog.createMany({
    data: activityData.map((a, i) => ({
      ...a,
      createdAt: new Date(Date.now() - (activityData.length - i) * 24 * 60 * 60 * 1000),
    })),
  });

  console.log("  ✅ Activity log entries created");

  // ============================================================
  // NOTIFICATIONS
  // ============================================================
  await prisma.notification.create({
    data: {
      userId: manager.id,
      type: "APPROVAL_REQUESTED",
      title: "Quote pending approval",
      message: "Europa Retail Holdings — Quote v1 with 3.1% margin needs your approval",
      entityType: "Quote",
      entityId: quote2.id,
      isRead: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId: rep1.id,
      type: "QUOTE_EXPIRING",
      title: "Quote expiring soon",
      message: "Europa Retail Holdings — Quote v1 expires on April 15",
      entityType: "Quote",
      entityId: quote2.id,
      isRead: false,
    },
  });

  console.log("  ✅ Notifications created");

  console.log("\n🎉 Seed completed successfully!");
  console.log("   Demo accounts:");
  console.log("   - admin@energy.com / password123 (Admin)");
  console.log("   - manager@energy.com / password123 (Sales Manager)");
  console.log("   - rep1@energy.com / password123 (Sales Rep - James Wilson)");
  console.log("   - rep2@energy.com / password123 (Sales Rep - Maria Garcia)");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
