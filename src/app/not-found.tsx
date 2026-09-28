import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <h1 className="text-2xl font-bold text-white">Lost in space</h1>
      <p className="mt-2 text-slate-400">
        That page doesn&apos;t exist. Only the nine most recent pictures are available here.
      </p>
      <Link href="/" className="mt-6 text-sky-400 hover:underline">
        Back to the home page
      </Link>
    </main>
  );
}
