import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, Heading1, Heading2, Save, X, Type } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

interface ScriptEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialContent: string;
  onSave: (content: string) => Promise<void>;
  readOnly?: boolean;
}

export function ScriptEditor({ open, onOpenChange, title, initialContent, onSave, readOnly = false }: ScriptEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const execCmd = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, []);

  const handleSave = async () => {
    if (!editorRef.current) return;
    setSaving(true);
    try {
      await onSave(editorRef.current.innerHTML);
      toast.success("স্ক্রিপ্ট সেভ হয়েছে!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/50 max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-foreground">{title}</DialogTitle>
        </DialogHeader>

        {!readOnly && (
          <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-border/30">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCmd("bold")} title="বোল্ড">
              <Bold className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCmd("italic")} title="ইটালিক">
              <Italic className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCmd("underline")} title="আন্ডারলাইন">
              <Underline className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCmd("formatBlock", "<h1>")} title="হেডিং ১">
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCmd("formatBlock", "<h2>")} title="হেডিং ২">
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCmd("formatBlock", "<p>")} title="প্যারাগ্রাফ">
              <Type className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCmd("justifyLeft")} title="বামে">
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCmd("justifyCenter")} title="মাঝে">
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCmd("justifyRight")} title="ডানে">
              <AlignRight className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCmd("insertUnorderedList")} title="লিস্ট">
              <List className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCmd("insertOrderedList")} title="নম্বর লিস্ট">
              <span className="text-xs font-mono">1.</span>
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <select
              className="h-8 text-xs bg-secondary border border-border/50 rounded px-2 text-foreground"
              onChange={(e) => { if (e.target.value) execCmd("fontSize", e.target.value); }}
              defaultValue=""
            >
              <option value="" disabled>সাইজ</option>
              <option value="1">ছোট</option>
              <option value="3">সাধারণ</option>
              <option value="5">বড়</option>
              <option value="7">অনেক বড়</option>
            </select>
            <select
              className="h-8 text-xs bg-secondary border border-border/50 rounded px-2 text-foreground"
              onChange={(e) => { if (e.target.value) execCmd("foreColor", e.target.value); }}
              defaultValue=""
            >
              <option value="" disabled>রং</option>
              <option value="#ffffff">সাদা</option>
              <option value="#ef4444">লাল</option>
              <option value="#3b82f6">নীল</option>
              <option value="#22c55e">সবুজ</option>
              <option value="#eab308">হলুদ</option>
              <option value="#a855f7">বেগুনি</option>
              <option value="#f97316">কমলা</option>
            </select>
          </div>
        )}

        <div className="flex-1 overflow-auto px-4 pb-2">
          <div
            ref={editorRef}
            contentEditable={!readOnly}
            className="min-h-[400px] p-4 bg-secondary/50 rounded-lg border border-border/30 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 prose prose-invert max-w-none
              [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:text-foreground
              [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:text-foreground
              [&_p]:mb-2 [&_p]:leading-relaxed
              [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-2
              [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-2
              [&_li]:mb-1"
            dangerouslySetInnerHTML={{ __html: initialContent || (readOnly ? '<p class="text-muted-foreground">কোনো স্ক্রিপ্ট নেই</p>' : '<p>এখানে স্ক্রিপ্ট লিখুন...</p>') }}
            suppressContentEditableWarning
          />
        </div>

        {!readOnly && (
          <div className="flex justify-end gap-2 p-4 pt-2 border-t border-border/30">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="gap-2">
              <X className="h-4 w-4" /> বাতিল
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
