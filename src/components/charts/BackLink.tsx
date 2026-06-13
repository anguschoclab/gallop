import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function BackLink() {
  return (
    <Link
      to="/analytics"
      className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-cream/50 hover:text-cream transition-colors"
    >
      <ArrowLeft className="h-3 w-3" />
      Analytics
    </Link>
  );
}
