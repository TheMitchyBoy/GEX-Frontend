"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ProcessorBanner } from "@/components/ProcessorBanner";
import "./nav.css";

const sections = [
  {
    label: "Live",
    links: [
      { href: "/", label: "Overview" },
      { href: "/timeline", label: "Intraday" },
      { href: "/history", label: "History" },
    ],
  },
  {
    label: "Charts",
    links: [
      { href: "/profile", label: "Profile" },
      { href: "/cumulative", label: "Cumulative" },
      { href: "/heatmap", label: "Heatmap" },
      { href: "/wall-drift", label: "Walls" },
      { href: "/term-structure", label: "Term" },
      { href: "/greeks", label: "Greeks" },
    ],
  },
  {
    label: "Journal",
    links: [
      { href: "/quality", label: "Quality" },
      { href: "/trades", label: "Trades" },
      { href: "/decisions", label: "Decisions" },
      { href: "/llm-predictions", label: "LLM" },
      { href: "/daily-insights", label: "Insights" },
    ],
  },
];

const mobileTabs = [
  { href: "/", label: "Home", icon: "◉" },
  { href: "/profile", label: "GEX", icon: "▥" },
  { href: "/timeline", label: "Day", icon: "↝" },
  { href: "/heatmap", label: "Map", icon: "▦" },
  { href: "/history", label: "Log", icon: "☰" },
];

const allLinks = sections.flatMap((s) => s.links);

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="site-nav">
        <div className="site-nav-inner">
          <Link href="/" className="brand" onClick={() => setOpen(false)}>
            <span className="brand-icon">Γ</span>
            <span className="brand-text">
              <span className="brand-mark">GEX</span>
              <span className="brand-sub">SPX · Gamma Exposure</span>
            </span>
          </Link>
          <button
            type="button"
            className={`nav-toggle ${open ? "open" : ""}`}
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
          <nav className={`nav-desktop ${open ? "open" : ""}`}>
            {sections.map((section) => (
              <div key={section.label} className="nav-section">
                <span className="nav-section-label">{section.label}</span>
                <div className="nav-section-links">
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={pathname === link.href ? "active" : ""}
                      onClick={() => setOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>
        {open ? (
          <nav className="nav-mobile-drawer">
            {allLinks.map((link) => (
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
        ) : null}
      </header>
      <ProcessorBanner />
      <nav className="mobile-tab-bar" aria-label="Quick navigation">
        {mobileTabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={pathname === tab.href ? "active" : ""}
          >
            <span className="tab-icon" aria-hidden>{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
