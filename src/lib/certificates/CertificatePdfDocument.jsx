import path from "path";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { colors } from "@/theme/tokens";

const LOGO_PATH = path.join(process.cwd(), "public", "assets", "logo.png");

/** A4 landscape — exact PDF points (297mm × 210mm). */
const A4_LANDSCAPE_WIDTH = 841.89;
const A4_LANDSCAPE_HEIGHT = 595.28;
const PAGE_MARGIN = 18;
const FRAME_PAD = 4;
const CONTENT_WIDTH = A4_LANDSCAPE_WIDTH - PAGE_MARGIN * 2;
const CONTENT_HEIGHT = A4_LANDSCAPE_HEIGHT - PAGE_MARGIN * 2;
const INNER_WIDTH = CONTENT_WIDTH - FRAME_PAD;
const INNER_HEIGHT = CONTENT_HEIGHT - FRAME_PAD;

const C = {
  green: colors.primary.DEFAULT,
  greenDark: colors.primary.dark,
  greenLight: colors.primary.light,
  cream: "#fafbf9",
  white: "#ffffff",
  text: colors.neutral[800],
  muted: colors.neutral[500],
  border: colors.neutral[300],
  gold: "#9a7b4f",
};

const styles = StyleSheet.create({
  page: {
    width: A4_LANDSCAPE_WIDTH,
    height: A4_LANDSCAPE_HEIGHT,
    backgroundColor: C.cream,
    fontFamily: "Helvetica",
    padding: PAGE_MARGIN,
  },
  outerFrame: {
    width: CONTENT_WIDTH,
    height: CONTENT_HEIGHT,
    borderWidth: 2,
    borderColor: C.green,
    borderRadius: 3,
    padding: 2,
  },
  innerFrame: {
    width: INNER_WIDTH,
    height: INNER_HEIGHT,
    borderWidth: 1,
    borderColor: C.gold,
    borderRadius: 2,
    backgroundColor: C.white,
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: C.green,
    backgroundColor: C.greenLight,
  },
  logo: {
    height: 40,
    maxWidth: 120,
    objectFit: "contain",
    marginRight: 14,
  },
  headerTextBlock: {
    flex: 1,
  },
  orgName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.greenDark,
  },
  orgSub: {
    fontSize: 8,
    color: C.muted,
    marginTop: 2,
  },
  headerBadge: {
    backgroundColor: C.green,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 2,
  },
  headerBadgeText: {
    fontSize: 7,
    color: C.white,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
  },
  main: {
    flexGrow: 1,
    flexShrink: 0,
    paddingHorizontal: 36,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRibbon: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    width: "100%",
    justifyContent: "center",
  },
  ribbonLine: {
    height: 1,
    backgroundColor: C.border,
    width: 64,
  },
  title: {
    fontSize: 22,
    fontFamily: "Times-Bold",
    color: C.green,
    letterSpacing: 2.5,
    marginHorizontal: 12,
    textTransform: "uppercase",
  },
  certifyLine: {
    fontSize: 11,
    color: C.muted,
    fontFamily: "Times-Roman",
    marginBottom: 6,
  },
  recipientName: {
    fontSize: 30,
    fontFamily: "Times-Bold",
    color: C.text,
    textAlign: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    width: "82%",
  },
  narrative: {
    fontSize: 10.5,
    color: C.text,
    textAlign: "center",
    lineHeight: 1.45,
    maxWidth: 520,
    fontFamily: "Times-Roman",
  },
  midRow: {
    flexDirection: "row",
    marginTop: 16,
    width: "92%",
    alignItems: "stretch",
  },
  conferenceCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: C.greenLight,
    borderRadius: 3,
    borderLeftWidth: 3,
    borderLeftColor: C.green,
    justifyContent: "center",
  },
  conferenceTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.greenDark,
    textAlign: "center",
  },
  conferenceMeta: {
    fontSize: 8,
    color: C.muted,
    marginTop: 3,
    textAlign: "center",
  },
  statsCol: {
    width: 128,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  statBox: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 3,
    backgroundColor: C.white,
  },
  statValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: C.green,
  },
  statLabel: {
    fontSize: 7,
    color: C.muted,
    marginTop: 2,
    textTransform: "uppercase",
  },
  footer: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: "#f7f9f8",
    alignItems: "center",
    flexShrink: 0,
  },
  footerLeft: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 6,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  certNumber: {
    fontSize: 9,
    fontFamily: "Courier",
    color: C.greenDark,
    marginBottom: 4,
  },
  issuedDate: {
    fontSize: 8,
    color: C.text,
  },
  sealBlock: {
    alignItems: "center",
    marginHorizontal: 14,
  },
  seal: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: C.green,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.white,
  },
  sealText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.green,
  },
  sealSub: {
    fontSize: 6,
    color: C.muted,
    marginTop: 1,
  },
  qrBlock: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 3,
    padding: 5,
    backgroundColor: C.white,
  },
  qrImage: {
    width: 68,
    height: 68,
  },
  qrCaption: {
    fontSize: 6,
    color: C.muted,
    marginTop: 3,
    textAlign: "center",
    maxWidth: 70,
  },
});

