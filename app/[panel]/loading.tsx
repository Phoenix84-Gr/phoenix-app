// Shown the instant a menu item is tapped, while the panel loads its data.
export default function Loading() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6" aria-busy="true" aria-live="polite">
      <span className="orb orb-sm" aria-hidden />
      <p className="tech text-muted">Loading</p>
    </main>
  );
}
