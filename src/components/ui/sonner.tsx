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
            "group toast pointer-events-auto relative flex items-center gap-3 rounded-xl border px-4 py-3 font-medium " +
            "group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:border-slate-200 " +
            "group-[.toaster]:shadow-sm",
          title: "text-sm font-semibold",
          description: "group-[.toast]:text-slate-500 text-xs",
          actionButton:
            "group-[.toast]:bg-blue-600 group-[.toast]:text-white group-[.toast]:rounded-full group-[.toast]:px-3 group-[.toast]:py-1.5",
          cancelButton:
            "group-[.toast]:bg-slate-100 group-[.toast]:text-slate-600 group-[.toast]:rounded-full",
          closeButton:
            "group-[.toast]:bg-white group-[.toast]:border-slate-200 group-[.toast]:text-slate-600",
          success:
            "group-[.toaster]:!bg-white group-[.toaster]:!border-emerald-200 group-[.toaster]:!text-emerald-700",
          error:
            "group-[.toaster]:!bg-white group-[.toaster]:!border-red-200 group-[.toaster]:!text-red-700",
          info:
            "group-[.toaster]:!bg-white group-[.toaster]:!border-blue-200 group-[.toaster]:!text-blue-700",
          warning:
            "group-[.toaster]:!bg-white group-[.toaster]:!border-amber-200 group-[.toaster]:!text-amber-700",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
