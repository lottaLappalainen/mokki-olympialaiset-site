import PageHeader from "@/components/PageHeader";
import LeaderboardList from "@/components/LeaderboardList";
import PhotoCarousel from "@/components/PhotoCarousel";
import { getLeaderboard } from "@/lib/db/reads";
import { listSpacePhotos, getSpaceHeader } from "@/lib/db/settings";

export default async function LeaderboardPage() {
  // Standings, space photos, and the header text — all at once.
  const [rows, photos, header] = await Promise.all([
    getLeaderboard(),
    listSpacePhotos(),
    getSpaceHeader(),
  ]);

  return (
    <>
      {/* Carousel at the very top (renders nothing if no photos). Tap a photo
          to open it fullscreen. */}
      <PhotoCarousel photos={photos} />

      {/* Big olympics header below the carousel. Falls back to a default if
          the name hasn't been set in Asetukset yet. */}
      <h1 className="text-3xl font-extrabold text-ink text-center mb-1">
        {header || "Olympialaiset"}
      </h1>
      {/* Section label for the standings (no subtitle prop) */}
      <PageHeader title="Pistetilanne" />

      <LeaderboardList rows={rows} />
    </>
  );
}