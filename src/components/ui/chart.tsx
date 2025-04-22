
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

export const ChartContainer = React.memo(({
  children,
  config,
  className,
  ...props
}: ChartContainerProps) => {
  return (
    <div
      className={cn(
        "relative w-full rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md animate-fade-in",
        className
      )}
      {...props}
    >
      <div className="h-full w-full">
        {children}
      </div>
    </div>
  );
});

ChartContainer.displayName = "ChartContainer";

export const ChartTooltip = (props: Partial<TooltipProps<ValueType, NameType>>) => {
  return (
    <Tooltip
      contentStyle={{
        backgroundColor: "hsl(var(--background))",
        borderColor: "hsl(var(--border))",
        borderRadius: "var(--radius)",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        padding: "8px 12px",
      }}
      labelStyle={{
        color: "hsl(var(--foreground))",
        fontWeight: "500",
        marginBottom: "4px"
      }}
      itemStyle={{
        color: "hsl(var(--foreground))",
        padding: "2px 0"
      }}
      wrapperStyle={{
        outline: "none"
      }}
      {...props}
    />
  );
};
