import { useAuth } from "@/hooks/useAuth";
import { Navigate, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Plus, Trash2, GripVertical, ChevronDown, ChevronRight, Download, FileText, Edit, Eye, Users, X, UserPlus } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, Heading1, Heading2, Type } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Sequence {
  id: string;
  title: string;
  content: string;
  collapsed: boolean;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

// Parse existing content into sequences
const parseContent = (content: string): Sequence[] => {
  if (!content) return [{ id: generateId(), title: "সিকুয়েন্স ১", content: "", collapsed: false }];
  
  // Try to parse as JSON sequences format
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].title !== undefined) {
      return parsed.map((s: any) => ({ ...s, collapsed: false }));
    }
  } catch {}
  
  // Legacy: single content block
  return [{ id: generateId(), title: "সিকুয়েন্স ১", content, collapsed: false }];
};

const AdminScriptEdit = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isEditMode = searchParams.get("mode") === "edit";
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeSeqId, setActiveSeqId] = useState<string | null>(null);
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const editorRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { data: script, isLoading: scriptLoading } = useQuery({
    queryKey: ["script-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("scripts" as any).select("*").eq("id", id).single();
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (script) {
      setSequences(parseContent(script.content));
    }
  }, [script]);

  if (loading || scriptLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (!script) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">স্ক্রিপ্ট পাওয়া যায়নি</div>;

  const execCmd = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const handleSave = async () => {
    // Sync content from editors
    const updated = sequences.map(seq => ({
      ...seq,
      content: editorRefs.current[seq.id]?.innerHTML || seq.content,
    }));
    setSaving(true);
    try {
      const { error } = await supabase.from("scripts" as any).update({
        content: JSON.stringify(updated.map(s => ({ id: s.id, title: s.title, content: s.content }))),
        updated_at: new Date().toISOString(),
      } as any).eq("id", id);
      if (error) throw error;
      toast.success("স্ক্রিপ্ট সেভ হয়েছে!");
      queryClient.invalidateQueries({ queryKey: ["admin-scripts"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addSequence = () => {
    const num = sequences.length + 1;
    const newSeq: Sequence = { id: generateId(), title: `সিকুয়েন্স ${num}`, content: "", collapsed: false };
    setSequences([...sequences, newSeq]);
    setActiveSeqId(newSeq.id);
  };

  const removeSequence = (seqId: string) => {
    if (sequences.length <= 1) { toast.error("অন্তত একটি সিকুয়েন্স থাকতে হবে"); return; }
    setSequences(sequences.filter(s => s.id !== seqId));
  };

  const updateSeqTitle = (seqId: string, title: string) => {
    setSequences(sequences.map(s => s.id === seqId ? { ...s, title } : s));
  };

  const toggleCollapse = (seqId: string) => {
    // Save content before collapsing
    const el = editorRefs.current[seqId];
    if (el) {
      setSequences(prev => prev.map(s => s.id === seqId ? { ...s, content: el.innerHTML, collapsed: !s.collapsed } : s));
    } else {
      setSequences(prev => prev.map(s => s.id === seqId ? { ...s, collapsed: !s.collapsed } : s));
    }
  };

  const handleDownloadPDF = async () => {
    // Sync content
    const updated = sequences.map(seq => ({
      ...seq,
      content: editorRefs.current[seq.id]?.innerHTML || seq.content,
    }));

    const printWindow = window.open("", "_blank");
    if (!printWindow) { toast.error("পপআপ ব্লক করা হয়েছে"); return; }

    const htmlContent = `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <title>${script.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Noto Sans Bengali', sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.8; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { font-size: 28px; font-weight: 700; }
    .header p { font-size: 12px; color: #666; margin-top: 5px; }
    .sequence { margin-bottom: 30px; page-break-inside: avoid; }
    .seq-title { font-size: 18px; font-weight: 700; background: #f0f0f0; padding: 8px 16px; border-left: 4px solid #333; margin-bottom: 12px; }
    .seq-content { padding: 0 16px; font-size: 14px; }
    .seq-content h1 { font-size: 22px; font-weight: 700; margin: 12px 0 8px; }
    .seq-content h2 { font-size: 18px; font-weight: 600; margin: 10px 0 6px; }
    .seq-content p { margin-bottom: 8px; }
    .seq-content ul, .seq-content ol { padding-left: 24px; margin-bottom: 8px; }
    .footer { text-align: center; font-size: 10px; color: #999; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 10px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${script.title}</h1>
    <p>তারিখ: ${new Date().toLocaleDateString("bn-BD")} | মোট সিকুয়েন্স: ${updated.length}</p>
  </div>
  ${updated.map((seq, i) => `
    <div class="sequence">
      <div class="seq-title">${seq.title}</div>
      <div class="seq-content">${seq.content || '<p style="color:#999">খালি</p>'}</div>
    </div>
  `).join("")}
  <div class="footer">KM Production — স্ক্রিপ্ট</div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const Toolbar = () => (
    <div className="flex flex-wrap items-center gap-1 px-3 py-1.5 bg-secondary/50 border-b border-border/30 sticky top-0 z-10">
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd("bold")}><Bold className="h-3.5 w-3.5" /></Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd("italic")}><Italic className="h-3.5 w-3.5" /></Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd("underline")}><Underline className="h-3.5 w-3.5" /></Button>
      <Separator orientation="vertical" className="h-5 mx-0.5" />
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd("formatBlock", "<h1>")}><Heading1 className="h-3.5 w-3.5" /></Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd("formatBlock", "<h2>")}><Heading2 className="h-3.5 w-3.5" /></Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd("formatBlock", "<p>")}><Type className="h-3.5 w-3.5" /></Button>
      <Separator orientation="vertical" className="h-5 mx-0.5" />
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd("justifyLeft")}><AlignLeft className="h-3.5 w-3.5" /></Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd("justifyCenter")}><AlignCenter className="h-3.5 w-3.5" /></Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd("justifyRight")}><AlignRight className="h-3.5 w-3.5" /></Button>
      <Separator orientation="vertical" className="h-5 mx-0.5" />
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd("insertUnorderedList")}><List className="h-3.5 w-3.5" /></Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd("insertOrderedList")}><span className="text-[10px] font-mono">1.</span></Button>
      <Separator orientation="vertical" className="h-5 mx-0.5" />
      <select className="h-7 text-[10px] bg-secondary border border-border/50 rounded px-1.5 text-foreground" onChange={(e) => { if (e.target.value) execCmd("fontSize", e.target.value); }} defaultValue="">
        <option value="" disabled>সাইজ</option>
        <option value="1">ছোট</option>
        <option value="3">সাধারণ</option>
        <option value="5">বড়</option>
        <option value="7">অনেক বড়</option>
      </select>
      <select className="h-7 text-[10px] bg-secondary border border-border/50 rounded px-1.5 text-foreground" onChange={(e) => { if (e.target.value) execCmd("foreColor", e.target.value); }} defaultValue="">
        <option value="" disabled>রং</option>
        <option value="#ffffff">সাদা</option>
        <option value="#ef4444">লাল</option>
        <option value="#3b82f6">নীল</option>
        <option value="#22c55e">সবুজ</option>
        <option value="#eab308">হলুদ</option>
      </select>
    </div>
  );

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate("/admin/scripts")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-foreground truncate flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                {script.title}
              </h1>
              <p className="text-[10px] text-muted-foreground">{sequences.length} সিকুয়েন্স</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleDownloadPDF}>
              <Download className="h-3.5 w-3.5" /> PDF
            </Button>
            {isEditMode ? (
              <>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setSearchParams({})}>
                  <Eye className="h-3.5 w-3.5" /> প্রিভিউ
                </Button>
                <Button size="sm" className="gap-1.5 text-xs" onClick={handleSave} disabled={saving}>
                  <Save className="h-3.5 w-3.5" /> {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
                </Button>
              </>
            ) : (
              <Button size="sm" className="gap-1.5 text-xs" onClick={() => setSearchParams({ mode: "edit" })}>
                <Edit className="h-3.5 w-3.5" /> এডিট করুন
              </Button>
            )}
          </div>
        </div>

        {/* Toolbar - only in edit mode */}
        {isEditMode && <Toolbar />}

        {/* Sequences */}
        <div className="space-y-3">
          {sequences.map((seq, index) => (
            <Card key={seq.id} className="bg-card border-border/30 overflow-hidden">
              {/* Sequence Header */}
              <div className="flex items-center gap-2 px-3 py-2 bg-secondary/30 border-b border-border/20">
                <button onClick={() => toggleCollapse(seq.id)} className="text-muted-foreground hover:text-foreground">
                  {seq.collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {isEditMode ? (
                  <>
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
                    <Input
                      value={seq.title}
                      onChange={(e) => updateSeqTitle(seq.id, e.target.value)}
                      className="h-7 text-sm font-semibold bg-transparent border-none shadow-none focus-visible:ring-0 p-0 text-foreground"
                    />
                  </>
                ) : (
                  <span className="text-sm font-semibold text-foreground">{seq.title}</span>
                )}
                <span className="text-[10px] text-muted-foreground shrink-0 ml-auto">#{index + 1}</span>
                {isEditMode && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeSequence(seq.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {/* Sequence Content */}
              {!seq.collapsed && (
                isEditMode ? (
                  <div
                    ref={(el) => { editorRefs.current[seq.id] = el; }}
                    contentEditable
                    className="min-h-[150px] p-4 text-foreground focus:outline-none focus:bg-secondary/10 prose prose-invert max-w-none text-sm
                      [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:text-foreground
                      [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:text-foreground
                      [&_p]:mb-2 [&_p]:leading-relaxed
                      [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-2
                      [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-2
                      [&_li]:mb-1"
                    dangerouslySetInnerHTML={{ __html: seq.content || '<p>এখানে লিখুন...</p>' }}
                    suppressContentEditableWarning
                    onFocus={() => setActiveSeqId(seq.id)}
                  />
                ) : (
                  <div
                    className="p-4 text-foreground prose prose-invert max-w-none text-sm
                      [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:text-foreground
                      [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:text-foreground
                      [&_p]:mb-2 [&_p]:leading-relaxed
                      [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-2
                      [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-2
                      [&_li]:mb-1"
                    dangerouslySetInnerHTML={{ __html: seq.content || '<p class="text-muted-foreground">খালি</p>' }}
                  />
                )
              )}
            </Card>
          ))}
        </div>

        {/* Add Sequence Button - only in edit mode */}
        {isEditMode && (
          <Button variant="outline" className="w-full gap-2 border-dashed border-border/50 text-muted-foreground hover:text-foreground" onClick={addSequence}>
            <Plus className="h-4 w-4" /> নতুন সিকুয়েন্স যোগ করুন
          </Button>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminScriptEdit;
