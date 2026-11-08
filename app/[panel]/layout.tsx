import { notFound } from "next/navigation";
import { panelById } from "@/config/panels";
import { PANEL_COMPONENTS } from "@/panels";

/** Checks the panel id BEFORE the loading screen starts streaming, so an unknown id gets a real 404 status
 *  (inside loading.tsx the status line would already have been sent as 200). */
export default async function PanelLayout({ children, params }: LayoutProps<"/[panel]">) {
  const { panel } = await params;
  const def = panelById(panel);
  if (!def || !PANEL_COMPONENTS[def.id]) notFound();
  return children;
}
