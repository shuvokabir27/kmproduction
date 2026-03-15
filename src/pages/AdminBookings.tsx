import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Check, X, Clock, Phone, MapPin, User, CalendarDays, Trash2 } from "lucide-react";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "অপেক্ষমান", variant: "outline" },
  confirmed: { label: "নিশ্চিত", variant: "default" },
  cancelled: { label: "বাতিল", variant: "destructive" },
  completed: { label: "সম্পন্ন", variant: "secondary" },
};

const AdminBookings = () => {
  const queryClient = useQueryClient();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast({ title: "স্ট্যাটাস আপডেট হয়েছে" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast({ title: "মুছে ফেলা হয়েছে" });
    },
  });

  const pendingCount = bookings?.filter((b: any) => b.status === "pending").length || 0;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">বুকিং সমূহ</h1>
            {pendingCount > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                <span className="text-primary font-bold">{pendingCount}টি</span> নতুন বুকিং অপেক্ষমান
              </p>
            )}
          </div>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">লোড হচ্ছে...</p>
        ) : !bookings?.length ? (
          <p className="text-center text-muted-foreground py-8">কোনো বুকিং নেই</p>
        ) : (
          <div className="space-y-3">
            {bookings.map((b: any) => {
              const st = statusLabels[b.status] || statusLabels.pending;
              return (
                <Card key={b.id} className={b.status === "pending" ? "border-primary/30 bg-primary/5" : ""}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-foreground">{b.service_title}</h3>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </div>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2 text-sm text-foreground">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{b.customer_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-foreground">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            <a href={`tel:${b.customer_phone}`} className="text-primary hover:underline">{b.customer_phone}</a>
                          </div>
                          {b.customer_address && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>{b.customer_address}</span>
                            </div>
                          )}
                          {b.details && (
                            <p className="text-xs text-muted-foreground mt-1 bg-secondary/30 rounded-lg p-2">{b.details}</p>
                          )}
                          {b.booking_date && (
                            <div className="flex items-center gap-2 text-sm text-foreground">
                              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>তারিখ: <span className="font-semibold">{new Date(b.booking_date).toLocaleDateString("bn-BD")}</span></span>
                              {b.booking_days > 1 && <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{b.booking_days} দিন</span>}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(b.created_at).toLocaleString("bn-BD")}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {b.status === "pending" && (
                          <>
                            <Button size="sm" variant="default" className="text-xs" onClick={() => updateStatus.mutate({ id: b.id, status: "confirmed" })}>
                              <Check className="h-3 w-3 mr-1" /> নিশ্চিত
                            </Button>
                            <Button size="sm" variant="destructive" className="text-xs" onClick={() => updateStatus.mutate({ id: b.id, status: "cancelled" })}>
                              <X className="h-3 w-3 mr-1" /> বাতিল
                            </Button>
                          </>
                        )}
                        {b.status === "confirmed" && (
                          <Button size="sm" variant="secondary" className="text-xs" onClick={() => updateStatus.mutate({ id: b.id, status: "completed" })}>
                            <Check className="h-3 w-3 mr-1" /> সম্পন্ন
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => deleteMutation.mutate(b.id)}>
                          <Trash2 className="h-3 w-3 mr-1" /> মুছুন
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminBookings;
