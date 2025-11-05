"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Check,
  Filter,
  GraduationCap,
  Users,
  BookOpen,
  X,
  ChevronDown,
} from "lucide-react";
import { Dispatch, SetStateAction, useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface AnimateChangeInHeightProps {
  children: React.ReactNode;
  className?: string;
}

export const AnimateChangeInHeight: React.FC<AnimateChangeInHeightProps> = ({
  children,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        const observedHeight = entries[0].contentRect.height;
        setHeight(observedHeight);
      });

      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, []);

  return (
    <div
      className={cn(className, "overflow-hidden transition-all duration-200")}
      style={{ height }}
    >
      <div ref={containerRef}>{children}</div>
    </div>
  );
};

export enum GradeFilterType {
  CLASS = "班级",
  SUBJECT = "科目",
  SCORE_RANGE = "分数段",
  EXAM_TYPE = "考试类型",
}

export enum GradeFilterOperator {
  IS = "是",
  IS_NOT = "不是",
  IS_ANY_OF = "任意一个",
  INCLUDE = "包含",
  GREATER_THAN = "大于",
  LESS_THAN = "小于",
  BETWEEN = "介于",
}

export type GradeFilterOption = {
  name: string;
  icon: React.ReactNode | undefined;
  value: string;
  count?: number;
};

export type GradeFilter = {
  id: string;
  type: GradeFilterType;
  operator: GradeFilterOperator;
  value: string[];
};

const FilterIcon = ({ type }: { type: GradeFilterType }) => {
  switch (type) {
    case GradeFilterType.CLASS:
      return <Users className="size-3.5" />;
    case GradeFilterType.SUBJECT:
      return <BookOpen className="size-3.5" />;
    case GradeFilterType.SCORE_RANGE:
      return <GraduationCap className="size-3.5" />;
    case GradeFilterType.EXAM_TYPE:
      return <Filter className="size-3.5" />;
    default:
      return <Filter className="size-3.5" />;
  }
};

const getScoreRangeColor = (range: string) => {
  if (range.includes("90") || range.includes("优秀")) return "bg-green-500";
  if (range.includes("80") || range.includes("良好")) return "bg-blue-500";
  if (range.includes("70") || range.includes("中等")) return "bg-yellow-500";
  if (range.includes("60") || range.includes("及格")) return "bg-orange-500";
  return "bg-red-500";
};

