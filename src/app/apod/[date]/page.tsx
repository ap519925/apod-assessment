import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ApodMedia from "@/components/ApodMedia";
import MarkVisited from "@/components/MarkVisited";
import { formatDate, getApod, getArchive, pageHref, PAGE_SIZE } from "@/lib/apod";

// Static export: only the dates returned here get built, anything else 404s.
export const dynamicParams = false;

export async function generateStaticParams() {
  const apods = await getArchive();
  return apods.map((apod) => ({ date: apod.date }));
}

export async function generateMetadata({
  params,
}: PageProps<"/apod/[date]">): Promise<Metadata> {
  const apod = await getApod((await params).date);
  return { title: apod ? `${apod.title} | APOD` : "Not found" };
}

export default async function ApodPage({ params }: PageProps<"/apod/[date]">) {
  const { date } = await params;
  const apods = await getArchive();
  const index = apods.findIndex((a) => a.date === date);
  if (index === -1) notFound();

  const apod = apods[index];
  // list is newest first, so "newer" is the previous index
  const newer = apods[index - 1];
  const older = apods[index + 1];
  // send "back" to the grid page this APOD is on, not always the first one
  const backHref = pageHref(Math.floor(index / PAGE_SIZE) + 1);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <MarkVisited date={apod.date} />

      <Link href={backHref} className="text-sm text-sky-400 hover:underline">
        &larr; Back to all pictures
      </Link>

      <article className="mt-6">
        <header className="mb-6">
          <time dateTime={apod.date} className="text-sm uppercase tracking-wide text-slate-400">
            {formatDate(apod.date)}
          </time>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">{apod.title}</h1>
          {apod.copyright && (
            <p className="mt-2 text-sm text-slate-400">&copy; {apod.copyright.trim()}</p>
          )}
        </header>

        <ApodMedia apod={apod} />

        <p className="mt-8 leading-relaxed text-slate-300">{apod.explanation}</p>
      </article>

      <nav className="mt-10 flex justify-between gap-4 border-t border-slate-800 pt-6 text-sm">
        {older ? (
          <Link href={`/apod/${older.date}`} className="text-sky-400 hover:underline">
            &larr; {formatDate(older.date)}
          </Link>
        ) : (
          <span />
        )}
        {newer && (
          <Link href={`/apod/${newer.date}`} className="text-right text-sky-400 hover:underline">
            {formatDate(newer.date)} &rarr;
          </Link>
        )}
      </nav>
    </main>
  );
}
