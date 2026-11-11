import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { REPO_URL, DEPLOYED, SITE_URL } from "@/lib/ui-chain";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: SITE_URL ? new URL(SITE_URL) : undefined,
  title: { default: "Terra Firma: your memes, in real stock", template: "%s · Terra Firma" },
  description: "See what your memes would be in NVDA today. Move the dead ones into real stock with one confirmation. Every trade after builds real stock and burns $WIF.",
};

export const viewport: Viewport = {
  themeColor: "#12100d",
  width: "device-width",
  initialScale: 1,
};

const themeScript = `try{var t=localStorage.getItem("tf.theme");if(t==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${sans.variable} ${mono.variable} flex min-h-dvh flex-col antialiased`}>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-fg">
          Skip to content
        </a>
        <Providers>
          <SiteHeader />
          {!DEPLOYED && (
            <div role="note" className="border-b border-warn/40 bg-warn-soft">
              <p className="mx-auto max-w-6xl px-4 py-2.5 text-sm sm:px-6">
                <strong>Contracts deploying: read-only preview.</strong> Transaction buttons stay off until the Terra Firma contracts are live on
                mainnet. Nothing on this site is simulated.
              </p>
            </div>
          )}
          <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
            {children}
          </main>
          <footer className="border-t border-line">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p>Terra Firma runs on Robinhood Chain mainnet (4663). Ownerless contracts. $WIF is only bought, burned and staked.</p>
              <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
                <Link href="/proof" className="inline-flex min-h-11 items-center hover:text-fg">Proof</Link>
                {REPO_URL && (
                  <>
                    <a href={`${REPO_URL}/blob/main/SECURITY.md`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center hover:text-fg">SECURITY.md</a>
                    <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center hover:text-fg">Source</a>
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
