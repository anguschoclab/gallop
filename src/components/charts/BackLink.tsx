import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

interface BackLinkProps {
  to: string;
  label: string;
  className?: string;
  search?: Record<string, unknown>;
}

export function BackLink({ to, label, className, search }: BackLinkProps) {
  return (
    <Link
      to={to}
      search={search}
      className={`inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-cream/50 hover:text-cream transition-colors ${className ?? ""}`}
    >
      <ArrowLeft className="h-3 w-3" />
      {label}
    </Link>
  );
}
