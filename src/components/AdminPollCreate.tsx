import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, X, Vote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AdminPollCreateProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
}

export function AdminPollCreate({ open, onOpenChange, userId }: AdminPollCreateProps) {
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [saving, setSaving] = useState(false);

  const addOption = () => {
    if (options.length >= 6) return;
    setOptions([...options, ""]);
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, val: string) => {
    const copy = [...options];
    copy[idx] = val;
    setOptions(copy);
  };

  const handleCreate = async () => {
    if (!question.trim()) { toast.error("প্রশ্ন লিখুন"); return; }
    const validOptions = options.map(o => o.trim()).filter(Boolean);
    if (validOptions.length < 2) { toast.error("কমপক্ষে ২টি উত্তর দিন"); return; }

    setSaving(true);
    try {
      const { data: poll, error } = await supabase
        .from("polls")
        .insert({ question: question.trim(), created_by: userId })
        .select("id")
        .single();
      if (error) throw error;

      const optRows = validOptions.map((text, i) => ({
        poll_id: poll.id,
        option_text: text,
        sort_order: i,
      }));
      const { error: optErr } = await supabase.from("poll_options").insert(optRows);
      if (optErr) throw optErr;

      toast.success("ভোটিং প্রকাশিত হয়েছে!");
      setQuestion(""); setOptions(["", ""]);
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["admin-polls"] });
      queryClient.invalidateQueries({ queryKey: ["member-polls"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/50 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Vote className="h-5 w-5 text-emerald-400" />
            নতুন ভোটিং তৈরি
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            <Label className="text-foreground text-xs">প্রশ্ন</Label>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="আপনার প্রশ্ন লিখুন..."
              className="bg-secondary border-border/30 mt-1"
            />
          </div>

          <div>
            <Label className="text-foreground text-xs mb-2 block">উত্তর অপশন</Label>
            <div className="space-y-2">
              <AnimatePresence>
                {options.map((opt, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2"
                  >
                    <span className="text-xs text-muted-foreground w-5 text-center shrink-0">{idx + 1}.</span>
                    <Input
                      value={opt}
                      onChange={(e) => updateOption(idx, e.target.value)}
                      placeholder={`অপশন ${idx + 1}`}
                      className="bg-secondary border-border/30 flex-1"
                    />
                    {options.length > 2 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => removeOption(idx)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {options.length < 6 && (
              <Button variant="outline" size="sm" onClick={addOption} className="mt-2 gap-1.5 text-xs border-dashed border-border/50">
                <Plus className="h-3 w-3" /> অপশন যোগ করুন
              </Button>
            )}
          </div>

          <Button
            onClick={handleCreate}
            disabled={saving}
            className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white border-0"
          >
            {saving ? "প্রকাশ হচ্ছে..." : "ভোটিং প্রকাশ করুন"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
