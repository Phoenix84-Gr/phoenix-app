/** THE PANEL REGISTRY: every window of the app is one entry here plus one component in panels/<id>.tsx
 *  (registered in panels/index.ts). The home menu, the routes (/<id>) and the tests all read this list.
 *  Add a panel: copy an entry, give it a new id, create its component and (optionally) data/<id>.json. */
export const ICON_NAMES = ["chat", "gauge", "chart", "dumbbell", "book", "calendar", "mail", "sparkles"] as const;
export type IconName = (typeof ICON_NAMES)[number];

export type PanelDef = {
  /** lowercase letters, digits and dashes; it becomes the URL /<id> */
  id: string;
  title: string;
  subtitle: string;
  icon: IconName;
  /** "soon" shows a dimmed bubble in the menu and no page */
  status: "ready" | "soon";
};

export const PANELS: PanelDef[] = [
  { id: "assistant", title: "What are we building today?", subtitle: "Chat with your assistant", icon: "chat", status: "ready" },
  { id: "mission", title: "Mission Control", subtitle: "Every project at a glance", icon: "gauge", status: "ready" },
  { id: "markets", title: "Paper Markets", subtitle: "Practice portfolio · fictional", icon: "chart", status: "ready" },
  { id: "training", title: "Training", subtitle: "This week's sessions and lifts", icon: "dumbbell", status: "ready" },
  { id: "reading", title: "Reading List", subtitle: "Links worth your time", icon: "book", status: "ready" },
  { id: "calendar", title: "Calendar", subtitle: "Coming soon", icon: "calendar", status: "soon" },
  { id: "inbox", title: "Inbox", subtitle: "Coming soon", icon: "mail", status: "soon" },
];

export const PANEL_ID_RE = /^[a-z][a-z0-9-]{0,30}$/;

export function panelById(id: string): PanelDef | undefined {
  return PANELS.find((p) => p.id === id && p.status === "ready");
}
