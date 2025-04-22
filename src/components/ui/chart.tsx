
import { cn } from "@/lib/utils";

interface ChartConfig {
  [key: string]: {
    color: string;
  };
}

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config?: ChartConfig;
  children: React.ReactNode;
}

export const ChartContainer = ({
  children,
  config,
  className,
  ...props
}: ChartContainerProps) => {
  return (
    <div
      className={cn(
        "relative w-full rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md",
        className
      )}
      {...props}
    >
      <div className="h-full w-full">
        {children}
      </div>
    </div>
  );
};
