import PageHeader from "@/components/PageHeader";
import GalleryGrid from "@/components/GalleryGrid";
import { listevents } from "@/lib/db/events";
import { listSpacePhotos } from "@/lib/db/settings";

export default async function GalleriaPage() {
  // Gather every photo in the space: each laji's photos + the olympics photos.
  const [events, spacePhotos] = await Promise.all([
    listevents(),
    listSpacePhotos(),
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
  ].filter((p) => p.url); // drop any that failed to sign

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