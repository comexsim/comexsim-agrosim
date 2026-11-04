import { MissionScreen } from "@/features/mission/MissionScreen";

export default async function MissionPage({
  searchParams,
}: {
  searchParams: Promise<{ presentacion?: string }>;
}) {
  const { presentacion } = await searchParams;
  return <MissionScreen presentation={presentacion === "1"} />;
}
