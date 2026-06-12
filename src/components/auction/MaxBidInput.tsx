import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

interface MaxBidInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSet: boolean;
  setLabel?: string;
  resetLabel?: string;
  placeholder?: string;
  inputClassName?: string;
  buttonClassName?: string;
}

export function MaxBidInput({
  value,
  onChange,
  onSubmit,
  isSet,
  setLabel = "Set Max",
  resetLabel = "Reset",
  placeholder = "Limit...",
  inputClassName = "",
  buttonClassName = "",
}: MaxBidInputProps) {
  return (
    <div className="flex gap-2">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        className={cn(
          "h-10 bg-slate-950 border-white/5 text-xs font-mono uppercase tracking-tighter focus-visible:ring-gold/30 rounded-none",
          isSet && "border-gold/50 text-gold",
          inputClassName,
        )}
      />
      <Button
        variant={isSet ? "default" : "outline"}
        className={`h-10 px-4 border-white/10 uppercase text-[9px] font-black tracking-widest rounded-none hover:bg-gold/5 ${buttonClassName}`}
        onClick={onSubmit}
      >
        {isSet ? resetLabel : setLabel}
      </Button>
    </div>
  );
}
