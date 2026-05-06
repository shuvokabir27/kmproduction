import { useRef, useEffect, useCallback } from "react";
import { Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2, Type, RemoveFormatting, AlignLeft, AlignCenter, AlignRight } from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const TEXT_COLORS = ["#ffffff", "#0f172a", "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899"];
const HIGHLIGHT_COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca", "#fed7aa", "#e9d5ff", "#fbcfe8"];

export function RichTextEditor({ value, onChange, placeholder = "এখানে লিখুন...", minHeight = 160 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const lastValue = useRef<string>("");

  useEffect(() => {
    if (!ref.current) return;
    if (value !== ref.current.innerHTML && value !== lastValue.current) {
      ref.current.innerHTML = value || "";
      lastValue.current = value || "";
    }
  }, [value]);

  const exec = useCallback((cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    ref.current?.focus();
    if (ref.current) {
      lastValue.current = ref.current.innerHTML;
      onChange(ref.current.innerHTML);
    }
  }, [onChange]);

  const handleInput = () => {
    if (!ref.current) return;
    lastValue.current = ref.current.innerHTML;
    onChange(ref.current.innerHTML);
  };

  const Btn = ({ onClick, title, children }: any) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent text-foreground"
    >
      {children}
    </button>
  );

  return (
    <div className="border border-border rounded-md bg-background">
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-border bg-muted/30">
        <Btn onClick={() => exec("bold")} title="বোল্ড"><Bold className="h-3.5 w-3.5" /></Btn>
        <Btn onClick={() => exec("italic")} title="ইটালিক"><Italic className="h-3.5 w-3.5" /></Btn>
        <Btn onClick={() => exec("underline")} title="আন্ডারলাইন"><Underline className="h-3.5 w-3.5" /></Btn>
        <span className="w-px h-5 bg-border mx-1" />
        <Btn onClick={() => exec("formatBlock", "<h1>")} title="হেডিং ১"><Heading1 className="h-3.5 w-3.5" /></Btn>
        <Btn onClick={() => exec("formatBlock", "<h2>")} title="হেডিং ২"><Heading2 className="h-3.5 w-3.5" /></Btn>
        <Btn onClick={() => exec("formatBlock", "<p>")} title="প্যারাগ্রাফ"><Type className="h-3.5 w-3.5" /></Btn>
        <span className="w-px h-5 bg-border mx-1" />
        <Btn onClick={() => exec("insertUnorderedList")} title="বুলেট"><List className="h-3.5 w-3.5" /></Btn>
        <Btn onClick={() => exec("insertOrderedList")} title="নম্বর"><ListOrdered className="h-3.5 w-3.5" /></Btn>
        <span className="w-px h-5 bg-border mx-1" />
        <Btn onClick={() => exec("justifyLeft")} title="বাম"><AlignLeft className="h-3.5 w-3.5" /></Btn>
        <Btn onClick={() => exec("justifyCenter")} title="মাঝে"><AlignCenter className="h-3.5 w-3.5" /></Btn>
        <Btn onClick={() => exec("justifyRight")} title="ডান"><AlignRight className="h-3.5 w-3.5" /></Btn>
        <span className="w-px h-5 bg-border mx-1" />
        {/* Text color swatches */}
        <div className="flex items-center gap-0.5" title="টেক্সট রং">
          <span className="text-[10px] text-muted-foreground px-1">A</span>
          {TEXT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec("foreColor", c)}
              className="h-4 w-4 rounded-sm border border-border/60"
              style={{ backgroundColor: c }}
              title={`টেক্সট: ${c}`}
            />
          ))}
        </div>
        <span className="w-px h-5 bg-border mx-1" />
        {/* Highlight swatches */}
        <div className="flex items-center gap-0.5" title="হাইলাইট">
          <span className="text-[10px] text-muted-foreground px-1">H</span>
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec("hiliteColor", c)}
              className="h-4 w-4 rounded-sm border border-border/60"
              style={{ backgroundColor: c }}
              title={`হাইলাইট: ${c}`}
            />
          ))}
        </div>
        <span className="w-px h-5 bg-border mx-1" />
        <Btn onClick={() => exec("removeFormat")} title="ফরম্যাট মুছুন"><RemoveFormatting className="h-3.5 w-3.5" /></Btn>
      </div>
      <div
        ref={ref}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className="px-3 py-2 text-sm text-foreground focus:outline-none prose prose-sm max-w-none
          [&_h1]:text-xl [&_h1]:font-bold [&_h1]:my-2
          [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:my-2
          [&_p]:my-1.5 [&_p]:leading-relaxed
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5
          [&:empty:before]:content-[attr(data-placeholder)] [&:empty:before]:text-muted-foreground"
        style={{ minHeight }}
      />
    </div>
  );
}
