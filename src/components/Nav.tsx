"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { ProcessorBanner } from "@/components/ProcessorBanner";
import { SchemaBanner } from "@/components/SchemaBanner";
import { useSchema } from "@/components/SchemaProvider";
import { filterNavLinks, navSections } from "@/lib/nav-config";
import "./nav.css";

const mobileTabs = [
  { href: "/", label: "Home", icon: "◉" },
  { href: "/profile", label: "GEX", icon: "▥" },
  { href: "/timeline", label: "Day", icon: "↝" },
  { href: "/heatmap", label: "Map", icon: "▦" },
  { href: "/uw-data", label: "UW", icon: "◈", uwOnly: true },
  { href: "/history", label: "Log", icon: "☰" },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { mode } = useSchema();

  const sections = useMemo(
    () =>
      navSections.map((section) => ({
        ...section,
        links: filterNavLinks(section.links, mode),
      })),
    [mode],
  );

  const allLinks = sections.flatMap((s) => s.links);
  const tabs = mobileTabs.filter((tab) => {
    if (tab.uwOnly && mode !== "uw_raw") return false;
    if (tab.href === "/history" && mode === "uw_raw") return false;
    return true;
  });

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
      <SchemaBanner />
      <ProcessorBanner />
      <nav className="mobile-tab-bar" aria-label="Quick navigation">
        {tabs.map((tab) => (
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
