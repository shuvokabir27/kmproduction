import { WPAdminShell } from "@/components/admin/WPAdminShell";
import CategoryManager from "@/components/CategoryManager";

export default function AdminSiteCategories() {
  return (
    <WPAdminShell title="ক্যাটাগরি" subtitle="প্রডাক্ট ক্যাটাগরি পরিচালনা">
      <div className="bg-white border border-slate-200 rounded-md p-4"><CategoryManager /></div>
    </WPAdminShell>
  );
}
