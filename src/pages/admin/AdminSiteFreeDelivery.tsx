import { WPAdminShell } from "@/components/admin/WPAdminShell";
import FreeDeliveryCampaignManager from "@/components/FreeDeliveryCampaignManager";

export default function AdminSiteFreeDelivery() {
  return (
    <WPAdminShell title="ফ্রি ডেলিভারি ক্যাম্পেইন">
      <div className="bg-white border border-slate-200 rounded-md p-4"><FreeDeliveryCampaignManager /></div>
    </WPAdminShell>
  );
}
