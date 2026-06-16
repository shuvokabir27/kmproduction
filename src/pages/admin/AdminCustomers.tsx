import { WPAdminShell } from "@/components/admin/WPAdminShell";
import CustomerCRM from "@/components/CustomerCRM";

export default function AdminCustomers() {
  return (
    <WPAdminShell title="কাস্টমার" subtitle="অর্ডার-ভিত্তিক কাস্টমার তথ্য">
      <div className="bg-white border border-slate-200 rounded-md p-4">
        <CustomerCRM />
      </div>
    </WPAdminShell>
  );
}
