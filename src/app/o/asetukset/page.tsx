import PageHeader from "@/components/PageHeader";
import SettingsView from "@/components/SettingsView";
import { listPointOptions, listSpacePhotos, getSpaceHeader } from "@/lib/db/settings";

export default async function AsetuksetPage() {
  const [options, photos, header] = await Promise.all([
    listPointOptions(),
    listSpacePhotos(),
    getSpaceHeader(),
  ]);

  return (
    <>
      {/* No subtitle prop — removed per the design rule. */}
      <PageHeader title="Asetukset" />
      <SettingsView options={options} photos={photos} header={header} />

    </>
  );
}