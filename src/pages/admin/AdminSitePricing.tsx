import { WPAdminShell } from "@/components/admin/WPAdminShell";
import WeightPricingEditor from "@/components/WeightPricingEditor";

export default function AdminSitePricing() {
  return (
    <WPAdminShell title="প্রাইসিং" subtitle="ওজন/সাইজ ভিত্তিক দাম">
      <div className="bg-white border border-slate-200 rounded-md p-4"><WeightPricingEditor /></div>
    </WPAdminShell>
  );
}
