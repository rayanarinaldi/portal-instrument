import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme, type AppTheme } from "@/lib/theme";

const options: { value: AppTheme; label: string; icon: any }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center rounded-full border bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {options.map((option) => {
        const Icon = option.icon;
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            title={option.label}
            aria-label={`Use ${option.label} theme`}
            onClick={() => setTheme(option.value)}
            className={[
              "inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold transition",
              active
                ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
            ].join(" ")}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden lg:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
