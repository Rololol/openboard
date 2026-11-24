import FeatureClient from "./feature-client";

const sections = ["tournaments","friends","puzzles","storm","learn","analysis","tv","profile","history","settings","about"];

export function generateStaticParams() {
  return sections.map((section) => ({ section }));
}

export default async function FeaturePage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return <FeatureClient section={section} />;
}
