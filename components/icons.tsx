import { BookOpen, CalendarDays, CandlestickChart, Dumbbell, Gauge, Mail, MessageCircle, Sparkles, type LucideIcon } from "lucide-react";
import type { IconName } from "@/config/panels";

// Thin-stroke Lucide icons (ISC licence). A panel picks one by name in config/panels.ts.
const ICONS: Record<IconName, LucideIcon> = {
  chat: MessageCircle,
  gauge: Gauge,
  chart: CandlestickChart,
  dumbbell: Dumbbell,
  book: BookOpen,
  calendar: CalendarDays,
  mail: Mail,
  sparkles: Sparkles,
};

export default function Icon({ name, size = 28 }: { name: IconName; size?: number }) {
  const C = ICONS[name] ?? MessageCircle;
  return <C size={size} strokeWidth={1.4} aria-hidden />;
}
