import PageHeader from "@/components/PageHeader";
import LeaderboardList from "@/components/LeaderboardList";
import PhotoCarousel from "@/components/PhotoCarousel";
import LiveEventBanner from "@/components/LiveEventBanner";
import { getLeaderboard } from "@/lib/db/reads";
import { listSpacePhotos, getSpaceHeader } from "@/lib/db/settings";
import { getLiveEvent } from "@/lib/db/liveEvents";
import { listevents } from "@/lib/db/events";

export default async function LeaderboardPage() {
  const [rows, events, spacePhotos, header, live] = await Promise.all([
    getLeaderboard(),
    listevents(),
    listSpacePhotos(),
    getSpaceHeader(),
    getLiveEvent(),
  ]);

  const allPhotos = [
    ...events.flatMap((e) => e.photos),
    ...spacePhotos,
  ].filter((p) => p.url);

  return (
    <>
      {live ? (
        <LiveEventBanner live={live} />
      ) : (
        <PhotoCarousel photos={allPhotos} />
      )}

      <h1 className="main-title">
        {header || "Olympialaiset"}
      </h1>
      <PageHeader title="Pistetilanne" />
      <LeaderboardList rows={rows} />
    </>
  );
}