import { NextRequest, NextResponse } from "next/server";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { getQuote } from "@/lib/services/quote.service";
import { auth } from "@/lib/auth";

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    marginBottom: 30,
    borderBottom: "2 solid #f59e0b",
    paddingBottom: 20,
  },
  companyName: {
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
  },
  subtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    marginTop: 20,
    color: "#1a1a1a",
    borderBottom: "1 solid #e5e7eb",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 4,
  },
  labelCol: {
    width: "40%",
    color: "#6b7280",
  },
  valueCol: {
    width: "60%",
    fontFamily: "Helvetica-Bold",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderBottom: "1 solid #d1d5db",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #e5e7eb",
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableFooter: {
    flexDirection: "row",
    borderTop: "2 solid #d1d5db",
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: "#f9fafb",
  },
  colSite: { width: "35%" },
  colKwh: { width: "20%", textAlign: "right" },
  colKw: { width: "15%", textAlign: "right" },
  colCost: { width: "30%", textAlign: "right" },
  componentRow: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingLeft: 20,
  },
  componentName: { width: "50%", color: "#6b7280", fontSize: 9 },
  componentUnit: { width: "25%", textAlign: "right", fontSize: 9, color: "#6b7280" },
  componentAmount: { width: "25%", textAlign: "right", fontSize: 9 },
  summaryBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#fffbeb",
    borderRadius: 4,
    border: "1 solid #fbbf24",
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 11,
    color: "#6b7280",
  },
  summaryValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  summaryTotal: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    fontSize: 8,
    color: "#9ca3af",
    borderTop: "1 solid #e5e7eb",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  termsSection: {
    marginTop: 20,
  },
  termItem: {
    flexDirection: "row",
    marginBottom: 4,
  },
  termBullet: {
    width: 12,
    color: "#f59e0b",
  },
  termText: {
    flex: 1,
    fontSize: 9,
    color: "#4b5563",
  },
});

