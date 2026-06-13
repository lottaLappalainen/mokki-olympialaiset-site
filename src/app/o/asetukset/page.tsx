import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import SettingsView from "@/components/SettingsView";
import { listPointOptions, getSpaceHeader } from "@/lib/db/settings";
import { getSpaceInfo } from "@/lib/db/reads";

export default async function AsetuksetPage() {
  const [space, options, header] = await Promise.all([
    getSpaceInfo(),
    listPointOptions(),
    getSpaceHeader(),
  ]);
  if (!space) redirect("/");

  return (
    <>
      <PageHeader title="Asetukset" />
      <SettingsView code={space.code} options={options} header={header} />
    </>
  );
}