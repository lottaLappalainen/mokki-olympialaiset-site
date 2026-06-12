import PageHeader from "@/components/PageHeader";
import GalleryGrid from "@/components/GalleryGrid";
import { listevents } from "@/lib/db/events";
import { listSpacePhotos } from "@/lib/db/settings";
import { getLeaderboard } from "@/lib/db/reads";

export default async function GalleriaPage() {
  // Gather every photo: each laji's photos, the olympics photos, and the
  // players' profile pics.
  const [events, spacePhotos, rows] = await Promise.all([
    listevents(),
    listSpacePhotos(),
    getLeaderboard(),
  ]);

  // Flatten to a single { url, name } list for the grid + lightbox.
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
      name: `${r.name}.jpg`, // download filename = player's name
    })),
  ].filter((p) => p.url); // drop any without a signed url (incl. photo-less players)

  return (
    <>
      <PageHeader title="Galleria" />
      {photos.length === 0 ? (
        <div className="card text-center text-ink">Ei vielä kuvia.</div>
      ) : (
        <GalleryGrid photos={photos} />
      )}
    </>
  );
}