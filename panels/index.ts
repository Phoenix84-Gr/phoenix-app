import type { ComponentType } from "react";
import type { PanelDef } from "@/config/panels";
import Assistant from "./assistant";
import Mission from "./mission";
import Markets from "./markets";
import Training from "./training";
import Reading from "./reading";

/** Panel id (from config/panels.ts) → its component. A test checks that every "ready" panel has one. */
export const PANEL_COMPONENTS: Record<string, ComponentType<{ def: PanelDef }>> = {
  assistant: Assistant,
  mission: Mission,
  markets: Markets,
  training: Training,
  reading: Reading,
};
