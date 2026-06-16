import { WPAdminShell } from "@/components/admin/WPAdminShell";
import ShopOfferManager from "@/components/ShopOfferManager";

export default function AdminSiteOffers() {
  return (
    <WPAdminShell title="অফার" subtitle="অফার ম্যানেজ">
      <div className="bg-white border border-slate-200 rounded-md p-4"><ShopOfferManager /></div>
    </WPAdminShell>
  );
}
