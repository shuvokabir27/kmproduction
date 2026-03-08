import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "personal" | "group";
  onCreated: (conversationId: string) => void;
}

export function NewChatDialog({ open, onOpenChange, type, onCreated }: NewChatDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [search, setSearch] = useState("");

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

      // For personal chat, check if conversation already exists
      if (type === "personal") {
        const targetUserId = selectedUsers[0];
        // Get all user's conversations
        const { data: myConvos } = await supabase
          .from("conversation_members")
          .select("conversation_id")
          .eq("user_id", user!.id);

        if (myConvos && myConvos.length > 0) {
          const myConvoIds = myConvos.map((c) => c.conversation_id);
          // Check if target user is in any of these personal conversations
          const { data: sharedConvos } = await supabase
            .from("conversation_members")
            .select("conversation_id")
            .eq("user_id", targetUserId)
            .in("conversation_id", myConvoIds);

          if (sharedConvos && sharedConvos.length > 0) {
            // Check if any of those are personal type
            const { data: personalConvos } = await supabase
              .from("conversations")
              .select("id")
              .in("id", sharedConvos.map((c) => c.conversation_id))
              .eq("type", "personal");

            if (personalConvos && personalConvos.length > 0) {
              return personalConvos[0].id;
            }
          }
        }
      }

      // Create new conversation
      const { data: conv, error } = await supabase
        .from("conversations")
        .insert({
          name: type === "group" ? groupName || "গ্রুপ চ্যাট" : null,
          type,
          created_by: user!.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add members (including self)
      const allMembers = [user!.id, ...selectedUsers];
      const { error: memberError } = await supabase
        .from("conversation_members")
        .insert(allMembers.map((uid) => ({ conversation_id: conv.id, user_id: uid })));

      if (memberError) throw memberError;

      return conv.id;
    },
    onSuccess: (convId) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      onCreated(convId);
      onOpenChange(false);
      setSelectedUsers([]);
      setGroupName("");
      setSearch("");
    },
    onError: () => {
      toast({ title: "ত্রুটি", description: "চ্যাট তৈরি করতে ব্যর্থ", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{type === "personal" ? "ব্যক্তিগত চ্যাট শুরু করুন" : "গ্রুপ চ্যাট তৈরি করুন"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {type === "group" && (
            <Input
              placeholder="গ্রুপের নাম..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          )}
          <Input
            placeholder="সদস্য খুঁজুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-60 overflow-y-auto space-y-1">
            {filteredMembers?.map((m) => (
              <div
                key={m.user_id}
                onClick={() => toggleUser(m.user_id)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
              >
                {type === "group" && (
                  <Checkbox checked={selectedUsers.includes(m.user_id)} />
                )}
                <Avatar className="h-8 w-8">
                  {m.photo_url && <AvatarImage src={m.photo_url} />}
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {m.full_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">{m.full_name}</p>
                  <p className="text-[10px] text-muted-foreground">#{m.member_id}</p>
                </div>
                {type === "personal" && selectedUsers.includes(m.user_id) && (
                  <span className="ml-auto text-xs text-primary">নির্বাচিত</span>
                )}
              </div>
            ))}
          </div>
          <Button
            className="w-full"
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
      </DialogContent>
    </Dialog>
  );
}
