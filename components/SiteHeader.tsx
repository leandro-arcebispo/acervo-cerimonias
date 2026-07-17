"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/musicas", label: "Músicas" },
  { href: "/temas", label: "Temas" },
  { href: "/cerimonias", label: "Cerimônias" },
  { href: "/integrantes", label: "Integrantes" },
];

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header>
      <div className="masthead">
        <div className="masthead-inner">
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden="true">
              &#10086;
            </span>
            <span>
              <span className="brand-name">Acervo de Cerimônias</span>
              <br />
              <span className="brand-sub">Casa de Cura</span>
            </span>
          </Link>
        </div>
        <nav className="nav">
          {TABS.map((t) => {
            const active =
              pathname === t.href || pathname.startsWith(t.href + "/");
            return (
              <Link key={t.href} href={t.href} className={active ? "active" : ""}>
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
