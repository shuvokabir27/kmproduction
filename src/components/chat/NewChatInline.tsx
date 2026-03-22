import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useOnlineStatus, isUserOnline, getLastSeenText } from "@/hooks/usePresence";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft } from "lucide-react";

const sb = supabase as any;

interface NewChatInlineProps {
  type: "personal" | "group";
  onCreated: (conversationId: string) => void;
  onBack: () => void;
}

export function NewChatInline({ type, onCreated, onBack }: NewChatInlineProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const { data: onlineMap } = useOnlineStatus();

  const { data: members } = useQuery({
    queryKey: ["all-profiles-for-chat"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, photo_url, member_id")
        .eq("is_active", true)
        .order("full_name");
      return data?.filter((p) => p.user_id !== user?.id) ?? [];
    },
  });

  const filteredMembers = members?.filter((m) =>
    m.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUser = (userId: string) => {
    if (type === "personal") {
      setSelectedUsers([userId]);
    } else {
      setSelectedUsers((prev) =>
        prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
      );
    }
  };

  const createConversation = useMutation({
    mutationFn: async () => {
      if (selectedUsers.length === 0) throw new Error("No users selected");

      if (type === "personal") {
        const targetUserId = selectedUsers[0];
        const { data: myConvos } = await sb
          .from("conversation_members")
          .select("conversation_id")
          .eq("user_id", user!.id);

        if (myConvos && myConvos.length > 0) {
          const myConvoIds = myConvos.map((c: any) => c.conversation_id);
          const { data: sharedConvos } = await sb
            .from("conversation_members")
            .select("conversation_id")
            .eq("user_id", targetUserId)
            .in("conversation_id", myConvoIds);

          if (sharedConvos && sharedConvos.length > 0) {
            const { data: personalConvos } = await sb
              .from("conversations")
              .select("id")
              .in("id", sharedConvos.map((c: any) => c.conversation_id))
              .eq("type", "personal");

            if (personalConvos && personalConvos.length > 0) {
              return personalConvos[0].id;
            }
          }
        }
      }

      const { data: conv, error } = await sb
        .from("conversations")
        .insert({
          name: type === "group" ? groupName || "গ্রুপ চ্যাট" : null,
          type,
          created_by: user!.id,
        })
        .select()
        .single();

      if (error) throw error;

      const allMembers = [user!.id, ...selectedUsers];
      const { error: memberError } = await sb
        .from("conversation_members")
        .insert(allMembers.map((uid: string) => ({ conversation_id: conv.id, user_id: uid })));

      if (memberError) throw memberError;
      return conv.id;
    },
    onSuccess: (convId) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      onCreated(convId);
    },
    onError: (error: any) => {
      toast({
        title: "ত্রুটি",
        description: error?.message || "চ্যাট তৈরি করতে ব্যর্থ",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 flex-shrink-0">
        <button onClick={onBack} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {type === "personal" ? "ব্যক্তিগত চ্যাট" : "গ্রুপ চ্যাট"}
        </span>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-3 gap-2">
        {type === "group" && (
          <Input
            placeholder="গ্রুপের নাম..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="h-8 text-sm"
          />
        )}
        <Input
          placeholder="সদস্য খুঁজুন..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-sm"
        />
        <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0">
          {filteredMembers?.map((m) => (
            <div
              key={m.user_id}
              onClick={() => toggleUser(m.user_id)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
            >
              {type === "group" && (
                <Checkbox checked={selectedUsers.includes(m.user_id)} className="h-3.5 w-3.5" />
              )}
              <div className="relative">
                <Avatar className="h-7 w-7">
                  {m.photo_url && <AvatarImage src={m.photo_url} />}
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {m.full_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                {onlineMap && isUserOnline(onlineMap.get(m.user_id)) && (
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border border-background" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">{m.full_name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  #{m.member_id} • {onlineMap && isUserOnline(onlineMap.get(m.user_id)) ? <span className="text-green-500">অনলাইন</span> : getLastSeenText(onlineMap?.get(m.user_id))}
                </p>
              </div>
              {type === "personal" && selectedUsers.includes(m.user_id) && (
                <span className="text-[10px] text-primary flex-shrink-0">✓</span>
              )}
            </div>
          ))}
        </div>
        <Button
          size="sm"
          className="w-full flex-shrink-0"
          disabled={selectedUsers.length === 0 || createConversation.isPending}
          onClick={() => createConversation.mutate()}
        >
          {createConversation.isPending
            ? "তৈরি হচ্ছে..."
            : type === "personal"
            ? "চ্যাট শুরু করুন"
            : `গ্রুপ তৈরি করুন (${selectedUsers.length} জন)`}
        </Button>
      </div>
    </div>
  );
}
