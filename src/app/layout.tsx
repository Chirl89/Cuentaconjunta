import type { Metadata, Viewport } from "next";
import "./globals.css";
import { UserNamesProvider } from "@/context/UserNamesContext";
import Header from "@/components/Header";

const basePath = process.env.GITHUB_ACTIONS === "true" ? "/Cuentaconjunta" : (process.env.NEXT_PUBLIC_BASE_PATH || "");

export const metadata: Metadata = {
  title: "FitDuo - Cuenta Conjunta Inteligente",
  description: "Control de gastos compartidos en pareja estilo Fintonic con sincronización bancaria PSD2",
  manifest: `${basePath}/manifest.json`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FitDuo",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="apple-touch-icon" href={`${basePath}/icons/icon-192.svg`} />
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-emerald-500/20 selection:text-emerald-300">
        <UserNamesProvider>
          <Header />
          <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-5 pb-safe-bottom">
            {children}
          </main>
        </UserNamesProvider>
      </body>
    </html>
  );
}
