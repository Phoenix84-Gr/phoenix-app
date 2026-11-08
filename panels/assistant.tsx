import type { PanelDef } from "@/config/panels";
import Chat from "@/components/chat";
import { SITE } from "@/config/site";

export default function Assistant({ def }: { def: PanelDef }) {
  return <Chat title={def.title} assistantName={SITE.assistantName} />;
}
