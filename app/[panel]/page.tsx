import { notFound } from "next/navigation";
import { panelById } from "@/config/panels";
import { PANEL_COMPONENTS } from "@/panels";

/** One route for every panel: /<id> looks the id up in config/panels.ts and renders its component.
 *  An unknown id, a "soon" panel or a panel without a component is a 404. */
export default async function PanelPage({ params }: PageProps<"/[panel]">) {
  const { panel } = await params;
  const def = panelById(panel);
  const Component = def ? PANEL_COMPONENTS[def.id] : undefined;
  if (!def || !Component) notFound();
  return <Component def={def} />;
}
