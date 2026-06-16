import { WPAdminShell } from "@/components/admin/WPAdminShell";
import HomeSectionsManager from "@/components/HomeSectionsManager";

export default function AdminSiteHomeSections() {
  return (
    <WPAdminShell title="হোম সেকশন" subtitle="হোম পেইজের সেকশন">
      <div className="bg-white border border-slate-200 rounded-md p-4"><HomeSectionsManager /></div>
    </WPAdminShell>
  );
}
