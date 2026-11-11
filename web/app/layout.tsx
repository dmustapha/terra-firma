import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Public_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { GroundBand } from "@/components/ground-band";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { REPO_URL, DEPLOYED, SITE_URL } from "@/lib/ui-chain";

const sans = Public_Sans({ variable: "--font-public-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"], style: ["normal", "italic"] });
const display = Instrument_Serif({ variable: "--font-instrument-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

export const metadata: Metadata = {
  metadataBase: SITE_URL ? new URL(SITE_URL) : undefined,
  title: { default: "Terra Firma: your memes, in real stock", template: "%s · Terra Firma" },
  description: "See what your memes would be in NVDA today. Move the dead ones into real stock with one confirmation. Every trade after builds real stock and burns $WIF.",
};

export const viewport: Viewport = {
  themeColor: "#f1ebdd",
  width: "device-width",
  initialScale: 1,
};

/** Light (paper) is the default; dark is opt-in and persisted. Runs before paint so there is no flash. */
const themeScript = `try{if(localStorage.getItem("tf.theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;

const footLink = "inline-flex min-h-11 items-center underline decoration-line underline-offset-4 transition-colors duration-150 hover:text-fg hover:decoration-fg";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${sans.variable} ${display.variable} flex min-h-dvh flex-col antialiased`}>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-fg">
          Skip to content
        </a>
        <Providers>
          <SiteHeader />
          {!DEPLOYED && (
            <div role="note" className="mx-auto w-full max-w-[80rem] px-4 sm:px-6 lg:px-8">
              <p className="mt-3 border-y border-warn/50 bg-warn-soft px-4 py-2.5 text-sm leading-relaxed">
                <span className="font-display text-lg italic text-warn">Notice.</span>{" "}
                <strong className="font-semibold">Contracts deploying: read-only preview.</strong> Transaction buttons stay off until the Terra Firma contracts
                are live on Robinhood Chain. Nothing on this site is simulated.
              </p>
            </div>
          )}
          <main id="main" className="mx-auto w-full max-w-[80rem] flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
            {children}
          </main>
          <GroundBand />
          <footer className="border-t border-line-strong">
            <div className="mx-auto flex max-w-[80rem] flex-col gap-3 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
              <p>
                <span className="font-display text-base italic text-fg">Terra Firma</span> runs on Robinhood Chain. Ownerless contracts. $WIF is only bought, burned and staked.
              </p>
              <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-1">
                <Link href="/proof" className={footLink}>Proof</Link>
                {REPO_URL && (
                  <>
                    <a href={`${REPO_URL}/blob/main/SECURITY.md`} target="_blank" rel="noopener noreferrer" className={footLink}>Security notes</a>
                    <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={footLink}>Source code</a>
                  </>
                )}
              </nav>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