const FilterOperatorDropdown = ({
  filterType,
  operator,
  filterValues,
  setOperator,
}: {
  filterType: GradeFilterType;
  operator: GradeFilterOperator;
  filterValues: string[];
  setOperator: (operator: GradeFilterOperator) => void;
}) => {
  const getOperators = () => {
    if (filterType === GradeFilterType.SCORE_RANGE) {
      return [
        GradeFilterOperator.GREATER_THAN,
        GradeFilterOperator.LESS_THAN,
        GradeFilterOperator.BETWEEN,
      ];
    }
    if (filterValues.length > 1) {
      return [GradeFilterOperator.IS_ANY_OF, GradeFilterOperator.IS_NOT];
    }
    return [GradeFilterOperator.IS, GradeFilterOperator.IS_NOT];
  };

  const operators = getOperators();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="bg-muted hover:bg-muted/80 px-2 py-1 text-xs text-muted-foreground hover:text-primary transition shrink-0 rounded-none border-l border-border">
        {operator}
        <ChevronDown className="ml-1 size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-fit min-w-fit">
        {operators.map((op) => (
          <DropdownMenuItem
            key={op}
            onClick={() => setOperator(op)}
            className="text-xs"
          >
            {op}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const FilterValueCombobox = ({
  filterType,
  filterValues,
  setFilterValues,
  options,
}: {
  filterType: GradeFilterType;
  filterValues: string[];
  setFilterValues: (filterValues: string[]) => void;
  options: GradeFilterOption[];
}) => {
  const [open, setOpen] = useState(false);
  const [commandInput, setCommandInput] = useState("");

  const nonSelectedOptions = options.filter(
    (option) => !filterValues.includes(option.value)
  );

  return (
    <Popover
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
        if (!open) {
          setTimeout(() => setCommandInput(""), 200);
        }
      }}
    >
      <PopoverTrigger className="rounded-none px-2 py-1 bg-muted hover:bg-muted/80 transition text-xs text-muted-foreground hover:text-primary shrink-0 border-l border-border">
        <div className="flex gap-1.5 items-center">
          {filterType === GradeFilterType.SCORE_RANGE &&
            filterValues.length > 0 && (
              <div className="flex items-center -space-x-1">
                {filterValues.slice(0, 3).map((value, index) => (
                  <div
                    key={value}
                    className={cn(
                      "size-2 rounded-full",
                      getScoreRangeColor(value)
                    )}
                  />
                ))}
              </div>
            )}
          {filterValues.length === 1
            ? filterValues[0]
            : filterValues.length > 1
              ? `${filterValues.length} 项已选`
              : "选择..."}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <AnimateChangeInHeight>
          <Command>
            <CommandInput
              placeholder={`搜索${filterType}...`}
              className="h-8 text-xs"
              value={commandInput}
              onValueChange={setCommandInput}
            />
            <CommandList>
              <CommandEmpty>无结果</CommandEmpty>
              {filterValues.length > 0 && (
                <CommandGroup>
                  {filterValues.map((value) => {
                    const option = options.find((opt) => opt.value === value);
                    return (
                      <CommandItem
                        key={value}
                        className="group flex gap-2 items-center text-xs"
                        onSelect={() => {
                          setFilterValues(
                            filterValues.filter((v) => v !== value)
                          );
                          setOpen(false);
                        }}
                      >
                        <Checkbox checked={true} className="size-3" />
                        {option?.icon}
                        {value}
                        {option?.count && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            {option.count}
                          </span>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
              {nonSelectedOptions.length > 0 && (
                <>
                  {filterValues.length > 0 && <CommandSeparator />}
                  <CommandGroup>
                    {nonSelectedOptions.map((option) => (
                      <CommandItem
                        className="group flex gap-2 items-center text-xs"
                        key={option.value}
                        value={option.value}
                        onSelect={(currentValue) => {
                          setFilterValues([...filterValues, currentValue]);
                          setOpen(false);
                        }}
                      >
                        <Checkbox
                          checked={false}
                          className="size-3 opacity-50"
                        />
                        {option.icon}
                        <span className="text-accent-foreground">
                          {option.name}
                        </span>
                        {option.count && (
                          <span className="text-muted-foreground text-xs ml-auto">
                            {option.count}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </AnimateChangeInHeight>
      </PopoverContent>
    </Popover>
  );
};

export default function GradeFilters({
  filters,
  setFilters,
  options,
}: {
  filters: GradeFilter[];
  setFilters: Dispatch<SetStateAction<GradeFilter[]>>;
  options: Record<GradeFilterType, GradeFilterOption[]>;
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {filters
        .filter((filter) => filter.value?.length > 0)
        .map((filter) => (
          <div
            key={filter.id}
            className="flex items-center text-xs border border-border rounded-sm overflow-hidden"
          >
            <div className="flex gap-1.5 shrink-0 bg-muted px-2 py-1 items-center">
              <FilterIcon type={filter.type} />
              <span className="font-medium">{filter.type}</span>
            </div>
            <FilterOperatorDropdown
              filterType={filter.type}
              operator={filter.operator}
              filterValues={filter.value}
              setOperator={(operator) => {
                setFilters((prev) =>
                  prev.map((f) => (f.id === filter.id ? { ...f, operator } : f))
                );
              }}
            />
            <FilterValueCombobox
              filterType={filter.type}
              filterValues={filter.value}
              options={options[filter.type] || []}
              setFilterValues={(filterValues) => {
                setFilters((prev) =>
                  prev.map((f) =>
                    f.id === filter.id ? { ...f, value: filterValues } : f
                  )
                );
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setFilters((prev) => prev.filter((f) => f.id !== filter.id));
              }}
              className="bg-muted hover:bg-muted/80 rounded-none h-6 w-6 text-muted-foreground hover:text-destructive transition shrink-0"
            >
              <X className="size-3" />
            </Button>
          </div>
        ))}
    </div>
  );
}
