export const PROJECT_TEMPLATES = [
  {
    emoji: "✦",
    title: "SaaS launch page",
    description: "Polished marketing site",
    prompt:
      "Design and build a polished SaaS launch page for an AI productivity product. Include a confident hero, interactive product preview, social proof, feature storytelling, pricing, FAQ, and a strong final call to action. Use a restrained editorial visual system, excellent typography, and subtle motion.",
  },
  {
    emoji: "◫",
    title: "Analytics cockpit",
    description: "Data-rich dashboard",
    prompt:
      "Create a modern analytics cockpit for a subscription business with a compact sidebar, revenue and retention metrics, interactive date filters, attractive charts, cohort insights, and a searchable customers table. Use realistic mock data and responsive interactions.",
  },
  {
    emoji: "⌘",
    title: "Team command center",
    description: "Projects and workflows",
    prompt:
      "Build a collaborative team command center with projects, a draggable kanban workflow, assignee avatars, priority filters, activity feed, and a quick-create dialog. Make every interaction work with local state and keep the interface compact and professional.",
  },
  {
    emoji: "◎",
    title: "Creator portfolio",
    description: "Editorial personal site",
    prompt:
      "Create a distinctive portfolio for a multidisciplinary product designer. Use an editorial grid, bold typography, immersive project cards, a detailed case-study modal, an about section, and a tasteful contact experience. Make it feel original rather than template-based.",
  },
  {
    emoji: "↗",
    title: "AI support desk",
    description: "Inbox and agent tools",
    prompt:
      "Build an AI support desk interface with a customer inbox, conversation detail, sentiment and priority signals, suggested responses, knowledge citations, and resolution metrics. Include working filters and interaction states with realistic mock data.",
  },
  {
    emoji: "◇",
    title: "Curated storefront",
    description: "Premium commerce UI",
    prompt:
      "Design a premium curated storefront for independent desk accessories. Include editorial collections, category filters, a responsive product grid, detailed product quick views, and a functional local cart. Use warm photography placeholders and sophisticated typography.",
  },
] as const;

export const MAX_SEGMENTS = 4;

export const SANDBOX_TIMEOUT_IN_MS = 60_000 * 10 * 3; // 30 mins
