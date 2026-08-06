import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BidInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  buttonLabel?: string;
  inputClassName?: string;
  buttonClassName?: string;
}

export function BidInput({
  id,
  value,
  onChange,
  onSubmit,
  placeholder = "Amount...",
  buttonLabel = "Bid",
  inputClassName = "",
  buttonClassName = "",
}: BidInputProps) {
  return (
    <div className="flex gap-2">
      <Input
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        className={inputClassName}
      />
      <Button
        variant="outline"
        className={`h-10 px-4 uppercase text-[9px] font-black tracking-widest ${buttonClassName}`}
        onClick={onSubmit}
      >
        {buttonLabel}
      </Button>
    </div>
  );
}
