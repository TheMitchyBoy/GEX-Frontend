"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ProcessorBanner } from "@/components/ProcessorBanner";
import "./nav.css";

const links = [
  { href: "/", label: "Overview" },
  { href: "/profile", label: "GEX Profile" },
  { href: "/cumulative", label: "Cumulative" },
  { href: "/timeline", label: "Intraday" },
  { href: "/heatmap", label: "Heatmap" },
  { href: "/wall-drift", label: "Wall Drift" },
  { href: "/history", label: "History" },
  { href: "/term-structure", label: "Term Structure" },
  { href: "/greeks", label: "Greeks" },
  { href: "/trades", label: "Trades" },
  { href: "/decisions", label: "Decisions" },
  { href: "/llm-predictions", label: "LLM" },
  { href: "/daily-insights", label: "Insights" },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="site-nav">
        <div className="site-nav-inner">
          <Link href="/" className="brand">
            <span className="brand-mark">GEX</span>
            <span className="brand-sub">SPX Dashboard</span>
          </Link>
          <button
            type="button"
            className="nav-toggle"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
          >
            ☰
          </button>
          <nav className={`nav-links ${open ? "open" : ""}`}>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={pathname === link.href ? "active" : ""}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <ProcessorBanner />
    </>
  );
}
