import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { formatKWh, formatWatts, formatWh, type LoadTotals } from "./calc";
import {
  computeDesignKpi,
  DEFAULT_DESIGN,
  type DesignParams,
  type DesignResults,
} from "./design";
import { formatNaira, type QuotationResult } from "./quotation";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#101820",
  },
  brand: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#0b1f33",
    marginBottom: 2,
  },
  brandAccent: {
    fontSize: 10,
    color: "#c4840f",
    marginBottom: 10,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 13,
    marginBottom: 12,
    color: "#14324f",
    fontFamily: "Helvetica-Bold",
  },
  meta: {
    marginBottom: 14,
    lineHeight: 1.5,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0b1f33",
    marginTop: 10,
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0b1f33",
    color: "#fff",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#d6d3d1",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  colName: { width: "32%" },
  colQty: { width: "8%", textAlign: "right" },
  colW: { width: "12%", textAlign: "right" },
  colH: { width: "12%", textAlign: "right" },
  colTW: { width: "12%", textAlign: "right" },
  colWh: { width: "12%", textAlign: "right" },
  colKWh: { width: "12%", textAlign: "right" },
  qDesc: { width: "46%" },
  qQty: { width: "10%", textAlign: "right" },
  qUnit: { width: "10%", textAlign: "right" },
  qPrice: { width: "17%", textAlign: "right" },
  qAmt: { width: "17%", textAlign: "right" },
  totals: {
    marginTop: 14,
    padding: 10,
    backgroundColor: "#fff7ed",
    borderRadius: 4,
  },
  totalLine: {
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 0.4,
    borderBottomColor: "#e7e5e4",
    paddingVertical: 5,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 8,
    color: "#78716c",
  },
});

export type PdfAudit = {
  proposalNo?: string | null;
  clientName: string;
  siteAddress?: string | null;
  phone?: string | null;
  auditor?: string | null;
  date: string;
  rows: {
    name: string;
    quantity: number;
    unitWatts: number;
    dailyHours: number;
    totalWatts: number;
    dailyWh: number;
    dailyKWh: number;
  }[];
  totals: LoadTotals;
  design?: DesignResults | null;
  designParams?: DesignParams | null;
  quote?: QuotationResult | null;
};

function Header({
  subtitle,
  proposalNo,
}: {
  subtitle: string;
  proposalNo?: string | null;
}) {
  return (
    <View>
      <Text style={styles.brand}>E-tech</Text>
      <Text style={styles.brandAccent}>Solar Engineering & Energy Solutions</Text>
      <Text style={styles.title}>{subtitle}</Text>
      {proposalNo ? <Text style={{ marginBottom: 8 }}>Proposal No: {proposalNo}</Text> : null}
    </View>
  );
}

