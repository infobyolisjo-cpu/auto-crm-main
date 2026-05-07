import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { NotificationChecker } from "@/components/shared/NotificationChecker";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Auto-CRM - Tu CRM con Inteligencia Artificial",
  description:
    "CRM conversacional con pipeline de ventas, clasificacion automatica de leads y seguimiento inteligente. Construido con Claude Code.",
  other: {
    google: "notranslate",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      translate="no"
      className={`${inter.variable} h-full antialiased notranslate`}
      suppressHydrationWarning
    >
      <head>
        {/* Explicit no-translate signals for all browser engines */}
        <meta httpEquiv="Content-Language" content="es" />
        <meta name="google" content="notranslate" />
      </head>
      <body
        className="min-h-full flex"
        translate="no"
        suppressHydrationWarning
      >
        <TooltipProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 p-4 md:p-6 bg-background overflow-y-scroll">
              {children}
            </main>
          </div>
          <Toaster />
          <NotificationChecker />
        </TooltipProvider>

        {/* Actively remove any translator DOM nodes injected by browsers or extensions */}
        <Script id="suppress-translators" strategy="afterInteractive">{`
          const TRANSLATOR_SELECTORS = [
            '#MicrosoftTranslatorWidget',
            '#TranslatorFloatWindowDiv',
            '#WidgetFloatDiv',
            '#ms-translator-widget',
            '#translateWidgetIframe',
            '[id*="MicrosoftTranslat"]',
            '[class*="microsoftTranslat"]',
            '.skiptranslate',
            '.goog-te-banner-frame',
            '#google_translate_element',
          ];

          function purgeTranslators() {
            TRANSLATOR_SELECTORS.forEach(function(sel) {
              document.querySelectorAll(sel).forEach(function(el) { el.remove(); });
            });
          }

          purgeTranslators();

          var observer = new MutationObserver(purgeTranslators);
          observer.observe(document.documentElement, { childList: true, subtree: true });
        `}</Script>
      </body>
    </html>
  );
}
