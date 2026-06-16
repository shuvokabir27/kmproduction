import { WPAdminShell } from "@/components/admin/WPAdminShell";
import ShopFooterEditor from "@/components/ShopFooterEditor";

export default function AdminSiteFooter() {
  return (
    <WPAdminShell title="ফুটার" subtitle="সাইট ফুটার এডিট">
      <div className="bg-white border border-slate-200 rounded-md p-4"><ShopFooterEditor /></div>
    </WPAdminShell>
  );
}
