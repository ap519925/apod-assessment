import Link from "next/link";
import { pageHref } from "@/lib/apod";

export default function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null;

  const linkClass = "rounded-lg border border-slate-800 px-4 py-2 text-sky-400 hover:border-slate-600";

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex items-center justify-between gap-4 border-t border-slate-800 pt-6 text-sm"
    >
      {page > 1 ? (
        <Link href={pageHref(page - 1)} className={linkClass}>
          &larr; Newer
        </Link>
      ) : (
        <span />
      )}
      <span className="text-slate-400">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={pageHref(page + 1)} className={linkClass}>
          Older &rarr;
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
