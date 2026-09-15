import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { UserNamesProvider } from "@/context/UserNamesContext";
import AppShell from "@/components/AppShell";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-sans",
});

const basePath = process.env.GITHUB_ACTIONS === "true" ? "/Cuentaconjunta" : (process.env.NEXT_PUBLIC_BASE_PATH || "");

export const metadata: Metadata = {
  title: "Cuenta Conjunta - Finanzas en Pareja",
  description: "Gestión financiera compartida en pareja estilo Fintonic con sincronización bancaria PSD2",
  manifest: `${basePath}/manifest.json`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cuenta Conjunta",
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
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={plusJakartaSans.variable}>
      <head>
        <link rel="apple-touch-icon" href={`${basePath}/icons/icon-192.svg`} />
      </head>
      <body className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased selection:bg-[#00D09C]/20 selection:text-[#00A37A]">
        <AuthProvider>
          <UserNamesProvider>
            <AppShell>{children}</AppShell>
          </UserNamesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
