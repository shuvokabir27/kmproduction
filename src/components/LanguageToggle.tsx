import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export const LanguageToggle = () => {
  const { lang, setLang } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLang(lang === "bn" ? "en" : "bn")}
      className="gap-1.5 text-muted-foreground hover:text-foreground h-8 px-2"
    >
      <Globe className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">{lang === "bn" ? "EN" : "বাং"}</span>
    </Button>
  );
};
