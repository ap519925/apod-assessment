import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Gallery from "@/components/Gallery";
import { getPage } from "@/lib/apod";

// Static export: only the pages returned here get built, anything else 404s.
export const dynamicParams = false;

export async function generateStaticParams() {
  const first = await getPage(1);
  if (!first) return [];

  // page 1 is the home page, so start at 2
  return Array.from({ length: first.totalPages - 1 }, (_, i) => ({ page: String(i + 2) }));
}

export async function generateMetadata({ params }: PageProps<"/page/[page]">): Promise<Metadata> {
  return { title: `Page ${(await params).page} | APOD Explorer` };
}

export default async function ArchivePage({ params }: PageProps<"/page/[page]">) {
  const result = await getPage(Number((await params).page));
  if (!result) notFound();

  return <Gallery {...result} />;
}
