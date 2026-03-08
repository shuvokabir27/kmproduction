import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Users, User, MessageCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useState } from "react";

const sb = supabase as any;

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewPersonal: () => void;
  onNewGroup: () => void;
}

export function ConversationList({ selectedId, onSelect, onNewPersonal, onNewGroup }: ConversationListProps) {
  const { user, isAdmin } = useAuth();
  const [search, setSearch] = useState("");

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: memberConvos } = await sb
        .from("conversation_members")
        .select("conversation_id, last_read_at")
        .eq("user_id", user!.id);

      if (!memberConvos || memberConvos.length === 0) return [];

      const convIds = memberConvos.map((c: any) => c.conversation_id);
      const readMap = new Map(memberConvos.map((c: any) => [c.conversation_id, c.last_read_at]));

      const { data: convos } = await sb
        .from("conversations")
        .select("*")
        .in("id", convIds)
        .order("updated_at", { ascending: false });

      const enriched = await Promise.all(
        (convos ?? []).map(async (conv: any) => {
          const { data: members } = await sb
            .from("conversation_members")
            .select("user_id")
            .eq("conversation_id", conv.id);

          const memberUserIds = members?.map((m: any) => m.user_id) ?? [];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("full_name, photo_url, user_id")
            .in("user_id", memberUserIds);

          const { data: lastMsg } = await sb
            .from("messages")
            .select("content, created_at, sender_id")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1);

          // Count unread
          const lastRead = readMap.get(conv.id) || "1970-01-01";
          const { count: unreadCount } = await sb
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .neq("sender_id", user!.id)
            .gt("created_at", lastRead);

          const otherMembers = profiles?.filter((p) => p.user_id !== user!.id) ?? [];
          const displayName =
            conv.type === "group"
              ? conv.name || "গ্রুপ চ্যাট"
              : otherMembers[0]?.full_name || "অজানা সদস্য";
          const photoUrl = conv.type === "personal" ? otherMembers[0]?.photo_url : null;

          return {
            ...conv,
            displayName,
            photoUrl,
            memberCount: memberUserIds.length,
            lastMessage: lastMsg?.[0] || null,
            unreadCount: unreadCount || 0,
          };
        })
      );

      return enriched;
    },
    refetchInterval: 5000,
  });

  const filtered = conversations?.filter((c: any) =>
    c.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border/30">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-foreground text-lg">চ্যাট</h2>
          <div className="flex gap-1">
             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNewPersonal} title="ব্যক্তিগত চ্যাট">
              <User className="h-4 w-4" />
            </Button>
            {isAdmin && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNewGroup} title="গ্রুপ চ্যাট">
                <Users className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            placeholder="খুঁজুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-secondary/50 border border-border/30 rounded-full pl-9 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && <div className="p-4 text-center text-sm text-muted-foreground">লোড হচ্ছে...</div>}
        {!isLoading && (!filtered || filtered.length === 0) && (
          <div className="p-6 text-center text-sm text-muted-foreground space-y-3">
            <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground/20" />
            <p>কোনো চ্যাট নেই</p>
            <div className="flex gap-2 justify-center">
              <Button size="sm" variant="outline" onClick={onNewPersonal}>
                <User className="h-3.5 w-3.5 mr-1" /> ব্যক্তিগত
              </Button>
              {isAdmin && (
                <Button size="sm" variant="outline" onClick={onNewGroup}>
                  <Users className="h-3.5 w-3.5 mr-1" /> গ্রুপ
                </Button>
              )}
            </div>
          </div>
        )}
        {filtered?.map((conv: any) => (
          <div
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={cn(
              "px-3 py-3 flex items-center gap-3 cursor-pointer hover:bg-secondary/50 transition-colors border-b border-border/5",
              selectedId === conv.id && "bg-secondary"
            )}
          >
            <div className="relative">
              <Avatar className="h-11 w-11 flex-shrink-0">
                {conv.photoUrl && <AvatarImage src={conv.photoUrl} />}
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {conv.type === "group" ? <Users className="h-5 w-5" /> : conv.displayName?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className={cn("text-sm truncate", conv.unreadCount > 0 ? "font-bold text-foreground" : "font-medium text-foreground")}>
                  {conv.displayName}
                </p>
                {conv.lastMessage && (
                  <span className={cn("text-[10px] flex-shrink-0", conv.unreadCount > 0 ? "text-primary font-semibold" : "text-muted-foreground")}>
                    {new Date(conv.lastMessage.created_at).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className={cn("text-xs truncate pr-2", conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>
                  {conv.lastMessage?.content || (conv.type === "group" ? `${conv.memberCount} জন সদস্য` : "কোনো মেসেজ নেই")}
                </p>
                {conv.unreadCount > 0 && (
                  <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
