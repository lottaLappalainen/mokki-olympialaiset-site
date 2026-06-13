import PageHeader from "@/components/PageHeader";
import GalleryGrid from "@/components/GalleryGrid";
import GalleryAddPhoto from "@/components/GalleryAddPhoto";
import { listevents } from "@/lib/db/events";
import { listSpacePhotos } from "@/lib/db/settings";
import { getLeaderboard } from "@/lib/db/reads";

export default async function GalleriaPage() {
  const [events, spacePhotos, rows] = await Promise.all([
    listevents(),
    listSpacePhotos(),
    getLeaderboard(),
  ]);

  const photos = [
    ...events.flatMap((e) =>
      e.photos.map((p, i) => ({
        url: p.url,
        name: `${e.name}-${i + 1}.jpg`,
      })),
    ),
    ...spacePhotos.map((p, i) => ({
      url: p.url,
      name: `olympialaiset-${i + 1}.jpg`,
    })),
    ...rows.map((r) => ({
      url: r.photo_url,
      name: `${r.name}.jpg`,
    })),
  ].filter((p) => p.url);

  return (
    <>
      <PageHeader title="Galleria" />
      {/* Add photos to the gallery (saved as space photos) */}
      <GalleryAddPhoto />
      {photos.length === 0 ? (
        <div className="card text-center text-ink">Ei vielä kuvia.</div>
      ) : (
        <GalleryGrid photos={photos} />
      )}
    </>
  );
}