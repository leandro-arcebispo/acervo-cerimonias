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
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <ellipse cx="12" cy="7.2" rx="2.5" ry="4" />
                <ellipse cx="12" cy="7.2" rx="2.5" ry="4" transform="rotate(72 12 12)" />
                <ellipse cx="12" cy="7.2" rx="2.5" ry="4" transform="rotate(144 12 12)" />
                <ellipse cx="12" cy="7.2" rx="2.5" ry="4" transform="rotate(216 12 12)" />
                <ellipse cx="12" cy="7.2" rx="2.5" ry="4" transform="rotate(288 12 12)" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <span className="brand-name">Acervo de Cerimônias</span>
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