function formatCurrency(value: number | null | undefined, currency = "EUR") {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface ProposalDocProps {
  quote: NonNullable<Awaited<ReturnType<typeof getQuote>>>;
  accountName: string;
}

function ProposalDocument({ quote, accountName }: ProposalDocProps) {
  const currency = quote.currency ?? "EUR";
  const quoteLines = quote.quoteLines ?? [];
  const totalKwh = quoteLines.reduce(
    (s, l) => s + (l.annualKwh ?? 0),
    0
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>EnergyLTC</Text>
          <Text style={styles.subtitle}>
            Energy Supply Proposal
          </Text>
        </View>

        {/* Proposal Info */}
        <Text style={styles.title}>Proposal for {accountName}</Text>

        <View style={styles.row}>
          <Text style={styles.labelCol}>Quote Reference</Text>
          <Text style={styles.valueCol}>
            v{quote.version}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.labelCol}>Date</Text>
          <Text style={styles.valueCol}>{formatDate(new Date())}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.labelCol}>Valid Until</Text>
          <Text style={styles.valueCol}>
            {formatDate(quote.validUntil)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.labelCol}>Payment Terms</Text>
          <Text style={styles.valueCol}>
            {quote.paymentTerms ?? "Net 30 days"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.labelCol}>Billing</Text>
          <Text style={styles.valueCol}>
            {quote.billingFrequency ?? "Monthly"}
          </Text>
        </View>

        {/* Sites Table */}
        <Text style={styles.sectionTitle}>Sites & Pricing</Text>

        <View style={styles.tableHeader}>
          <Text style={[styles.colSite, { fontFamily: "Helvetica-Bold" }]}>
            Site
          </Text>
          <Text style={[styles.colKwh, { fontFamily: "Helvetica-Bold" }]}>
            Annual kWh
          </Text>
          <Text style={[styles.colKw, { fontFamily: "Helvetica-Bold" }]}>
            Capacity kW
          </Text>
          <Text style={[styles.colCost, { fontFamily: "Helvetica-Bold" }]}>
            Annual Cost
          </Text>
        </View>

        {quoteLines.map((line) => {
          const lineCost = line.components.reduce(
            (s, c) => s + (c.annualAmount ?? 0),
            0
          );
          return (
            <React.Fragment key={line.id}>
              <View style={styles.tableRow}>
                <Text style={styles.colSite}>
                  {line.site?.address ?? "Unknown"}
                </Text>
                <Text style={styles.colKwh}>
                  {formatNumber(line.annualKwh)}
                </Text>
                <Text style={styles.colKw}>
                  {line.site?.supplyCapacity ?? "—"}
                </Text>
                <Text
                  style={[
                    styles.colCost,
                    { fontFamily: "Helvetica-Bold" },
                  ]}
                >
                  {formatCurrency(lineCost, currency)}
                </Text>
              </View>

              {/* Component breakdown */}
              {quote.showBreakdown &&
                line.components.map((comp) => (
                  <View key={comp.id} style={styles.componentRow}>
                    <Text style={styles.componentName}>
                      {comp.componentType?.name ?? "Component"}
                    </Text>
                    <Text style={styles.componentUnit}>
                      {comp.value != null
                        ? `${comp.value} ${comp.componentType?.defaultUnit === "PER_KWH" ? "€/kWh" : comp.componentType?.defaultUnit === "PER_KW_MONTH" ? "€/kW/mo" : comp.componentType?.defaultUnit === "PER_METER_MONTH" ? "€/meter/mo" : "€/year"}`
                        : "—"}
                    </Text>
                    <Text style={styles.componentAmount}>
                      {formatCurrency(comp.annualAmount, currency)}
                    </Text>
                  </View>
                ))}
            </React.Fragment>
          );
        })}

        <View style={styles.tableFooter}>
          <Text style={[styles.colSite, { fontFamily: "Helvetica-Bold" }]}>
            Total ({quoteLines.length} sites)
          </Text>
          <Text style={[styles.colKwh, { fontFamily: "Helvetica-Bold" }]}>
            {formatNumber(totalKwh)}
          </Text>
          <Text style={styles.colKw} />
          <Text
            style={[
              styles.colCost,
              { fontFamily: "Helvetica-Bold", fontSize: 12 },
            ]}
          >
            {formatCurrency(quote.totalValue, currency)}
          </Text>
        </View>

        {/* Summary Box */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Portfolio Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Annual Value</Text>
            <Text style={styles.summaryTotal}>
              {formatCurrency(quote.totalValue, currency)} / year
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Sites</Text>
            <Text style={styles.summaryValue}>{quoteLines.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Consumption</Text>
            <Text style={styles.summaryValue}>
              {formatNumber(totalKwh)} kWh/year
            </Text>
          </View>
        </View>

        {/* Terms */}
        <View style={styles.termsSection}>
          <Text style={styles.sectionTitle}>Terms & Conditions</Text>
          {[
            `Prices are quoted in ${currency} and are exclusive of VAT.`,
            `Payment terms: ${quote.paymentTerms ?? "Net 30 days"}.`,
            `Billing frequency: ${quote.billingFrequency ?? "Monthly"}.`,
            quote.validUntil
              ? `This proposal is valid until ${formatDate(quote.validUntil)}.`
              : "This proposal is valid for 30 days from the date of issue.",
            "Actual consumption may vary; invoices will be based on metered usage.",
            "Prices are subject to regulatory changes and network tariff adjustments.",
          ].map((term, i) => (
            <View key={i} style={styles.termItem}>
              <Text style={styles.termBullet}>&#x2022;</Text>
              <Text style={styles.termText}>{term}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>
            EnergyLTC — Energy Supply Proposal for {accountName}
          </Text>
          <Text>
            Generated {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const quote = await getQuote(id);

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const accountName =
      quote.opportunity?.account?.name ?? "Unknown Account";

    const buffer = await renderToBuffer(
      <ProposalDocument quote={quote} accountName={accountName} />
    );

    const filename = `Proposal_${accountName.replace(/[^a-zA-Z0-9]/g, "_")}_v${quote.version}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
