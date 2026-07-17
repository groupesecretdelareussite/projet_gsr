import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "success" | "danger" | "warning" | "neutral";

const variantClasses: Record<Variant, string> = {
  success: "bg-green-100 text-green-700",
  danger: "bg-red-100 text-red-700",
  warning: "bg-orange-100 text-orange-700",
  neutral: "bg-gray-100 text-gray-600",
};

export function Badge({
  variant = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
