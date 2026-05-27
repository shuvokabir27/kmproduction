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
            "group toast pointer-events-auto relative flex items-center gap-3 rounded-xl border px-4 py-3 font-medium backdrop-blur-xl " +
            "group-[.toaster]:!bg-white/40 group-[.toaster]:!text-slate-900 group-[.toaster]:!border-white/40 " +
            "group-[.toaster]:!shadow-[0_8px_32px_-8px_rgba(15,23,42,0.18)]",
          title: "text-sm font-semibold",
          description: "group-[.toast]:text-slate-600 text-xs",
          actionButton:
            "group-[.toast]:bg-blue-600 group-[.toast]:text-white group-[.toast]:rounded-full group-[.toast]:px-3 group-[.toast]:py-1.5",
          cancelButton:
            "group-[.toast]:bg-white/40 group-[.toast]:text-slate-700 group-[.toast]:rounded-full",
          closeButton:
            "group-[.toast]:!bg-white/60 group-[.toast]:!border-white/50 group-[.toast]:!text-slate-700 group-[.toast]:backdrop-blur-md",
          success:
            "group-[.toaster]:!bg-emerald-50/40 group-[.toaster]:!border-emerald-200/50 group-[.toaster]:!text-emerald-800",
          error:
            "group-[.toaster]:!bg-red-50/40 group-[.toaster]:!border-red-200/50 group-[.toaster]:!text-red-800",
          info:
            "group-[.toaster]:!bg-blue-50/40 group-[.toaster]:!border-blue-200/50 group-[.toaster]:!text-blue-800",
          warning:
            "group-[.toaster]:!bg-amber-50/40 group-[.toaster]:!border-amber-200/50 group-[.toaster]:!text-amber-800",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
