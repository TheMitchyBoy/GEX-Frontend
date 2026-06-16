export type NavLink = { href: string; label: string; processorOnly?: boolean; uwOnly?: boolean };

export const navSections: Array<{ label: string; links: NavLink[] }> = [
  {
    label: "Live",
    links: [
      { href: "/", label: "Overview" },
      { href: "/timeline", label: "Intraday" },
      { href: "/history", label: "History" },
      { href: "/uw-data", label: "UW Data", uwOnly: true },
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
      { href: "/surface", label: "Surface" },
      { href: "/greeks", label: "Greeks" },
    ],
  },
  {
    label: "Journal",
    links: [
      { href: "/quality", label: "Quality", processorOnly: true },
      { href: "/training", label: "Training", processorOnly: true },
      { href: "/trades", label: "Trades", processorOnly: true },
      { href: "/decisions", label: "Decisions", processorOnly: true },
      { href: "/llm-predictions", label: "LLM", processorOnly: true },
      { href: "/daily-insights", label: "Insights", processorOnly: true },
    ],
  },
];

export function filterNavLinks(
  links: NavLink[],
  schemaMode: "processor" | "uw_raw" | null,
): NavLink[] {
  return links.filter((link) => {
    if (link.processorOnly && schemaMode === "uw_raw") return false;
    if (link.uwOnly && schemaMode === "processor") return false;
    if (link.uwOnly && schemaMode === null) return false;
    return true;
  });
}
