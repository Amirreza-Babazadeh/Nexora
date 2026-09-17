import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onActionClick?: () => void;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onActionClick,
  secondaryActionLabel,
  secondaryActionHref,
  className,
}: EmptyStateProps) {
  return (
    <Card
      className={cn(
        "p-8 sm:p-14 text-center flex flex-col items-center justify-center gap-4 bg-card border-border shadow-xs my-4",
        className
      )}
    >
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-2xl sm:text-3xl shadow-xs">
        <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
      </div>

      <div className="max-w-md space-y-1.5">
        <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {actionLabel && actionHref && (
            <Link href={actionHref}>
              <Button size="sm" className="font-bold text-xs gap-2 cursor-pointer shadow-xs">
                {actionLabel}
              </Button>
            </Link>
          )}

          {actionLabel && onActionClick && !actionHref && (
            <Button
              size="sm"
              onClick={onActionClick}
              className="font-bold text-xs gap-2 cursor-pointer shadow-xs"
            >
              {actionLabel}
            </Button>
          )}

          {secondaryActionLabel && secondaryActionHref && (
            <Link href={secondaryActionHref}>
              <Button
                variant="outline"
                size="sm"
                className="font-semibold text-xs gap-1.5 cursor-pointer"
              >
                {secondaryActionLabel}
              </Button>
            </Link>
          )}
        </div>
      )}
    </Card>
  );
}
