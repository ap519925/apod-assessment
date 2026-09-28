import { notFound } from "next/navigation";
import Gallery from "@/components/Gallery";
import { getPage } from "@/lib/apod";

export default async function Home() {
  const result = await getPage(1);
  if (!result) notFound();

  return <Gallery {...result} />;
}
