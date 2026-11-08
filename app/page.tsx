import { cookies } from "next/headers";
import Home from "@/components/home";
import { SITE, THEMES, type ThemeName } from "@/config/site";

// `?menu=1` = come back to the open menu (the panels' "back" link uses it).
export default async function Page({ searchParams }: PageProps<"/">) {
  const saved = (await cookies()).get("theme")?.value as ThemeName | undefined;
  const theme = saved && THEMES.includes(saved) ? saved : SITE.defaultTheme;
  const menu = (await searchParams).menu === "1";
  return <Home initialTheme={theme} initialMenu={menu} />;
}
