import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

// 筛选状态接口
export interface FilterState {
  mode: "grade" | "single-class" | "multi-class";
  selectedClasses: string[];
  selectedSubjects: string[];
  selectedExam: string;
  searchTerm?: string;
  dateRange?: [Date, Date];
}

// 筛选上下文接口
interface FilterContextType {
  filterState: FilterState;
  updateFilter: (newState: FilterState) => void;
  resetFilter: () => void;
  isFiltered: boolean;
}

// 默认筛选状态
const defaultFilterState: FilterState = {
  mode: "grade",
  selectedClasses: [],
  selectedSubjects: [],
  selectedExam: "",
  searchTerm: "", // 添加搜索关键词默认值
  dateRange: undefined,
};

// 创建上下文
const FilterContext = createContext<FilterContextType | undefined>(undefined);

// Provider组件属性
interface FilterProviderProps {
  children: ReactNode;
  initialState?: Partial<FilterState>;
}

// Provider组件
export const FilterProvider: React.FC<FilterProviderProps> = ({
  children,
  initialState = {},
}) => {
  const [filterState, setFilterState] = useState<FilterState>({
    ...defaultFilterState,
    ...initialState,
  });

  // 更新筛选状态
  const updateFilter = useCallback((newState: FilterState) => {
    setFilterState(newState);
  }, []);

  // 重置筛选状态
  const resetFilter = useCallback(() => {
    setFilterState(defaultFilterState);
  }, []);

  // 检查是否有筛选条件
  const isFiltered =
    filterState.mode !== "grade" ||
    filterState.selectedClasses.length > 0 ||
    filterState.selectedSubjects.length > 0 ||
    filterState.selectedExam !== "" ||
    (filterState.searchTerm && filterState.searchTerm.trim() !== "") ||
    filterState.dateRange !== undefined;

  const value: FilterContextType = {
    filterState,
    updateFilter,
    resetFilter,
    isFiltered,
  };

  return (
    <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
  );
};

// Hook for using filter context
export const useFilter = (): FilterContextType => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error("useFilter must be used within a FilterProvider");
  }
  return context;
};

// 筛选工具函数
export const filterUtils = {
  // 根据筛选状态构建Supabase查询条件
  buildQuery: (filterState: FilterState, baseQuery: any) => {
    let query = baseQuery;

    // 班级筛选
    if (
      filterState.mode === "single-class" &&
      filterState.selectedClasses.length > 0
    ) {
      query = query.eq("students.class_name", filterState.selectedClasses[0]);
    } else if (
      filterState.mode === "multi-class" &&
      filterState.selectedClasses.length > 0
    ) {
      query = query.in("students.class_name", filterState.selectedClasses);
    }

    // 科目筛选
    if (filterState.selectedSubjects.length > 0) {
      query = query.in("subject", filterState.selectedSubjects);
    }

    // 考试筛选
    if (filterState.selectedExam) {
      query = query.eq("exam_id", filterState.selectedExam);
    }

    // 日期范围筛选
    if (filterState.dateRange) {
      const [startDate, endDate] = filterState.dateRange;
      query = query
        .gte("exam_date", startDate.toISOString())
        .lte("exam_date", endDate.toISOString());
    }

    return query;
  },

  // 过滤内存中的数据
  filterData: <T extends Record<string, any>>(
    data: T[],
    filterState: FilterState,
    options: {
      classField?: string;
      subjectField?: string;
      examField?: string;
      dateField?: string;
    } = {}
  ): T[] => {
    const {
      classField = "class_name",
      subjectField = "subject",
      examField = "exam_id",
      dateField = "exam_date",
    } = options;

    return data.filter((item) => {
      // 搜索词筛选
      if (filterState.searchTerm && filterState.searchTerm.trim() !== "") {
        const searchTerm = filterState.searchTerm.toLowerCase();
        const searchableContent = [
          item.name || item.students?.name || "",
          item.student_id || "",
          item[classField] || item.students?.[classField] || "",
          item[subjectField] || "",
        ]
          .join(" ")
          .toLowerCase();

        if (!searchableContent.includes(searchTerm)) return false;
      }

      // 班级筛选 - 修复：在任何模式下都应该应用班级筛选
      if (filterState.selectedClasses.length > 0) {
        const itemClass = item[classField] || item.students?.[classField];
        if (!filterState.selectedClasses.includes(itemClass)) return false;
      }

      // 科目筛选
      if (filterState.selectedSubjects.length > 0) {
        if (!filterState.selectedSubjects.includes(item[subjectField]))
          return false;
      }

      // 考试筛选
      if (filterState.selectedExam) {
        if (item[examField] !== filterState.selectedExam) return false;
      }

      // 日期范围筛选
      if (filterState.dateRange) {
        const [startDate, endDate] = filterState.dateRange;
        const itemDate = new Date(item[dateField]);
        if (itemDate < startDate || itemDate > endDate) return false;
      }

      return true;
    });
  },

  // 获取筛选状态描述
  getFilterDescription: (filterState: FilterState): string => {
    const parts: string[] = [];

    switch (filterState.mode) {
      case "grade":
        parts.push("全年级");
        break;
      case "single-class":
        if (filterState.selectedClasses.length > 0) {
          parts.push(`班级: ${filterState.selectedClasses[0]}`);
        }
        break;
      case "multi-class":
        if (filterState.selectedClasses.length > 0) {
          parts.push(`班级对比: ${filterState.selectedClasses.join(", ")}`);
        }
        break;
    }

    if (filterState.selectedSubjects.length > 0) {
      parts.push(`科目: ${filterState.selectedSubjects.join(", ")}`);
    }

    if (filterState.searchTerm && filterState.searchTerm.trim() !== "") {
      parts.push(`搜索: "${filterState.searchTerm}"`);
    }

    if (filterState.selectedExam) {
      parts.push(`考试: ${filterState.selectedExam}`);
    }

    if (filterState.dateRange) {
      const [start, end] = filterState.dateRange;
      parts.push(
        `时间: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
      );
    }

    return parts.length > 0 ? parts.join(" | ") : "无筛选条件";
  },

  // 检查两个筛选状态是否相等
  isEqual: (state1: FilterState, state2: FilterState): boolean => {
    return (
      state1.mode === state2.mode &&
      JSON.stringify(state1.selectedClasses.sort()) ===
        JSON.stringify(state2.selectedClasses.sort()) &&
      JSON.stringify(state1.selectedSubjects.sort()) ===
        JSON.stringify(state2.selectedSubjects.sort()) &&
      state1.selectedExam === state2.selectedExam &&
      (state1.searchTerm || "") === (state2.searchTerm || "") &&
      JSON.stringify(state1.dateRange) === JSON.stringify(state2.dateRange)
    );
  },
};

export default FilterContext;
