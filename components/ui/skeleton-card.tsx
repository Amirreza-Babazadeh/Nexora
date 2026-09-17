import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted/70 animate-shimmer relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-linear-to-r before:from-transparent before:via-foreground/5 before:to-transparent",
        className,
      )}
      {...props}
    />
  );
}

export function JobCardSkeleton() {
  return (
    <Card className="flex flex-col justify-between border-border shadow-xs bg-card overflow-hidden">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="w-14 h-5 rounded-full" />
        </div>

        <div className="flex items-center flex-wrap gap-1.5 pt-1">
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-5 w-14 rounded-md" />
          <Skeleton className="h-5 w-24 rounded-md" />
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pb-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </CardContent>

      <CardFooter className="pt-2 border-t border-border/60 flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </CardFooter>
    </Card>
  );
}

export function DashboardKpiSkeleton() {
  return (
    <Card className="border-border shadow-xs bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>
      <div className="flex items-baseline justify-between pt-1">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-6 w-14 rounded-md" />
      </div>
      <Skeleton className="h-3 w-32" />
    </Card>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-border/60">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-3 sm:p-4">
          <Skeleton className="h-4 w-full max-w-30" />
        </td>
      ))}
    </tr>
  );
}
