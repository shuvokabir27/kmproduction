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

      {/* Artists List */}
      {projectArtists.length > 0 && (
        <div className="space-y-2">
          {projectArtists.map((artist: any) => {
            const rem = Number(artist.remuneration || 0);
            const paid = Number(artist.paid_amount || 0);
            const due = rem - paid;
            const progress = rem > 0 ? Math.min((paid / rem) * 100, 100) : 0;

            return (
              <Card key={artist.id} className="border-border/50">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground">{artist.artist_name}</span>
                        {artist.is_paid ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] h-5">পেইড</Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-400 border-amber-400/30 text-[10px] h-5">বাকি</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Download last receipt */}
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
                          className="h-7 w-7 p-0 text-primary hover:text-primary"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveArtist(artist.id)}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Billing Info */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-md bg-secondary/30 p-2 text-center">
                      <div className="text-muted-foreground">পারিশ্রমিক</div>
                      <div className="font-semibold text-foreground">৳{rem.toLocaleString("bn-BD")}</div>
                    </div>
                    <div className="rounded-md bg-emerald-500/10 p-2 text-center">
                      <div className="text-muted-foreground">পেইড</div>
                      <div className="font-semibold text-emerald-400">৳{paid.toLocaleString("bn-BD")}</div>
                    </div>
                    <div className="rounded-md bg-amber-500/10 p-2 text-center">
                      <div className="text-muted-foreground">বাকি</div>
                      <div className="font-semibold text-amber-400">৳{Math.max(0, due).toLocaleString("bn-BD")}</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Pay Section */}
                  {!artist.is_paid && (
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        placeholder="পরিমাণ"
                        value={payAmounts[artist.id] || ""}
                        onChange={(e) =>
                          setPayAmounts((prev) => ({ ...prev, [artist.id]: e.target.value }))
                        }
                        min={0}
                        max={due}
                        className="text-xs h-8 flex-1"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setPayAmounts((prev) => ({ ...prev, [artist.id]: String(due) }))
                        }
                        className="text-[10px] h-8 px-2 shrink-0"
                      >
                        সম্পূর্ণ
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handlePayArtist(artist)}
                        className="gap-1 text-xs h-8 shrink-0"
                      >
                        <Banknote className="h-3 w-3" /> পে
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Total Summary */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10 text-sm">
            <span className="text-muted-foreground">মোট আর্টিস্ট বিল:</span>
            <div className="flex items-center gap-3">
              <span className="text-foreground font-semibold">৳{totalRemuneration.toLocaleString("bn-BD")}</span>
              <span className="text-emerald-400">পেইড: ৳{totalPaid.toLocaleString("bn-BD")}</span>
              {totalRemuneration - totalPaid > 0 && (
                <span className="text-amber-400">বাকি: ৳{(totalRemuneration - totalPaid).toLocaleString("bn-BD")}</span>
              )}
            </div>
          </div>
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
