
import { cn } from "@/lib/utils";
import { Tooltip, TooltipProps } from "recharts";

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

// Adding the ChartTooltip component with proper generic type parameters
export const ChartTooltip = <TValue, TName>(props: Partial<TooltipProps<TValue, TName>>) => {
  return (
    <Tooltip
      contentStyle={{
        backgroundColor: "hsl(var(--background))",
        borderColor: "hsl(var(--border))",
        borderRadius: "var(--radius)",
      }}
      labelStyle={{
        color: "hsl(var(--foreground))"
      }}
      itemStyle={{
        color: "hsl(var(--foreground))"
      }}
      {...props}
    />
  );
};
