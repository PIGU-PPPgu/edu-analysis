
import { cn } from "@/lib/utils";
import { Tooltip, TooltipProps } from "recharts";
import { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";

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

// Fixed ChartTooltip component with correct type constraints
export const ChartTooltip = (props: Partial<TooltipProps<ValueType, NameType>>) => {
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
