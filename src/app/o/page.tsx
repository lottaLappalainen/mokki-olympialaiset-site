import PageHeader from "@/components/PageHeader";
import LeaderboardList from "@/components/LeaderboardList";
import { getLeaderboard } from "@/lib/db/reads";

export default async function LeaderboardPage() {
  const rows = await getLeaderboard();
  return (
    <>
      <PageHeader title="Pistetilanne" subtitle="Kokonaispisteet" />
      <LeaderboardList rows={rows} />
    </>
  );
}