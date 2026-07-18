import type { Metadata } from "next";
import { Zilla_Slab } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

const zillaSlab = Zilla_Slab({
  weight: "500",
  subsets: ["latin"],
  variable: "--font-tom",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Acervo de Cerimônias",
  description:
    "Acervo de músicas, temas, cerimônias e integrantes do grupo de cerimônias musicais.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={zillaSlab.variable}>
      <body>
        <SiteHeader />
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
