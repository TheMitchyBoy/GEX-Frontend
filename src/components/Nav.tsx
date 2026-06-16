import Link from "next/link";
import "./nav.css";

const links = [
  { href: "/", label: "Overview" },
  { href: "/profile", label: "GEX Profile" },
  { href: "/cumulative", label: "Cumulative GEX" },
  { href: "/timeline", label: "Intraday" },
  { href: "/history", label: "History" },
  { href: "/term-structure", label: "Term Structure" },
  { href: "/greeks", label: "Greeks" },
];

export function Nav() {
  return (
    <header className="site-nav">
      <div className="site-nav-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">GEX</span>
          <span className="brand-sub">SPX Dashboard</span>
        </Link>
        <nav className="nav-links">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
