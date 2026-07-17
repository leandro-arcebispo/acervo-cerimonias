import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

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
    <html lang="pt-BR">
      <body>
        <SiteHeader />
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
