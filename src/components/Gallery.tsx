import ApodCard from "@/components/ApodCard";
import ClearHistoryButton from "@/components/ClearHistoryButton";
import Pagination from "@/components/Pagination";
import { type Apod, formatDate } from "@/lib/apod";

type Props = {
  apods: Apod[];
  page: number;
  totalPages: number;
};

// The grid shared by the home page (page 1) and /page/N.
export default function Gallery({ apods, page, totalPages }: Props) {
  // list is newest first
  const newest = apods[0];
  const oldest = apods[apods.length - 1];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
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
