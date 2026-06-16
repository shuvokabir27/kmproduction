import { WPAdminShell } from "@/components/admin/WPAdminShell";
import ShopCustomersAdmin from "@/components/ShopCustomersAdmin";

export default function AdminShopCustomers() {
  return (
    <WPAdminShell title="শপ কাস্টমার" subtitle="রেজিস্টার্ড কাস্টমার অ্যাকাউন্ট">
      <div className="bg-white border border-slate-200 rounded-md p-4"><ShopCustomersAdmin /></div>
    </WPAdminShell>
  );
}
