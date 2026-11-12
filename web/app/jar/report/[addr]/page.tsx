import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAddress } from "viem";
import { ReportShare } from "@/components/report-share";
import type { ReactNode } from "react";
import { AddrLink, Notice } from "@/components/ui";
import { addrUrl, TF } from "@/lib/config";
import { orDash, short, sig4, signedSig4, signedUsd, usd } from "@/lib/ui-format";
import { jarReport, type JarReport } from "@/lib/ui-report";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Props = { params: Promise<{ addr: string }> };

const PLATE = "plate-lit -mx-2 px-5 py-7 sm:-mx-4 sm:px-10 sm:py-10";

/** Display figure under a mono eyebrow, linked to the explorer page that holds it. */
function Fig({ k, sub, href, hero, children }: { k: string; sub?: string; href: string; hero?: boolean; children: ReactNode }) {
  const size = hero ? "text-[clamp(4rem,2.4rem+5vw,7.5rem)]" : "text-[clamp(2.5rem,2rem+1.8vw,3.75rem)]";
  return (
    <div className="min-w-0">
      <p className="eyebrow text-muted">{k}</p>
      <a href={href} target="_blank" rel="noopener noreferrer" className="mt-3 block rounded-sm decoration-accent-32 decoration-2 underline-offset-8 hover:underline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-fg">
        <span className={`num block font-display leading-[0.86] tracking-[-0.03em] [overflow-wrap:anywhere] ${size}`}>{children}</span>
        <span className="sr-only">View on the explorer</span>
      </a>
      {sub && <p className="mt-2 text-xs text-muted">{sub}</p>}
    </div>
  );
}

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
      <header className="mb-10 sm:mb-14">
        <p className="eyebrow text-accent">Weekly Jar report · last 7 days</p>
        <h1 className="mt-3 max-w-[22ch] font-display text-[clamp(2.5rem,1.6rem+3vw,4.5rem)] leading-[0.92] tracking-[-0.025em] text-balance">
          Seven days of <em className="text-accent">new bedrock.</em>
        </h1>
        <p className="mt-4 max-w-[60ch] text-[1.0625rem] leading-relaxed text-muted">Wallet <AddrLink addr={addr} />. Last 7 days of Jar credits and withdrawals, valued at current Chainlink prices.</p>
      </header>
      {!report ? (
        <Notice tone="danger">The chain is busy. Refresh in a few seconds.</Notice>
      ) : !report.deployed ? (
        <section aria-labelledby="ledger-title" className={PLATE}>
          <p className="eyebrow text-accent">Last 7 days</p>
          <h2 id="ledger-title" className="mt-3 max-w-[24ch] font-display text-[clamp(2rem,1.4rem+2vw,3rem)] leading-[0.95]">No layers to log yet.</h2>
          <p className="mt-4 max-w-[56ch] text-[1.0625rem] leading-relaxed text-muted">Weekly reports start once the Terra Firma contracts are live on Robinhood Chain. Nothing is estimated in the meantime.</p>
        </section>
      ) : (
        <div className="space-y-10">
          <section aria-label="This week" className={PLATE}>
            <div className="grid items-end gap-x-12 gap-y-8 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Fig k="Jar value now" href={addrUrl(TF.Jar)} sub={report.usdNow === null ? "A live stock price is unavailable right now" : undefined} hero>
                {orDash(report.usdNow, usd)}
              </Fig>
              <Fig k="Added this week" href={addrUrl(TF.Jar)} sub={`${report.creditsWeek} credit${report.creditsWeek === 1 ? "" : "s"}`}>
                {signedUsd(report.usdWeek)}
              </Fig>
            </div>
            {report.rows.length === 0 ? (
              <p className="mt-8 border-t-[3px] border-double border-line-strong pt-5 text-muted">No Jar activity for this wallet yet. One sweep or convert and this report starts filling in.</p>
            ) : (
              <div className="well-bore mt-8 px-5 py-4 sm:px-7">
                <table className="num relative w-full text-sm">
                  <caption className="sr-only">Jar growth per stock</caption>
                  <thead className="border-b border-line text-left">
                    <tr className="eyebrow text-muted"><th className="py-2 font-medium">Stock</th><th className="py-2 text-right font-medium">Shares</th><th className="py-2 text-right font-medium">7-day</th><th className="py-2 text-right font-medium">Value</th></tr>
                  </thead>
                  <tbody>
                    {report.rows.map((r) => (
                      <tr key={r.symbol} className="border-t border-line first:border-t-0">
                        <th scope="row" className="py-3 text-left font-display text-[1.75rem] leading-none font-normal">{r.symbol}</th>
                        <td className="num py-3 text-right font-mono">{orDash(r.sharesNow, sig4)}</td>
                        <td className="num py-3 text-right font-mono text-accent">{signedSig4(r.sharesWeek)}</td>
                        <td className="num py-3 text-right font-mono">{orDash(r.usdNow, usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-5 text-xs text-muted">As of block {report.asOfBlock}. Read from your Jar&apos;s history on Robinhood Chain and Chainlink live prices. &ldquo;—&rdquo; means that live price could not be read; it is never estimated.</p>
          </section>
          {report.usdWeek !== null && <ReportShare addr={report.user} usdWeek={report.usdWeek} />}
        </div>
      )}
    </>
  );
}
