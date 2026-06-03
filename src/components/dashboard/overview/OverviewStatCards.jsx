import { ReportStatCards } from "@/components/reports/ReportStatCards";

/**
 * @param {{ stats: Array<{ label: string; value: number | string; icon?: string; highlight?: string }> }} props
 */
export function OverviewStatCards({ stats }) {
  if (!stats?.length) return null;
  return <ReportStatCards items={stats} />;
}