/**
 * @param {{
 *   recipientName: string;
 *   conferenceTitle: string;
 *   conferenceTheme?: string | null;
 *   dateRange?: string | null;
 *   attendancePercent: number;
 *   daysAttended: number;
 *   totalDays: number;
 *   certificateNumber: string;
 *   issuedAt: Date | string;
 *   qrDataUrl: string;
 *   organiserName?: string | null;
 *   organiserShortName?: string | null;
 *   logoSrc?: string;
 * }} props
 */
export function CertificatePdfDocument({
  recipientName,
  conferenceTitle,
  conferenceTheme,
  dateRange,
  attendancePercent,
  daysAttended,
  totalDays,
  certificateNumber,
  issuedAt,
  qrDataUrl,
  organiserName,
  organiserShortName,
  logoSrc,
}) {
  const issuedLabel = new Date(issuedAt).toLocaleDateString("en-UG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const orgTitle = String(organiserName || "").trim() || "National Curriculum Development Centre";
  const orgShort = String(organiserShortName || "").trim() || "NCDC";
  const logo = logoSrc || LOGO_PATH;

  return (
    <Document
      title={`Certificate — ${recipientName}`}
      author={orgTitle}
      subject={conferenceTitle}
    >
      <Page
        size={[A4_LANDSCAPE_WIDTH, A4_LANDSCAPE_HEIGHT]}
        wrap={false}
        style={styles.page}
      >
        <View style={styles.outerFrame}>
          <View style={styles.innerFrame}>
            <View style={styles.header}>
              <Image src={logo} style={styles.logo} />
              <View style={styles.headerTextBlock}>
                <Text style={styles.orgName}>{orgTitle}</Text>
                <Text style={styles.orgSub}>{orgShort}</Text>
              </View>
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>OFFICIAL</Text>
              </View>
            </View>

            <View style={styles.main}>
              <View style={styles.titleRibbon}>
                <View style={styles.ribbonLine} />
                <Text style={styles.title}>Certificate of Attendance</Text>
                <View style={styles.ribbonLine} />
              </View>

              <Text style={styles.certifyLine}>This is to certify that</Text>
              <Text style={styles.recipientName}>{recipientName}</Text>

              <Text style={styles.narrative}>
                has participated in the conference below, attending {daysAttended} of {totalDays}{" "}
                scheduled day{totalDays === 1 ? "" : "s"} ({attendancePercent}% attendance), meeting
                the NCDC certification requirement of 90%.
              </Text>

              <View style={styles.midRow}>
                <View style={styles.conferenceCard}>
                  <Text style={styles.conferenceTitle}>{conferenceTitle}</Text>
                  {conferenceTheme ? (
                    <Text style={styles.conferenceMeta}>Theme: {conferenceTheme}</Text>
                  ) : null}
                  {dateRange ? <Text style={styles.conferenceMeta}>{dateRange}</Text> : null}
                </View>
                <View style={styles.statsCol}>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{attendancePercent}%</Text>
                    <Text style={styles.statLabel}>Attendance</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>
                      {daysAttended}/{totalDays}
                    </Text>
                    <Text style={styles.statLabel}>Days present</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.footer}>
              <View style={styles.footerLeft}>
                <Text style={styles.footerLabel}>Certificate number</Text>
                <Text style={styles.certNumber}>{certificateNumber}</Text>
                <Text style={styles.footerLabel}>Date of issue</Text>
                <Text style={styles.issuedDate}>{issuedLabel}</Text>
              </View>

              <View style={styles.sealBlock}>
                <View style={styles.seal}>
                  <Text style={styles.sealText}>{orgShort.slice(0, 8)}</Text>
                </View>
                <Text style={styles.sealSub}>Certified</Text>
              </View>

              <View style={styles.qrBlock}>
                <Image src={qrDataUrl} style={styles.qrImage} />
                <Text style={styles.qrCaption}>Scan to verify</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