export function AuditPdfDocument({ audit }: { audit: PdfAudit }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Header subtitle="Solar Power System Proposal — Energy Audit" proposalNo={audit.proposalNo} />

        <View style={styles.meta}>
          <Text>Client: {audit.clientName}</Text>
          {audit.siteAddress ? <Text>Site: {audit.siteAddress}</Text> : null}
          {audit.phone ? <Text>Phone: {audit.phone}</Text> : null}
          {audit.auditor ? <Text>Prepared by: {audit.auditor}</Text> : null}
          <Text>Date: {audit.date}</Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colName}>Appliance</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colW}>Watts</Text>
          <Text style={styles.colH}>Hours</Text>
          <Text style={styles.colTW}>Load W</Text>
          <Text style={styles.colWh}>Wh</Text>
          <Text style={styles.colKWh}>kWh</Text>
        </View>

        {audit.rows.map((r, i) => (
          <View key={i} style={styles.row} wrap={false}>
            <Text style={styles.colName}>{r.name}</Text>
            <Text style={styles.colQty}>{r.quantity}</Text>
            <Text style={styles.colW}>{r.unitWatts}</Text>
            <Text style={styles.colH}>{r.dailyHours.toFixed(1)}</Text>
            <Text style={styles.colTW}>{Math.round(r.totalWatts)}</Text>
            <Text style={styles.colWh}>{Math.round(r.dailyWh)}</Text>
            <Text style={styles.colKWh}>{r.dailyKWh.toFixed(2)}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <Text style={styles.totalLine}>
            TOTAL CONNECTED LOAD & DAILY ENERGY — {formatWatts(audit.totals.totalWatts)} |{" "}
            {formatWh(audit.totals.dailyWh)} | {formatKWh(audit.totals.dailyKWh)}
          </Text>
          <Text style={styles.totalLine}>
            DIVERSIFIED (80% DEMAND FACTOR) — {formatWatts(audit.totals.diversifiedWatts)} |{" "}
            {formatWh(audit.totals.diversifiedWh)} | {formatKWh(audit.totals.diversifiedKWh)}
          </Text>
        </View>

        <Text style={styles.footer}>
          Generated {new Date().toLocaleString()} · Confidential · E-tech Energy Audit Sheet Sync
        </Text>
      </Page>

      {audit.design ? (
        <Page size="A4" style={styles.page}>
          <Header subtitle="System Design & Sizing" proposalNo={audit.proposalNo} />
          {(() => {
            const kpi = computeDesignKpi(
              audit.design,
              audit.designParams ?? DEFAULT_DESIGN,
            );
            return (
              <View>
                <Text style={styles.sectionTitle}>System Performance & Design KPI Summary</Text>
                {(
                  [
                    [
                      "Daily Energy Demand",
                      `${kpi.dailyEnergyKWh.toFixed(2)} kWh`,
                      `Total Load: ${Math.round(kpi.totalLoadW).toLocaleString()} W`,
                    ],
                    [
                      "Recommended Inverter",
                      `${kpi.inverterSurgeKva.toFixed(1)} kVA / ${kpi.inverterContinuousKw.toFixed(1)} kW`,
                      `Surge Factor: ${kpi.surgeFactor} | Pure Sine`,
                    ],
                    [
                      "Solar PV Array Capacity",
                      `${kpi.arrayCapacityKwp.toFixed(1)} kWp`,
                      `${kpi.panelCount} × ${kpi.panelWatts}Wp Tier-1 Modules`,
                    ],
                    [
                      "Battery Storage Capacity",
                      `${kpi.batteryStorageKWh.toFixed(kpi.batteryStorageKWh % 1 ? 1 : 0)} kWh`,
                      `Storage Rating: ${Math.round(kpi.storageRatingAh)} Ah`,
                    ],
                    [
                      "Battery Bank Modules",
                      `${kpi.batteryModules} Modules (${kpi.systemVoltage}V ${kpi.batteryAh}Ah)`,
                      `Chemistry: ${kpi.chemistryLabel} (${Math.round(kpi.depthOfDischarge * 100)}% DoD)`,
                    ],
                    [
                      "Estimated Solar Generation",
                      `${kpi.estimatedGenerationKWh.toFixed(1)} kWh/day`,
                      `Solar Yield: ${kpi.solarYieldPct.toFixed(1)}% of Daily Demand`,
                    ],
                  ] as const
                ).map(([title, value, detail]) => (
                  <View key={title} style={{ marginBottom: 8 }} wrap={false}>
                    <Text style={{ fontSize: 8, color: "#5c6b7a" }}>
                      {title}
                    </Text>
                    <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: "#1d4ed8" }}>
                      {value}
                    </Text>
                    <Text style={{ fontSize: 8, color: "#5c6b7a" }}>{detail}</Text>
                  </View>
                ))}
              </View>
            );
          })()}
          <Text style={styles.sectionTitle}>Calculated Engineering Values</Text>
          {(
            [
              ["Daily energy", formatWh(audit.design.dailyWh)],
              ["Energy with inverter losses", formatWh(audit.design.energyWithInverterLossWh)],
              ["Gross battery energy", formatWh(audit.design.grossBatteryWh)],
              ["Battery capacity required", `${Math.round(audit.design.requiredBatteryAh)} Ah`],
              ["Battery units (100Ah)", String(audit.design.batteryUnits)],
              [
                "PV array size",
                `${Math.round(audit.design.requiredArrayWatts).toLocaleString()} W`,
              ],
              ["Panel count (550Wp)", String(audit.design.panelCount)],
              [
                "Inverter class (min)",
                `${audit.design.inverterMinWatts.toLocaleString()} W`,
              ],
              ["Diversified load", formatWatts(audit.design.diversifiedLoadW)],
            ] as const
          ).map(([k, v]) => (
            <View key={k} style={styles.resultRow}>
              <Text>{k}</Text>
              <Text>{v}</Text>
            </View>
          ))}
          <Text style={styles.footer}>E-tech Solar Engineering · System Design</Text>
        </Page>
      ) : null}

      {audit.quote ? (
        <Page size="A4" style={styles.page}>
          <Header subtitle="Quotation — Bill of Materials" proposalNo={audit.proposalNo} />
          <View style={styles.tableHeader}>
            <Text style={styles.qDesc}>Item</Text>
            <Text style={styles.qQty}>Qty</Text>
            <Text style={styles.qUnit}>Unit</Text>
            <Text style={styles.qPrice}>Unit Price</Text>
            <Text style={styles.qAmt}>Amount</Text>
          </View>
          {audit.quote.lines.map((l, i) => (
            <View key={i} style={styles.row} wrap={false}>
              <Text style={styles.qDesc}>{l.description}</Text>
              <Text style={styles.qQty}>{l.quantity}</Text>
              <Text style={styles.qUnit}>{l.unit}</Text>
              <Text style={styles.qPrice}>{formatNaira(l.unitPrice)}</Text>
              <Text style={styles.qAmt}>{formatNaira(l.quantity * l.unitPrice)}</Text>
            </View>
          ))}
          <View style={styles.totals}>
            <Text>Subtotal: {formatNaira(audit.quote.subtotal)}</Text>
            <Text>Installation (12%): {formatNaira(audit.quote.installation)}</Text>
            <Text>Contingency (5%): {formatNaira(audit.quote.contingency)}</Text>
            <Text style={styles.totalLine}>
              Grand Total: {formatNaira(audit.quote.total)}
            </Text>
          </View>
          <Text style={styles.footer}>
            Prices in NGN · Valid 14 days · E-tech Solar Engineering & Energy Solutions
          </Text>
        </Page>
      ) : null}
    </Document>
  );
}
