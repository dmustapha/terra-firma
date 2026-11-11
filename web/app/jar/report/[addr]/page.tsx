import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAddress } from "viem";
import { ReportShare } from "@/components/report-share";
import { AddrLink, Notice, PageHeader, Panel, Stat } from "@/components/ui";
import { addrUrl, TF } from "@/lib/config";
import { short, sig4, usd } from "@/lib/ui-format";
import { jarReport, type JarReport } from "@/lib/ui-report";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Props = { params: Promise<{ addr: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { addr } = await params;
  return { title: `Weekly Jar report ${isAddress(addr) ? short(addr) : ""}` };
}

export default async function ReportPage({ params }: Props) {
  const { addr } = await params;
  if (!isAddress(addr)) notFound();
  let report: JarReport | null = null;
  try {
    report = await jarReport(addr);
  } catch {
    report = null;
  }
  return (
    <>
      <PageHeader title="Weekly Jar report" sub={<>Wallet <AddrLink addr={addr} />. Last 7 days of Jar credits and withdrawals, valued at current Chainlink prices.</>} />
      {!report ? (
        <Notice tone="danger">The chain is busy. Refresh in a few seconds.</Notice>
      ) : !report.deployed ? (
        <Notice tone="warn">Weekly reports start once the Terra Firma contracts are live on mainnet.</Notice>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Stat label="Jar value now" value={usd(report.usdNow)} href={addrUrl(TF.Jar)} />
            <Stat label="Added this week" value={`${report.usdWeek >= 0 ? "+" : ""}${usd(report.usdWeek)}`} sub={`${report.creditsWeek} credit${report.creditsWeek === 1 ? "" : "s"}`} />
          </div>
          <Panel>
            {report.rows.length === 0 ? (
              <p className="text-muted">No Jar activity for this wallet yet.</p>
            ) : (
              <table className="w-full text-sm">
                <caption className="sr-only">Jar growth per stock</caption>
                <thead className="text-left text-xs uppercase tracking-wider text-muted">
                  <tr><th className="py-2 font-medium">Stock</th><th className="py-2 text-right font-medium">Shares</th><th className="py-2 text-right font-medium">7-day</th><th className="py-2 text-right font-medium">Value</th></tr>
                </thead>
                <tbody>
                  {report.rows.map((r) => (
                    <tr key={r.symbol} className="border-t border-line">
                      <th scope="row" className="py-2.5 text-left font-semibold">{r.symbol}</th>
                      <td className="num py-2.5 text-right">{sig4(r.sharesNow)}</td>
                      <td className="num py-2.5 text-right text-accent">{r.sharesWeek >= 0 ? "+" : ""}{sig4(r.sharesWeek)}</td>
                      <td className="num py-2.5 text-right">{usd(r.usdNow)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="mt-4 text-xs text-muted">As of block {report.asOfBlock}. Read from Jar events and Chainlink live feeds.</p>
          </Panel>
          <ReportShare addr={report.user} usdWeek={report.usdWeek} />
        </div>
      )}
    </>
  );
}
