import { Textarea } from "@/components/ui/textarea";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
};

/**
 * Minimal rich-text editor — for the shop-only build we use a plain textarea
 * and forward its content as HTML (paragraph wrapped). Keeps the existing
 * `value`/`onChange` contract used across product forms.
 */
export function RichTextEditor({ value, onChange, placeholder, minHeight = 120 }: Props) {
  // Strip HTML tags when initializing display value so users see clean text.
  const displayValue = (value || "").replace(/<[^>]+>/g, "");

  return (
    <Textarea
      value={displayValue}
      onChange={(e) => {
        const text = e.target.value;
        // Pass back as a single <p> so existing consumers that expect HTML keep working.
        const html = text ? `<p>${text.replace(/\n/g, "<br/>")}</p>` : "";
        onChange(html);
      }}
      placeholder={placeholder}
      style={{ minHeight }}
      className="resize-y"
    />
  );
}

export default RichTextEditor;
