import { WPAdminShell } from "@/components/admin/WPAdminShell";
import ProductVideoManager from "@/components/ProductVideoManager";

export default function AdminSiteVideos() {
  return (
    <WPAdminShell title="ভিডিও" subtitle="প্রডাক্ট ভিডিও">
      <div className="bg-white border border-slate-200 rounded-md p-4"><ProductVideoManager /></div>
    </WPAdminShell>
  );
}
