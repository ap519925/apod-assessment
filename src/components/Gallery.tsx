import ApodCard from "@/components/ApodCard";
import ClearHistoryButton from "@/components/ClearHistoryButton";
import Pagination from "@/components/Pagination";
import { type Apod, formatDate } from "@/lib/apod";

type Props = {
  apods: Apod[];
  page: number;
  totalPages: number;
};

// Main gallery layout component shared by both the home route ("/") and archive pages ("/page/[page]").
// Renders the page header, the responsive 3x3 photo grid, and pagination controls.
export default function Gallery({ apods, page, totalPages }: Props) {
  // Apods are pre-sorted newest first:
  // apods[0] is the newest picture on this page, and apods[apods.length - 1] is the oldest.
  const newest = apods[0];
  const oldest = apods[apods.length - 1];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      {/* Gallery Header: Page title, date range / summary, and Clear History action */}
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Astronomy Picture of the Day
          </h1>
          <p className="mt-1 text-slate-400">
            {page === 1
              ? `The ${apods.length} most recent pictures from NASA's APOD archive.`
              : `${formatDate(oldest.date)} to ${formatDate(newest.date)}`}
          </p>
        </div>
        <ClearHistoryButton />
      </header>

      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {apods.map((apod) => (
          <li key={apod.date} className="flex">
            <ApodCard apod={apod} />
          </li>
        ))}
      </ul>

      <Pagination page={page} totalPages={totalPages} />
    </main>
  );
}
