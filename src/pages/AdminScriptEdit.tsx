import { useAuth } from "@/hooks/useAuth";
import { Navigate, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Download, FileText, Edit, Eye, Users, X, Undo, Redo, Maximize, Minimize, CheckCircle2 } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, Heading1, Heading2, Type } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

const AdminScriptEdit = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isEditMode = searchParams.get("mode") === "edit";
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const savedContentRef = useRef<string>("");
  const [wordCount, setWordCount] = useState(0);
  const [currentFontSize, setCurrentFontSize] = useState("");
  const savedSelectionRef = useRef<Range | null>(null);

  // Scene completion tracking
  const [completedScenes, setCompletedScenes] = useState<Set<string>>(new Set());

  // Mention system state
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionPos, setMentionPos] = useState({ top: 0, left: 0 });
  const [mentionIndex, setMentionIndex] = useState(0);
  const mentionRangeRef = useRef<Range | null>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);

  // Save selection and detect font size whenever selection changes inside editor
  useEffect(() => {
    const saveSelection = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
        savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
        // Detect current font size
        const node = sel.anchorNode;
        const el = node?.nodeType === 3 ? node.parentElement : (node as HTMLElement);
        if (el) {
          const size = Math.round(parseFloat(window.getComputedStyle(el).fontSize));
          setCurrentFontSize(String(size));
        }
      }
    };
    document.addEventListener("selectionchange", saveSelection);
    return () => document.removeEventListener("selectionchange", saveSelection);
  }, []);

  const restoreSelection = useCallback(() => {
    const range = savedSelectionRef.current;
    if (range) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, []);

  const applyFontSize = useCallback((px: string) => {
    restoreSelection();
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && editorRef.current?.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      const span = document.createElement("span");
      span.style.fontSize = `${px}px`;
      try { range.surroundContents(span); } catch { /* partial selection */ }
    }
    editorRef.current?.focus();
  }, [restoreSelection]);

  const { data: script, isLoading: scriptLoading } = useQuery({
    queryKey: ["script-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("scripts" as any).select("*").eq("id", id).single();
      if (error) throw error;
      return data as any;
    },
  });

  // Get plain content from stored format
  const getInitialContent = useCallback(() => {
    if (!script?.content) return "";
    try {
      const parsed = JSON.parse(script.content);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].title !== undefined) {
        // Convert sequences to continuous HTML with scene headers
        return parsed.map((s: any) => 
          `<h2>${s.title}</h2>${s.content || '<p><br></p>'}`
        ).join("");
      }
    } catch {}
    return script.content;
  }, [script]);

  useEffect(() => {
    if (editorRef.current && script) {
      // If we have saved content from fullscreen toggle, use that
      if (savedContentRef.current) {
        editorRef.current.innerHTML = savedContentRef.current;
        savedContentRef.current = "";
      } else {
        const content = getInitialContent();
        editorRef.current.innerHTML = content || '<p><br></p>';
      }
      updateWordCount();
    }
  }, [script, isEditMode, isFullscreen]);

  const toggleFullscreen = () => {
    if (editorRef.current) {
      savedContentRef.current = editorRef.current.innerHTML;
    }
    setIsFullscreen(!isFullscreen);
  };

  const updateWordCount = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || "";
    const count = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(count);
  };

  const { data: members } = useQuery({
    queryKey: ["all-members-for-perms"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, member_id, photo_url").eq("is_active", true).order("member_id");
      return data ?? [];
    },
  });

  const { data: permissions, refetch: refetchPerms } = useQuery({
    queryKey: ["script-permissions", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("script_permissions" as any).select("*, profiles(full_name, member_id, photo_url)").eq("script_id", id);
      return (data ?? []) as any[];
    },
  });

  const togglePermission = async (memberId: string) => {
    const existing = permissions?.find((p: any) => p.member_id === memberId);
    if (existing) {
      await supabase.from("script_permissions" as any).delete().eq("id", existing.id);
    } else {
      await supabase.from("script_permissions" as any).insert({ script_id: id, member_id: memberId } as any);
    }
    refetchPerms();
    queryClient.invalidateQueries({ queryKey: ["script-permissions", id] });
  };

  // Get member IDs already mentioned on the current line (same block element)
  const getMentionedInCurrentLine = useCallback(() => {
    if (!editorRef.current) return new Set<string>();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return new Set<string>();

    // Find the closest block-level parent (p, div, h1, h2, li, etc.)
    let node: Node | null = sel.anchorNode;
    let blockEl: HTMLElement | null = null;
    while (node && node !== editorRef.current) {
      if (node.nodeType === 1) {
        const el = node as HTMLElement;
        const display = window.getComputedStyle(el).display;
        if (display === "block" || display === "list-item" || /^(P|DIV|H[1-6]|LI|BLOCKQUOTE)$/i.test(el.tagName)) {
          blockEl = el;
          break;
        }
      }
      node = node.parentNode;
    }

    const mentionedIds = new Set<string>();
    if (blockEl) {
      blockEl.querySelectorAll(".mention-tag").forEach((tag) => {
        const memberId = tag.getAttribute("data-member-id");
        if (memberId) mentionedIds.add(memberId);
      });
    }
    return mentionedIds;
  }, []);

  // Filtered members for mention dropdown
  const filteredMentionMembers = (members ?? []).filter((m: any) => {
    if (mentionQuery && !(m.full_name?.toLowerCase().includes(mentionQuery.toLowerCase()) || String(m.member_id).includes(mentionQuery))) return false;
    return true;
  });

  // State for scene-scoped exclusion
  const [sceneMentionedIds, setSceneMentionedIds] = useState<Set<string>>(new Set());
  
  const visibleMentionMembers = filteredMentionMembers.filter((m: any) => !sceneMentionedIds.has(m.id));

  const insertMention = useCallback(async (member: any) => {
    const range = mentionRangeRef.current;
    if (!range || !editorRef.current) return;
    range.deleteContents();
    const mentionSpan = document.createElement("span");
    mentionSpan.className = "mention-tag";
    mentionSpan.setAttribute("data-member-id", member.id);
    mentionSpan.setAttribute("data-member-name", member.full_name);
    mentionSpan.contentEditable = "false";
    mentionSpan.style.cssText = "background: #dbeafe; color: #1d4ed8; padding: 1px 6px; border-radius: 4px; font-weight: 500; cursor: default; display: inline-block; margin: 0 2px;";
    mentionSpan.textContent = member.full_name;
    range.insertNode(mentionSpan);
    const spaceNode = document.createTextNode("\u00A0");
    mentionSpan.after(spaceNode);
    const newRange = document.createRange();
    newRange.setStartAfter(spaceNode);
    newRange.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(newRange);
    setMentionOpen(false);
    setMentionQuery("");
    setMentionIndex(0);
    const alreadyHasPermission = permissions?.find((p: any) => p.member_id === member.id);
    if (!alreadyHasPermission) {
      await supabase.from("script_permissions" as any).insert({ script_id: id, member_id: member.id } as any);
      refetchPerms();
      queryClient.invalidateQueries({ queryKey: ["script-permissions", id] });
      toast.success(`${member.full_name} কে স্ক্রিপ্ট পারমিশন দেওয়া হয়েছে`);
    }
  }, [id, permissions, queryClient, refetchPerms]);

  const handleEditorInput = useCallback(() => {
    updateWordCount();
    if (!editorRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return;
    const node = sel.anchorNode;
    if (node?.nodeType !== 3) return;
    const text = node.textContent?.substring(0, sel.anchorOffset) || "";
    const atIndex = text.lastIndexOf("@");
    if (atIndex >= 0) {
      const query = text.substring(atIndex + 1);
      if (atIndex === 0 || /[\s\n]/.test(text[atIndex - 1])) {
        const caretRange = document.createRange();
        caretRange.setStart(node, atIndex);
        caretRange.setEnd(node, sel.anchorOffset);
        const rect = caretRange.getBoundingClientRect();
        const editorRect = editorRef.current.getBoundingClientRect();
        mentionRangeRef.current = caretRange.cloneRange();
        setMentionQuery(query);
        setMentionPos({
          top: rect.bottom - editorRect.top + editorRef.current.scrollTop + 4,
          left: rect.left - editorRect.left,
        });
        setSceneMentionedIds(getMentionedInCurrentLine());
        setMentionOpen(true);
        setMentionIndex(0);
        return;
      }
    }
    if (mentionOpen) {
      setMentionOpen(false);
      setMentionQuery("");
    }
  }, [mentionOpen]);

  const handleMentionKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!mentionOpen) return false;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIndex((i) => Math.min(i + 1, visibleMentionMembers.length - 1));
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIndex((i) => Math.max(i - 1, 0));
      return true;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (visibleMentionMembers[mentionIndex]) {
        insertMention(visibleMentionMembers[mentionIndex]);
      }
      return true;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setMentionOpen(false);
      return true;
    }
    return false;
  }, [mentionOpen, visibleMentionMembers, mentionIndex, insertMention]);

  // Scene completion: render checkboxes in preview mode
  const renderSceneCheckboxes = useCallback(() => {
    if (isEditMode || !editorRef.current) return;
    editorRef.current.querySelectorAll(".scene-check-btn").forEach(el => el.remove());
    // Reset padding
    editorRef.current.querySelectorAll("[data-scene-padded]").forEach(el => {
      (el as HTMLElement).style.paddingLeft = "";
      el.removeAttribute("data-scene-padded");
    });
    
    const allEls = editorRef.current.querySelectorAll("h1, h2, p, div, b");
    allEls.forEach((el) => {
      const text = el.textContent?.trim() || "";
      if (!/দৃশ্য/i.test(text)) return;
      if ((el as HTMLElement).closest(".scene-check-btn")) return;
      // Skip if a child already has a checkbox
      if (el.querySelector(".scene-check-btn")) return;
      const htmlEl = el as HTMLElement;
      if (window.getComputedStyle(htmlEl).position === "static") {
        htmlEl.style.position = "relative";
      }
      htmlEl.style.paddingLeft = "32px";
      htmlEl.setAttribute("data-scene-padded", "true");
      
      const key = text.replace(/\s*সম্পন্ন\s*/g, "").trim();
      const isDone = completedScenes.has(key);
      const btn = document.createElement("button");
      btn.className = "scene-check-btn";
      btn.type = "button";
      btn.style.cssText = `position:absolute;left:2px;top:50%;transform:translateY(-50%);width:22px;height:22px;border-radius:50%;border:2px solid ${isDone ? '#16a34a' : '#9ca3af'};background:${isDone ? '#16a34a' : 'transparent'};cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;padding:0;z-index:5;`;
      btn.innerHTML = isDone ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>` : '';
      btn.setAttribute("data-scene-key", key);
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        setCompletedScenes(prev => {
          const next = new Set(prev);
          if (next.has(key)) next.delete(key); else next.add(key);
          return next;
        });
      });
      htmlEl.insertBefore(btn, htmlEl.firstChild);
    });
  }, [isEditMode, completedScenes]);

  useEffect(() => {
    const timer = setTimeout(renderSceneCheckboxes, 150);
    return () => clearTimeout(timer);
  }, [renderSceneCheckboxes, script, isEditMode]);

  if (loading || scriptLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (!script) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">স্ক্রিপ্ট পাওয়া যায়নি</div>;

  const execCmd = (command: string, value?: string) => {
    editorRef.current?.focus();
    restoreSelection();

    const alignmentMap: Record<string, "left" | "center" | "right" | "justify"> = {
      justifyLeft: "left",
      justifyCenter: "center",
      justifyRight: "right",
      justifyFull: "justify",
    };

    const alignment = alignmentMap[command];

    if (alignment && editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);

        const getBlockElement = (node: Node | null): HTMLElement | null => {
          let current = node instanceof HTMLElement ? node : node?.parentElement ?? null;
          while (current && current !== editorRef.current) {
            if (["P", "DIV", "H1", "H2", "LI", "BLOCKQUOTE"].includes(current.tagName)) {
              return current;
            }
            current = current.parentElement;
          }
          return null;
        };

        // Always get block from cursor position first
        const cursorBlock = getBlockElement(range.startContainer);

        if (range.collapsed && cursorBlock) {
          // Cursor only (no selection) — align the current block
          cursorBlock.style.textAlign = alignment;
          editorRef.current.focus();
          return;
        }

        // Has selection — find all blocks in range
        const allBlocks = Array.from(
          editorRef.current.querySelectorAll<HTMLElement>("p, div, h1, h2, li, blockquote")
        ).filter((block) => {
          return range.intersectsNode(block);
        });

        const blocksToAlign = allBlocks.length ? allBlocks : [cursorBlock].filter(Boolean) as HTMLElement[];

        if (blocksToAlign.length) {
          blocksToAlign.forEach((block) => {
            block.style.textAlign = alignment;
          });
          editorRef.current.focus();
          return;
        }
      }
    }

    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleSave = async () => {
    if (!editorRef.current) return;
    const htmlContent = editorRef.current.innerHTML;
    setSaving(true);
    try {
      // Save as raw HTML (single document)
      const { error } = await supabase.from("scripts" as any).update({
        content: htmlContent,
        updated_at: new Date().toISOString(),
      } as any).eq("id", id);
      if (error) throw error;
      toast.success("স্ক্রিপ্ট সেভ হয়েছে!");
      queryClient.invalidateQueries({ queryKey: ["admin-scripts"] });
      queryClient.invalidateQueries({ queryKey: ["script-detail", id] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const key = e.key.toLowerCase();
    const shortcuts: Record<string, () => void> = {
      s: () => handleSave(),
      b: () => execCmd("bold"),
      u: () => execCmd("underline"),
      e: () => execCmd("justifyCenter"),
      l: () => execCmd("justifyLeft"),
      r: () => execCmd("justifyRight"),
      j: () => execCmd("justifyFull"),
    };
    if (shortcuts[key]) {
      e.preventDefault();
      shortcuts[key]();
    }
  };

  const handleDownloadPDF = () => {
    const content = editorRef.current?.innerHTML || getInitialContent();
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
    body { font-family: 'Noto Sans Bengali', sans-serif; padding: 50px 60px; color: #1a1a1a; line-height: 1.9; font-size: 14px; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { font-size: 26px; font-weight: 700; }
    .header p { font-size: 11px; color: #666; margin-top: 5px; }
    h1 { font-size: 22px; font-weight: 700; margin: 16px 0 10px; }
    h2 { font-size: 18px; font-weight: 600; margin: 14px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    p { margin-bottom: 10px; }
    ul, ol { padding-left: 24px; margin-bottom: 10px; }
    li { margin-bottom: 4px; }
    .footer { text-align: center; font-size: 10px; color: #999; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 10px; }
    @media print { body { padding: 30px 40px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${script.title}</h1>
    <p>তারিখ: ${new Date().toLocaleDateString("bn-BD")}</p>
  </div>
  <div>${content}</div>
  <div class="footer">KM Production — স্ক্রিপ্ট</div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const editorContent = (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-muted overflow-auto pt-0' : ''}`} id="fullscreen-container">
      <div className={`${isFullscreen ? 'max-w-6xl px-4' : 'max-w-5xl'} mx-auto space-y-3 relative`}>
        {/* Toolbar - fixed in edit mode */}
        {isEditMode && (
          <div className={`fixed ${isFullscreen ? 'top-0 left-0' : 'top-12 md:top-14 left-0 md:left-[var(--sidebar-width,0px)]'} right-0 z-[51] bg-card/95 backdrop-blur-md border-b border-border/30 shadow-lg`}>
            <div className={`${isFullscreen ? 'max-w-6xl' : 'max-w-5xl'} mx-auto px-2 md:px-4 py-1.5 space-y-1`}>
              {/* Title row */}
              <div className="flex items-center gap-2 min-w-0">
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { if (isFullscreen) toggleFullscreen(); else navigate("/admin/scripts"); }}>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
                <h1 className="text-sm font-bold text-foreground truncate flex items-center gap-1.5 flex-1 min-w-0">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{script.title}</span>
                </h1>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="outline" size="sm" className="gap-1 text-[11px] h-7 px-2" onClick={toggleFullscreen} title={isFullscreen ? "ফুলস্ক্রিন বন্ধ" : "ফুলস্ক্রিন"}>
                    {isFullscreen ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-[11px] h-7 px-2" onClick={() => setPermDialogOpen(true)}>
                    <Users className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-[11px] h-7 px-2" onClick={handleDownloadPDF}>
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-[11px] h-7 px-2" onClick={() => setSearchParams({})}>
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button size="sm" className="gap-1 text-[11px] h-7" onClick={handleSave} disabled={saving}>
                    <Save className="h-3 w-3" /> {saving ? "..." : "সেভ"}
                  </Button>
                </div>
              </div>
              {/* Formatting toolbar */}
              <div className="flex flex-wrap items-center gap-0.5 md:gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd("bold")} title="বোল্ড"><Bold className="h-3.5 w-3.5" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd("italic")} title="ইটালিক"><Italic className="h-3.5 w-3.5" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd("underline")} title="আন্ডারলাইন"><Underline className="h-3.5 w-3.5" /></Button>
                <Separator orientation="vertical" className="h-5 mx-0.5 hidden md:block" />
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd("formatBlock", "<h1>")} title="হেডিং ১"><Heading1 className="h-3.5 w-3.5" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd("formatBlock", "<h2>")} title="হেডিং ২"><Heading2 className="h-3.5 w-3.5" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd("formatBlock", "<p>")} title="প্যারাগ্রাফ"><Type className="h-3.5 w-3.5" /></Button>
                <Separator orientation="vertical" className="h-5 mx-0.5 hidden md:block" />
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd("justifyLeft")}><AlignLeft className="h-3.5 w-3.5" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd("justifyCenter")}><AlignCenter className="h-3.5 w-3.5" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd("justifyRight")}><AlignRight className="h-3.5 w-3.5" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd("justifyFull")}><AlignJustify className="h-3.5 w-3.5" /></Button>
                <Separator orientation="vertical" className="h-5 mx-0.5 hidden md:block" />
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd("insertUnorderedList")}><List className="h-3.5 w-3.5" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCmd("insertOrderedList")}><span className="text-[10px] font-mono">1.</span></Button>
                <Separator orientation="vertical" className="h-5 mx-0.5 hidden md:block" />
                <div className="flex items-center gap-0.5">
                  <input
                    type="number"
                    min={8}
                    max={96}
                    placeholder="সাইজ"
                    value={currentFontSize}
                    onChange={(e) => setCurrentFontSize(e.target.value)}
                    className="h-7 w-14 text-[10px] bg-secondary border border-border/50 rounded px-1.5 text-foreground text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value;
                        if (val) applyFontSize(val);
                      }
                    }}
                    title="ফন্ট সাইজ (px) — সাইজ লিখে Enter চাপুন"
                  />
                  <span className="text-[9px] text-muted-foreground">px</span>
                </div>
                <Separator orientation="vertical" className="h-5 mx-0.5 hidden md:block" />
                <div className="flex items-center gap-1">
                  <label className="relative cursor-pointer" title="টেক্সট রং" onMouseDown={(e) => e.preventDefault()}>
                    <span className="text-[10px] text-muted-foreground">A</span>
                    <input
                      type="color"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      defaultValue="#ffffff"
                      onChange={(e) => {
                        restoreSelection();
                        execCmd("foreColor", e.target.value);
                      }}
                    />
                    <div className="h-1 w-4 rounded-full bg-primary mt-[-2px]" id="text-color-indicator" />
                  </label>
                  <label className="relative cursor-pointer" title="ব্যাকগ্রাউন্ড রং" onMouseDown={(e) => e.preventDefault()}>
                    <span className="text-[10px] text-muted-foreground px-1 bg-primary/20 rounded">A</span>
                    <input
                      type="color"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      defaultValue="#000000"
                      onChange={(e) => {
                        restoreSelection();
                        execCmd("hiliteColor", e.target.value);
                      }}
                    />
                  </label>
                </div>
                <div className="ml-auto text-[10px] text-muted-foreground hidden md:block">
                  {toBn(wordCount)} শব্দ · Ctrl+S সেভ
                </div>
              </div>
            </div>
          </div>
        )}
        {isEditMode && <div className="h-[92px]" />}

        {/* Header - view mode */}
        {!isEditMode && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => { if (isFullscreen) toggleFullscreen(); else navigate("/admin/scripts"); }}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg md:text-xl font-bold text-foreground truncate flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <span className="truncate">{script.title}</span>
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
                {isFullscreen ? "ছোট করুন" : "ফুলস্ক্রিন"}
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setPermDialogOpen(true)}>
                <Users className="h-3.5 w-3.5" /> পারমিশন {permissions?.length ? `(${permissions.length})` : ""}
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleDownloadPDF}>
                <Download className="h-3.5 w-3.5" /> PDF
              </Button>
              <Button size="sm" className="gap-1.5 text-xs" onClick={() => setSearchParams({ mode: "edit" })}>
                <Edit className="h-3.5 w-3.5" /> এডিট করুন
              </Button>
            </div>
          </div>
        )}

        {/* Word-like Document Page */}
        <div className="flex justify-center pb-8">
          <div 
            className={`w-full ${isFullscreen ? 'max-w-[960px]' : 'max-w-[816px]'} bg-white shadow-2xl border border-gray-200/50 rounded-sm transition-all duration-300 relative`}
            style={{ minHeight: isFullscreen ? "calc(100vh - 120px)" : "1056px" }}
          >
            <div
              ref={editorRef}
              contentEditable={isEditMode}
              className={`
                w-full px-[60px] md:px-[80px] py-[60px] 
                text-gray-900 focus:outline-none
                text-[15px] leading-[1.8]
                [&_h1]:text-[24px] [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6 [&_h1]:text-gray-900 [&_h1]:leading-tight
                [&_h2]:text-[20px] [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-gray-800 [&_h2]:leading-tight [&_h2]:border-b [&_h2]:border-gray-200 [&_h2]:pb-1
                [&_p]:mb-3 [&_p]:leading-[1.8]
                [&_ul]:list-disc [&_ul]:pl-8 [&_ul]:mb-3
                [&_ol]:list-decimal [&_ol]:pl-8 [&_ol]:mb-3
                [&_li]:mb-1.5 [&_li]:leading-[1.7]
                [&_strong]:font-bold [&_em]:italic [&_u]:underline
                selection:bg-blue-200
              `}
              style={{ fontFamily: "'Noto Sans Bengali', 'Kalpurush', sans-serif", wordBreak: "break-word", minHeight: isFullscreen ? "calc(100vh - 120px)" : "1056px" }}
              suppressContentEditableWarning
              onInput={handleEditorInput}
              onPointerDown={handleEditorPointerDown}
              onPointerUp={handleEditorPointerUp}
              onPointerCancel={handleEditorPointerUp}
              onPointerLeave={handleEditorPointerUp}
              onContextMenu={!isEditMode ? (e) => e.preventDefault() : undefined}
              onKeyDown={isEditMode ? (e) => {
                if (handleMentionKeyDown(e)) return;
                handleKeyDown(e);
              } : undefined}
            />

            {/* Mention Dropdown */}
            {mentionOpen && isEditMode && visibleMentionMembers.length > 0 && (
              <div
                ref={mentionListRef}
                className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-xl max-h-[360px] overflow-y-auto w-[260px]"
                style={{ top: mentionPos.top, left: Math.min(mentionPos.left, 500) }}
              >
                <div className="px-3 py-1.5 text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100">সদস্য সিলেক্ট করুন</div>
                {visibleMentionMembers.map((m: any, idx: number) => (
                  <button
                    key={m.id}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors ${idx === mentionIndex ? "bg-blue-50" : ""}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertMention(m);
                    }}
                    onMouseEnter={() => setMentionIndex(idx)}
                  >
                    {m.photo_url ? (
                      <img src={m.photo_url} alt="" className="w-7 h-7 rounded-full object-cover border border-gray-200" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                        {m.full_name?.[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-gray-900 font-medium text-[13px] truncate">{m.full_name}</div>
                      <div className="text-gray-400 text-[10px]">ID: {m.member_id}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Word count bar - view mode */}
        {!isEditMode && (
          <div className="text-center text-xs text-muted-foreground pb-4">
            {toBn(wordCount)} শব্দ
          </div>
        )}
      </div>

      {/* Permission Dialog */}
      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
        <DialogContent className="bg-card border-border/50 max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> স্ক্রিপ্ট পারমিশন
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">কোন কোন সদস্য এই স্ক্রিপ্ট দেখতে পারবে তা সিলেক্ট করুন:</p>
          {permissions && permissions.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">অনুমোদিত সদস্য</p>
              <div className="space-y-1.5">
                {permissions.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-success/5 border border-success/20">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden">
                        {p.profiles?.photo_url ? <img src={p.profiles.photo_url} alt="" className="h-full w-full object-cover" /> : <span className="text-primary text-[9px] font-medium">{p.profiles?.full_name?.charAt(0)}</span>}
                      </div>
                      <div>
                        <p className="text-sm text-foreground">{p.profiles?.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">ID: {p.profiles?.member_id}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => togglePermission(p.member_id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto space-y-1 border-t border-border/20 pt-3">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">সকল সদস্য</p>
            {members?.map((m) => {
              const hasAccess = permissions?.some((p: any) => p.member_id === m.id);
              return (
                <label key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/30 cursor-pointer transition-colors">
                  <Checkbox checked={hasAccess} onCheckedChange={() => togglePermission(m.id)} />
                  <div className="h-7 w-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden shrink-0">
                    {m.photo_url ? <img src={m.photo_url} alt="" className="h-full w-full object-cover" /> : <span className="text-primary text-[9px] font-medium">{m.full_name?.charAt(0)}</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">{m.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">ID: {m.member_id}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (isFullscreen) return editorContent;

  return (
    <AppLayout>
      {editorContent}
    </AppLayout>
  );
};

export default AdminScriptEdit;
