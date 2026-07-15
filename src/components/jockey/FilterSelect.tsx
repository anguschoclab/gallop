import { useId } from "react";
import { cn } from "@/lib/cn";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

export function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="text-[9px] uppercase font-black text-blue-400/40 tracking-widest px-1"
      >
        {label}
      </label>
      <select
        id={id}
        className="w-full h-9 bg-slate-950/60 border border-white/5 text-[10px] font-bold uppercase rounded-none tracking-widest text-cream px-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
