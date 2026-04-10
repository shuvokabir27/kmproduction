import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import ClientArtistReceipt from "@/components/ClientArtistReceipt";
import {
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  Banknote,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Search,
  Download,
} from "lucide-react";

interface ClientArtistBillingProps {
  projectId: string;
  clientProfileId: string;
  clientName?: string;
  projectName?: string;
}

export function ClientArtistBilling({ projectId, clientProfileId, clientName, projectName }: ClientArtistBillingProps) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [artistName, setArtistName] = useState("");
  const [remuneration, setRemuneration] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [payAmounts, setPayAmounts] = useState<Record<string, string>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const { data: projectArtists = [], refetch: refetchArtists } = useQuery({
    queryKey: ["client-project-artists", projectId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("client_project_artists")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at");
      return data || [];
    },
  });

  const { data: savedArtists = [] } = useQuery({
    queryKey: ["client-artists", clientProfileId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("client_artists")
        .select("*")
        .eq("client_profile_id", clientProfileId)
        .order("name");
      return data || [];
    },
  });

  const { data: adminMembers = [] } = useQuery({
    queryKey: ["admin-members-for-client"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, full_name_en, designation")
        .eq("is_active", true)
        .order("full_name");
      return data || [];
    },
  });

  const { data: allProjectArtists = [] } = useQuery({
    queryKey: ["all-client-project-artists", clientProfileId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("client_project_artists")
        .select("*")
        .eq("client_profile_id", clientProfileId);
      return data || [];
    },
  });

  const suggestions = useMemo(() => {
    const nameSet = new Set<string>();
    const results: { name: string; source: string }[] = [];

    savedArtists.forEach((a: any) => {
      if (!nameSet.has(a.name.toLowerCase())) {
        nameSet.add(a.name.toLowerCase());
        results.push({ name: a.name, source: "সেভড" });
      }
    });

    adminMembers.forEach((m: any) => {
      const name = m.full_name;
      if (!nameSet.has(name.toLowerCase())) {
        nameSet.add(name.toLowerCase());
        results.push({ name, source: m.designation || "সদস্য" });
      }
    });

    if (!searchQuery.trim()) return results;
    const q = searchQuery.toLowerCase();
    return results.filter((r) => r.name.toLowerCase().includes(q));
  }, [savedArtists, adminMembers, searchQuery]);

  const artistSummary = useMemo(() => {
    const map: Record<string, { totalProjects: number; totalRemuneration: number; totalPaid: number }> = {};
    allProjectArtists.forEach((a: any) => {
      const key = a.artist_name.toLowerCase();
      if (!map[key]) {
        map[key] = { totalProjects: 0, totalRemuneration: 0, totalPaid: 0 };
      }
      map[key].totalProjects += 1;
      map[key].totalRemuneration += Number(a.remuneration || 0);
      map[key].totalPaid += Number(a.paid_amount || 0);
    });
    return Object.entries(map).map(([key, val]) => ({
      name: allProjectArtists.find((a: any) => a.artist_name.toLowerCase() === key)?.artist_name || key,
      ...val,
    }));
  }, [allProjectArtists]);

  const handleAddArtist = async () => {
    if (!artistName.trim()) {
      toast({ title: "আর্টিস্টের নাম দিন", variant: "destructive" });
      return;
    }
    if (!remuneration || Number(remuneration) <= 0) {
      toast({ title: "পারিশ্রমিকের পরিমাণ দিন", variant: "destructive" });
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from("client_project_artists")
        .insert({
          project_id: projectId,
          client_profile_id: clientProfileId,
          artist_name: artistName.trim(),
          remuneration: Number(remuneration),
        });
      if (error) throw error;

      await (supabase as any)
        .from("client_artists")
        .upsert(
          { client_profile_id: clientProfileId, name: artistName.trim() },
          { onConflict: "client_profile_id,name" }
        );

      toast({ title: "আর্টিস্ট যুক্ত হয়েছে ✓" });
      setArtistName("");
      setRemuneration("");
      setShowAddForm(false);
      refetchArtists();
      queryClient.invalidateQueries({ queryKey: ["client-artists", clientProfileId] });
      queryClient.invalidateQueries({ queryKey: ["all-client-project-artists", clientProfileId] });
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    }
  };

  const handlePayArtist = async (artist: any) => {
    const amount = Number(payAmounts[artist.id] || 0);
    if (amount <= 0) {
      toast({ title: "পরিমাণ দিন", variant: "destructive" });
      return;
    }

    const newPaid = Number(artist.paid_amount || 0) + amount;
    const isPaid = newPaid >= Number(artist.remuneration);

    try {
      const { error } = await (supabase as any)
        .from("client_project_artists")
        .update({ paid_amount: newPaid, is_paid: isPaid })
        .eq("id", artist.id);
      if (error) throw error;

      toast({ title: `৳${amount.toLocaleString("bn-BD")} পেমেন্ট সম্পন্ন ✓` });
      setPayAmounts((prev) => ({ ...prev, [artist.id]: "" }));

      // Show receipt
      setReceiptData({
        artistName: artist.artist_name,
        projectName: projectName || "প্রজেক্ট",
        clientName: clientName || "ক্লায়েন্ট",
        amount,
        totalRemuneration: Number(artist.remuneration || 0),
        totalPaid: newPaid,
        remaining: Number(artist.remuneration || 0) - newPaid,
        date: new Date().toISOString(),
      });

      refetchArtists();
      queryClient.invalidateQueries({ queryKey: ["all-client-project-artists", clientProfileId] });
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    }
  };

  const handleRemoveArtist = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from("client_project_artists")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast({ title: "আর্টিস্ট সরানো হয়েছে" });
      refetchArtists();
      queryClient.invalidateQueries({ queryKey: ["all-client-project-artists", clientProfileId] });
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    }
  };

  const handlePayAll = async () => {
    const unpaidArtists = projectArtists.filter((a: any) => !a.is_paid && Number(a.remuneration || 0) - Number(a.paid_amount || 0) > 0);
    if (unpaidArtists.length === 0) {
      toast({ title: "সব আর্টিস্ট পেইড", variant: "default" });
      return;
    }

    try {
      for (const artist of unpaidArtists) {
        const rem = Number(artist.remuneration || 0);
        const { error } = await (supabase as any)
          .from("client_project_artists")
          .update({ paid_amount: rem, is_paid: true })
          .eq("id", artist.id);
        if (error) throw error;
      }

      const totalDueNow = unpaidArtists.reduce((s: number, a: any) => s + (Number(a.remuneration || 0) - Number(a.paid_amount || 0)), 0);
      toast({ title: `৳${totalDueNow.toLocaleString("bn-BD")} মোট পেমেন্ট সম্পন্ন ✓` });

      refetchArtists();
      queryClient.invalidateQueries({ queryKey: ["all-client-project-artists", clientProfileId] });
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    }
  };

  const totalRemuneration = projectArtists.reduce((s: number, a: any) => s + Number(a.remuneration || 0), 0);
  const totalPaid = projectArtists.reduce((s: number, a: any) => s + Number(a.paid_amount || 0), 0);
  const totalDue = totalRemuneration - totalPaid;
  const unpaidCount = projectArtists.filter((a: any) => !a.is_paid).length;

  return (
    <div className="space-y-3">
      {/* Receipt Modal */}
      {receiptData && (
        <ClientArtistReceipt
          receiptData={receiptData}
          onClose={() => setReceiptData(null)}
        />
      )}

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Users className="h-4 w-4 text-primary" /> আর্টিস্ট বিল
        </h4>
        <div className="flex items-center gap-2">
          {artistSummary.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSummary(!showSummary)}
              className="text-xs gap-1 h-7"
            >
              সামারি {showSummary ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-xs gap-1 h-7"
          >
            <UserPlus className="h-3 w-3" /> যুক্ত করুন
          </Button>
        </div>
      </div>

      {/* Artist Summary Across All Projects */}
      {showSummary && artistSummary.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3 space-y-2">
            <h5 className="text-xs font-semibold text-foreground">সকল প্রজেক্ট সামারি</h5>
            {artistSummary.map((a) => (
              <div key={a.name} className="flex items-center justify-between p-2 rounded-lg bg-background/50 text-xs">
                <div>
                  <span className="font-medium text-foreground">{a.name}</span>
                  <span className="text-muted-foreground ml-2">{a.totalProjects} প্রজেক্ট</span>
                </div>
                <div className="text-right">
                  <div className="text-foreground">মোট: ৳{a.totalRemuneration.toLocaleString("bn-BD")}</div>
                  <div className="text-emerald-500">পেইড: ৳{a.totalPaid.toLocaleString("bn-BD")}</div>
                  {a.totalRemuneration - a.totalPaid > 0 && (
                    <div className="text-amber-500">বাকি: ৳{(a.totalRemuneration - a.totalPaid).toLocaleString("bn-BD")}</div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add Artist Form */}
      {showAddForm && (
        <Card className="border-border/50">
          <CardContent className="p-3 space-y-3">
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="আর্টিস্টের নাম লিখুন বা সিলেক্ট করুন"
                  value={artistName}
                  onChange={(e) => {
                    setArtistName(e.target.value);
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="pl-8 text-sm"
                  maxLength={100}
                />
              </div>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setArtistName(s.name);
                        setShowSuggestions(false);
                        setSearchQuery("");
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between"
                    >
                      <span className="text-foreground">{s.name}</span>
                      <span className="text-[10px] text-muted-foreground">{s.source}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Input
              type="number"
              placeholder="পারিশ্রমিক (৳)"
              value={remuneration}
              onChange={(e) => setRemuneration(e.target.value)}
              min={0}
              className="text-sm"
            />

            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddArtist} className="gap-1 text-xs flex-1">
                <Plus className="h-3 w-3" /> যুক্ত করুন
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setArtistName("");
                  setRemuneration("");
                }}
                className="text-xs"
              >
                বাতিল
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Artists List - Compact Table Format */}
      {projectArtists.length > 0 && (
        <div className="space-y-2">
          {/* Payment Summary Table */}
          <Card className="border-border/50">
            <CardContent className="p-0">
              <div className="divide-y divide-border/30">
                {/* Table Header */}
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/20">
                  <span>আর্টিস্ট</span>
                  <span className="text-right w-16">পারিশ্রমিক</span>
                  <span className="text-right w-14">পেইড</span>
                  <span className="text-right w-14">বাকি</span>
                </div>

                {/* Artist Rows */}
                {projectArtists.map((artist: any) => {
                  const rem = Number(artist.remuneration || 0);
                  const paid = Number(artist.paid_amount || 0);
                  const due = rem - paid;

                  return (
                    <div key={artist.id} className="px-3 py-2 space-y-2">
                      {/* Main Row */}
                      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-medium text-foreground truncate">{artist.artist_name}</span>
                          {artist.is_paid ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          ) : null}
                        </div>
                        <span className="text-right w-16 text-foreground font-medium">৳{rem.toLocaleString("bn-BD")}</span>
                        <span className="text-right w-14 text-emerald-400">৳{paid.toLocaleString("bn-BD")}</span>
                        <span className={`text-right w-14 font-medium ${due > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                          ৳{Math.max(0, due).toLocaleString("bn-BD")}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-1 rounded-full bg-secondary/50 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${rem > 0 ? Math.min((paid / rem) * 100, 100) : 0}%` }}
                        />
                      </div>

                      {/* Actions Row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          {paid > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setReceiptData({
                                  artistName: artist.artist_name,
                                  projectName: projectName || "প্রজেক্ট",
                                  clientName: clientName || "ক্লায়েন্ট",
                                  amount: paid,
                                  totalRemuneration: rem,
                                  totalPaid: paid,
                                  remaining: due,
                                  date: new Date().toISOString(),
                                })
                              }
                              className="h-7 px-2 text-[10px] text-primary gap-1"
                            >
                              <Download className="h-3 w-3" /> রিসিট
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveArtist(artist.id)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Inline Pay */}
                        {!artist.is_paid && (
                          <div className="flex gap-1.5 items-center">
                            <Input
                              type="number"
                              placeholder="৳"
                              value={payAmounts[artist.id] || ""}
                              onChange={(e) =>
                                setPayAmounts((prev) => ({ ...prev, [artist.id]: e.target.value }))
                              }
                              min={0}
                              max={due}
                              className="text-xs h-7 w-20"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setPayAmounts((prev) => ({ ...prev, [artist.id]: String(due) }))
                              }
                              className="text-[10px] h-7 px-1.5 shrink-0"
                            >
                              সব
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handlePayArtist(artist)}
                              className="gap-1 text-[10px] h-7 px-2 shrink-0"
                            >
                              <Banknote className="h-3 w-3" /> পে
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Total Summary + Pay All */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                <div>
                  <div className="text-muted-foreground">মোট বিল</div>
                  <div className="font-bold text-foreground text-sm">৳{totalRemuneration.toLocaleString("bn-BD")}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">মোট পেইড</div>
                  <div className="font-bold text-emerald-400 text-sm">৳{totalPaid.toLocaleString("bn-BD")}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">মোট বাকি</div>
                  <div className="font-bold text-amber-400 text-sm">৳{Math.max(0, totalDue).toLocaleString("bn-BD")}</div>
                </div>
              </div>

              {/* Pay All Button */}
              {unpaidCount > 0 && totalDue > 0 && (
                <Button
                  size="sm"
                  onClick={handlePayAll}
                  className="w-full gap-2 text-xs"
                >
                  <Banknote className="h-4 w-4" />
                  সবাইকে সম্পূর্ণ পেমেন্ট করুন (৳{totalDue.toLocaleString("bn-BD")})
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {projectArtists.length === 0 && !showAddForm && (
        <p className="text-xs text-muted-foreground text-center py-3">
          কোনো আর্টিস্ট যুক্ত করা হয়নি। "যুক্ত করুন" বাটনে ক্লিক করুন।
        </p>
      )}
    </div>
  );
}
