import PageHeader from "@/components/PageHeader";
import LeaderboardList from "@/components/LeaderboardList";
import PhotoCarousel from "@/components/PhotoCarousel";
import LiveEventBanner from "@/components/LiveEventBanner";
import { getLeaderboard } from "@/lib/db/reads";
import { listSpacePhotos, getSpaceHeader } from "@/lib/db/settings";
import { getLiveEvent } from "@/lib/db/liveEvents";

export default async function LeaderboardPage() {
  const [rows, photos, header, live] = await Promise.all([
    getLeaderboard(),
    listSpacePhotos(),
    getSpaceHeader(),
    getLiveEvent(), // the single live event, or null
  ]);

  return (
    <>
      {/* If a live event is running, show the shining banner INSTEAD of the
          carousel. Otherwise the carousel (which renders nothing if empty). */}
      {live ? (
        <LiveEventBanner live={live} />
      ) : (
        <PhotoCarousel photos={photos} />
      )}

      <h1 className="text-3xl font-extrabold text-ink text-center mb-1">
        {header || "Olympialaiset"}
      </h1>
      <PageHeader title="Pistetilanne" />
      <LeaderboardList rows={rows} />
    </>
  );
}