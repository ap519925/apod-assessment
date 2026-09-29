import { notFound } from "next/navigation";
import Gallery from "@/components/Gallery";
import { getPage } from "@/lib/apod";

// Root route ("/") - renders page 1 (the 9 most recent APODs).
// This is an async Server Component: data is fetched at build time during static export.
export default async function Home() {
  const result = await getPage(1);
  if (!result) notFound();

  return <Gallery {...result} />;
}
