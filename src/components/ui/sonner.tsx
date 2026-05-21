import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      richColors
      closeButton
      duration={3500}
      toastOptions={{
        classNames: {
          toast:
            "group toast pointer-events-auto relative flex items-center gap-3 rounded-2xl border px-5 py-4 font-medium backdrop-blur-xl " +
            "group-[.toaster]:bg-gradient-to-br group-[.toaster]:from-card/95 group-[.toaster]:to-background/95 " +
            "group-[.toaster]:text-foreground group-[.toaster]:border-border/60 " +
            "group-[.toaster]:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6),0_0_0_1px_hsl(var(--border)/0.5)] " +
            "animate-in fade-in-0 slide-in-from-top-4 zoom-in-95",
          title: "text-sm font-semibold tracking-tight",
          description: "group-[.toast]:text-muted-foreground text-xs",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-full group-[.toast]:px-3 group-[.toast]:py-1.5",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-full",
          closeButton:
            "group-[.toast]:bg-background group-[.toast]:border-border/60 group-[.toast]:text-foreground",
          success:
            "group-[.toaster]:!bg-gradient-to-br group-[.toaster]:!from-red-500/15 group-[.toaster]:!to-background/95 " +
            "group-[.toaster]:!border-red-500/40 group-[.toaster]:!text-red-50 " +
            "group-[.toaster]:!shadow-[0_20px_50px_-12px_hsl(160_84%_39%/0.35),0_0_0_1px_hsl(160_84%_39%/0.3)]",
          error:
            "group-[.toaster]:!bg-gradient-to-br group-[.toaster]:!from-destructive/20 group-[.toaster]:!to-background/95 " +
            "group-[.toaster]:!border-destructive/50 group-[.toaster]:!text-red-50 " +
            "group-[.toaster]:!shadow-[0_20px_50px_-12px_hsl(var(--destructive)/0.5),0_0_0_1px_hsl(var(--destructive)/0.4)]",
          info:
            "group-[.toaster]:!bg-gradient-to-br group-[.toaster]:!from-primary/15 group-[.toaster]:!to-background/95 " +
            "group-[.toaster]:!border-primary/40 group-[.toaster]:!text-foreground " +
            "group-[.toaster]:!shadow-[0_20px_50px_-12px_hsl(var(--primary)/0.4),0_0_0_1px_hsl(var(--primary)/0.3)]",
          warning:
            "group-[.toaster]:!bg-gradient-to-br group-[.toaster]:!from-red-500/15 group-[.toaster]:!to-background/95 " +
            "group-[.toaster]:!border-red-500/40 group-[.toaster]:!text-red-50 " +
            "group-[.toaster]:!shadow-[0_20px_50px_-12px_hsl(38_92%_50%/0.4),0_0_0_1px_hsl(38_92%_50%/0.3)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
