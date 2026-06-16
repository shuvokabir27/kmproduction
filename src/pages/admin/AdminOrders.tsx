import { WPAdminShell } from "@/components/admin/WPAdminShell";
import OrderManagement from "@/components/OrderManagement";
import OrderCheckByPhone from "@/components/OrderCheckByPhone";

export default function AdminOrders() {
  return (
    <WPAdminShell
      title="অর্ডার ম্যানেজমেন্ট"
      subtitle="সকল অর্ডার পরিচালনা করুন"
      actions={<OrderCheckByPhone />}
    >
      <div className="bg-white border border-slate-200 rounded-md p-4">
        <OrderManagement />
      </div>
    </WPAdminShell>
  );
}
