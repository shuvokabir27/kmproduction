import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ChevronDown, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  allProjectArtists: any[];
}

export default function ClientMemberList({ allProjectArtists }: Props) {
  const [expanded, setExpanded] = useState(true);

  // Fetch ALL profiles first so we can resolve names live (admin renames reflect instantly)
  const { data: profiles = [] } = useQuery({
    queryKey: ["client-member-list-profiles-all"],
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("get_public_profiles");
      return data || [];
    },
  });

  // Build lookup maps: by profile_id and by name
  const { profileById, profileByName } = useMemo(() => {
    const byId = new Map<string, any>();
    const byName = new Map<string, any>();
    (profiles as any[]).forEach((p) => {
      byId.set(p.id, p);
      if (p.full_name) byName.set(p.full_name.trim(), p);
      if (p.full_name_en) byName.set(p.full_name_en.trim(), p);
    });
    return { profileById: byId, profileByName: byName };
  }, [profiles]);

  // Aggregate by profile (preferred) or fallback to artist name
  const memberRows = useMemo(() => {
    const map = new Map<string, { key: string; profile: any; name: string; bill: number; paid: number; count: number }>();
    allProjectArtists.forEach((a: any) => {
      // Resolve current profile from profile_id (live), else by name
      const profile = (a.profile_id && profileById.get(a.profile_id)) || profileByName.get((a.artist_name || "").trim());
      const displayName = profile?.full_name || (a.artist_name || "").trim();
      if (!displayName) return;
      const key = profile?.id || displayName;
      const existing = map.get(key) || { key, profile, name: displayName, bill: 0, paid: 0, count: 0 };
      existing.bill += Number(a.remuneration || 0);
      existing.paid += Number(a.paid_amount || 0);
      existing.count += 1;
      existing.profile = profile || existing.profile;
      existing.name = displayName;
      map.set(key, existing);
    });
    return Array.from(map.values()).sort((a, b) => (b.bill - b.paid) - (a.bill - a.paid));
  }, [allProjectArtists, profileById, profileByName]);

  if (memberRows.length === 0) return null;

  const totalBill = memberRows.reduce((s, r) => s + r.bill, 0);
  const totalPaid = memberRows.reduce((s, r) => s + r.paid, 0);
  const totalDue = totalBill - totalPaid;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
      <div className="rounded-2xl border border-violet-500/15 bg-gradient-to-br from-violet-500/8 via-card to-card overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-violet-500/5 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
              <Users className="h-4 w-4 text-violet-400" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-foreground">মেম্বার লিস্ট</h3>
              <p className="text-[10px] text-muted-foreground">
                {memberRows.length.toLocaleString("bn-BD")} জন • বাকি ৳{Math.max(0, totalDue).toLocaleString("bn-BD")}
              </p>
            </div>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 space-y-2">
                {memberRows.map((m, idx) => {
                  const profile = m.profile;
                  const due = m.bill - m.paid;
                  const isPaid = due <= 0 && m.bill > 0;
                  return (
                    <motion.div
                      key={m.name}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/30"
                    >
                      {/* Photo */}
                      <div className="relative shrink-0">
                        {profile?.photo_url ? (
                          <img
                            src={profile.photo_url}
                            alt={m.name}
                            className="h-11 w-11 rounded-full object-cover border-2 border-violet-500/20"
                          />
                        ) : (
                          <div className="h-11 w-11 rounded-full bg-violet-500/10 border-2 border-violet-500/20 flex items-center justify-center">
                            <User className="h-5 w-5 text-violet-400" />
                          </div>
                        )}
                        {isPaid && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-background" />
                        )}
                      </div>

                      {/* Name + designation */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">{m.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {profile?.designation || "আর্টিস্ট"} • {m.count.toLocaleString("bn-BD")} প্রজেক্ট
                        </div>
                      </div>

                      {/* Amounts */}
                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-muted-foreground">বিল ৳{m.bill.toLocaleString("bn-BD")}</div>
                        {due > 0 ? (
                          <div className="text-sm font-bold text-amber-400">বাকি ৳{due.toLocaleString("bn-BD")}</div>
                        ) : (
                          <div className="text-sm font-bold text-emerald-400">পরিশোধিত</div>
                        )}
                        {m.paid > 0 && due > 0 && (
                          <div className="text-[9px] text-emerald-400/80">পেইড ৳{m.paid.toLocaleString("bn-BD")}</div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {/* Footer total */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-violet-500/8 border border-violet-500/15 mt-2">
                  <span className="text-xs font-semibold text-violet-400">সর্বমোট</span>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[9px] text-muted-foreground">বিল</div>
                      <div className="text-xs font-bold text-foreground">৳{totalBill.toLocaleString("bn-BD")}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] text-muted-foreground">পেইড</div>
                      <div className="text-xs font-bold text-emerald-400">৳{totalPaid.toLocaleString("bn-BD")}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] text-muted-foreground">বাকি</div>
                      <div className="text-xs font-bold text-amber-400">৳{Math.max(0, totalDue).toLocaleString("bn-BD")}</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
