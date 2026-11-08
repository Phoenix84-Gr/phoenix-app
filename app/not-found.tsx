import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="orb orb-sm" aria-hidden />
      <h1 className="text-2xl font-semibold">Nothing here</h1>
      <p className="text-muted">This panel does not exist or is not ready yet.</p>
      <Link href="/?menu=1" className="cta rounded-full px-6 py-3 font-semibold">
        Back to the menu
      </Link>
    </main>
  );
}
