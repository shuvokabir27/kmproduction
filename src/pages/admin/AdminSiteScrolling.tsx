import { WPAdminShell } from "@/components/admin/WPAdminShell";
import ScrollingTextEditor from "@/components/ScrollingTextEditor";

export default function AdminSiteScrolling() {
  return (
    <WPAdminShell title="স্ক্রলিং টেক্সট">
      <div className="bg-white border border-slate-200 rounded-md p-4"><ScrollingTextEditor /></div>
    </WPAdminShell>
  );
}
