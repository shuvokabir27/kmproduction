import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Check, X, Clock, Phone, MapPin, User, CalendarDays, Trash2,
  MessageCircle, Percent, Tag, Pencil, Save,
} from "lucide-react";
import { useState } from "react";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "অপেক্ষমান", variant: "outline" },
  confirmed: { label: "নিশ্চিত", variant: "default" },
  cancelled: { label: "বাতিল", variant: "destructive" },
  completed: { label: "সম্পন্ন", variant: "secondary" },
};

// Format whatsapp number → strip non-digits, ensure country code
const formatWaPhone = (raw: string) => {
  const digits = (raw || "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits.startsWith("88")) return digits;
  if (digits.startsWith("0")) return "88" + digits;
  return "880" + digits;
};

const AdminBookings = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [discountInput, setDiscountInput] = useState<string>("");
  const [finalInput, setFinalInput] = useState<string>("");

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

  const updatePricing = useMutation({
    mutationFn: async ({ id, discount, final }: { id: string; discount: number; final: number }) => {
      const { error } = await (supabase as any)
        .from("bookings")
        .update({ discount_amount: discount, final_amount: final })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast({ title: "মূল্য আপডেট হয়েছে" });
      setEditingId(null);
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

  const startEdit = (b: any) => {
    setEditingId(b.id);
    const orig = Number(b.original_amount || b.final_amount || 0);
    const disc = Number(b.discount_amount || 0);
    setDiscountInput(String(disc));
    setFinalInput(String(b.final_amount ?? Math.max(0, orig - disc)));
  };

  const handleSave = (b: any) => {
    const disc = Math.max(0, parseFloat(discountInput) || 0);
    const orig = Number(b.original_amount || 0);
    const final = orig > 0
      ? Math.max(0, orig - disc)
      : Math.max(0, parseFloat(finalInput) || 0);
    updatePricing.mutate({ id: b.id, discount: disc, final });
  };

  const pendingCount = bookings?.filter((b: any) => b.status === "pending").length || 0;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 font-bangla">
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
              const waPhone = formatWaPhone(b.customer_phone);
              const waMsg = encodeURIComponent(
                `আসসালামু আলাইকুম ${b.customer_name},\n\nআপনার "${b.service_title}" বুকিং সম্পর্কে আমরা যোগাযোগ করছি।${b.final_amount ? `\nমূল্য: ৳${Number(b.final_amount).toLocaleString("bn-BD")}` : ""}`
              );
              const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${waMsg}` : "";
              const isEditing = editingId === b.id;
              const orig = Number(b.original_amount || 0);
              const disc = Number(b.discount_amount || 0);
              const final = Number(b.final_amount || 0);

              return (
                <Card key={b.id} className={b.status === "pending" ? "border-primary/30 bg-primary/5" : ""}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
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
                    </div>

                    {/* Pricing Section */}
                    <div className="rounded-xl border border-border/50 bg-secondary/20 p-3 space-y-2">
                      {!isEditing ? (
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <Tag className="h-3.5 w-3.5 text-muted-foreground self-center" />
                            {orig > 0 && disc > 0 && (
                              <span className="text-xs text-muted-foreground line-through">৳{orig.toLocaleString("bn-BD")}</span>
                            )}
                            <span className="text-lg font-black text-primary">
                              ৳{(final || orig || 0).toLocaleString("bn-BD")}
                            </span>
                            {disc > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-500 font-bold">
                                -৳{disc.toLocaleString("bn-BD")} ছাড়
                              </span>
                            )}
                          </div>
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => startEdit(b)}>
                            <Pencil className="h-3 w-3 mr-1" /> ছাড় / মূল্য
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {orig > 0 ? (
                            <>
                              <div className="text-xs text-muted-foreground">মূল মূল্য: <span className="font-bold text-foreground">৳{orig.toLocaleString("bn-BD")}</span></div>
                              <div className="space-y-1">
                                <Label className="text-xs">ছাড়ের পরিমাণ (৳)</Label>
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  max={orig}
                                  value={discountInput}
                                  onChange={(e) => setDiscountInput(e.target.value)}
                                  placeholder="0"
                                  className="h-8"
                                />
                              </div>
                              <div className="text-sm">
                                চূড়ান্ত মূল্য: <span className="font-black text-primary text-base">
                                  ৳{Math.max(0, orig - (parseFloat(discountInput) || 0)).toLocaleString("bn-BD")}
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="space-y-1">
                                <Label className="text-xs">মূল্য নির্ধারণ করুন (৳)</Label>
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  value={finalInput}
                                  onChange={(e) => setFinalInput(e.target.value)}
                                  placeholder="0"
                                  className="h-8"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">ছাড় (৳, ঐচ্ছিক)</Label>
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  value={discountInput}
                                  onChange={(e) => setDiscountInput(e.target.value)}
                                  placeholder="0"
                                  className="h-8"
                                />
                              </div>
                            </>
                          )}
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => handleSave(b)} disabled={updatePricing.isPending}>
                              <Save className="h-3 w-3 mr-1" /> সংরক্ষণ
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditingId(null)}>
                              বাতিল
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons: Call / WhatsApp / Status */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <a href={`tel:${b.customer_phone}`} className="flex-1 min-w-[100px]">
                        <Button size="sm" variant="outline" className="w-full text-xs">
                          <Phone className="h-3 w-3 mr-1" /> কল করুন
                        </Button>
                      </a>
                      {waUrl && (
                        <a href={waUrl} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[100px]">
                          <Button size="sm" className="w-full text-xs bg-red-600 hover:bg-red-700 text-white">
                            <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                          </Button>
                        </a>
                      )}
                      {b.status === "pending" && (
                        <>
                          <Button size="sm" variant="default" className="flex-1 min-w-[100px] text-xs" onClick={() => updateStatus.mutate({ id: b.id, status: "confirmed" })}>
                            <Check className="h-3 w-3 mr-1" /> নিশ্চিত করুন
                          </Button>
                          <Button size="sm" variant="destructive" className="flex-1 min-w-[100px] text-xs" onClick={() => updateStatus.mutate({ id: b.id, status: "cancelled" })}>
                            <X className="h-3 w-3 mr-1" /> বাতিল
                          </Button>
                        </>
                      )}
                      {b.status === "confirmed" && (
                        <Button size="sm" variant="secondary" className="flex-1 min-w-[100px] text-xs" onClick={() => updateStatus.mutate({ id: b.id, status: "completed" })}>
                          <Check className="h-3 w-3 mr-1" /> সম্পন্ন
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => deleteMutation.mutate(b.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
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
