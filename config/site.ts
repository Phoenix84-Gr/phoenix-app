/** Words and defaults of the app. The visual-adapter edits this file (and the theme tokens in app/globals.css). */
export const SITE = {
  name: "Phoenix",
  tagline: "Your personal command center",
  lang: "en",
  /** "space" or "ocean": the palettes defined in app/globals.css */
  defaultTheme: "space",
  assistantName: "Athena",
} as const;

export type ThemeName = "space" | "ocean";
export const THEMES: ThemeName[] = ["space", "ocean"];
