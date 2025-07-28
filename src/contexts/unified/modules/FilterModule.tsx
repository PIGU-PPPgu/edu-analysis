/**
 * 🔍 筛选模块 - UnifiedAppContext
 * 基于现有FilterContext的增强版本，提供更丰富的筛选功能
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
} from "react";
import { FilterModuleState, FilterModuleActions } from "../types";

// ==================== 状态和Action类型 ====================

interface FilterModuleContextType
  extends FilterModuleState,
    FilterModuleActions {}

type FilterAction =
  | { type: "SET_MODE"; payload: FilterModuleState["mode"] }
  | { type: "SET_SELECTED_CLASSES"; payload: string[] }
  | { type: "SET_SELECTED_SUBJECTS"; payload: string[] }
  | { type: "SET_SELECTED_EXAM"; payload: string }
  | { type: "SET_SEARCH_TERM"; payload: string }
  | { type: "SET_DATE_RANGE"; payload: [Date, Date] | undefined }
  | { type: "UPDATE_FILTER"; payload: Partial<FilterModuleState> }
  | { type: "RESET_FILTER" }
  | { type: "ADD_CLASS_FILTER"; payload: string }
  | { type: "REMOVE_CLASS_FILTER"; payload: string }
  | { type: "TOGGLE_SUBJECT_FILTER"; payload: string };

// ==================== 初始状态 ====================

const initialState: FilterModuleState = {
  mode: "grade",
  selectedClasses: [],
  selectedSubjects: [],
  selectedExam: "",
  searchTerm: "",
  dateRange: undefined,
  isFiltered: false,
};

// ==================== Reducer ====================

function filterReducer(
  state: FilterModuleState,
  action: FilterAction
): FilterModuleState {
  switch (action.type) {
    case "SET_MODE":
      return { ...state, mode: action.payload };

    case "SET_SELECTED_CLASSES":
      return { ...state, selectedClasses: action.payload };

    case "SET_SELECTED_SUBJECTS":
      return { ...state, selectedSubjects: action.payload };

    case "SET_SELECTED_EXAM":
      return { ...state, selectedExam: action.payload };

    case "SET_SEARCH_TERM":
      return { ...state, searchTerm: action.payload };

    case "SET_DATE_RANGE":
      return { ...state, dateRange: action.payload };

    case "UPDATE_FILTER":
      return { ...state, ...action.payload };

    case "RESET_FILTER":
      return { ...initialState };

    case "ADD_CLASS_FILTER":
      return {
        ...state,
        selectedClasses: state.selectedClasses.includes(action.payload)
          ? state.selectedClasses
          : [...state.selectedClasses, action.payload],
      };

    case "REMOVE_CLASS_FILTER":
      return {
        ...state,
        selectedClasses: state.selectedClasses.filter(
          (cls) => cls !== action.payload
        ),
      };

    case "TOGGLE_SUBJECT_FILTER":
      return {
        ...state,
        selectedSubjects: state.selectedSubjects.includes(action.payload)
          ? state.selectedSubjects.filter((sub) => sub !== action.payload)
          : [...state.selectedSubjects, action.payload],
      };

    default:
      return state;
  }
}

// ==================== Context ====================

const FilterModuleContext = createContext<FilterModuleContextType | undefined>(
  undefined
);

// ==================== Provider ====================

export const FilterModuleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(filterReducer, initialState);

  // ==================== 计算是否已筛选 ====================

  const isFiltered = useMemo(() => {
    return (
      state.mode !== "grade" ||
      state.selectedClasses.length > 0 ||
      state.selectedSubjects.length > 0 ||
      state.selectedExam !== "" ||
      (state.searchTerm && state.searchTerm.trim() !== "") ||
      state.dateRange !== undefined
    );
  }, [state]);

  // ==================== Actions ====================

  const updateFilter = useCallback((newState: Partial<FilterModuleState>) => {
    dispatch({ type: "UPDATE_FILTER", payload: newState });
  }, []);

  const resetFilter = useCallback(() => {
    dispatch({ type: "RESET_FILTER" });
  }, []);

  const setMode = useCallback((mode: FilterModuleState["mode"]) => {
    dispatch({ type: "SET_MODE", payload: mode });
  }, []);

  const addClassFilter = useCallback((className: string) => {
    dispatch({ type: "ADD_CLASS_FILTER", payload: className });
  }, []);

  const removeClassFilter = useCallback((className: string) => {
    dispatch({ type: "REMOVE_CLASS_FILTER", payload: className });
  }, []);

  const toggleSubjectFilter = useCallback((subject: string) => {
    dispatch({ type: "TOGGLE_SUBJECT_FILTER", payload: subject });
  }, []);

  // ==================== Context Value ====================

  const contextValue: FilterModuleContextType = {
    // State
    mode: state.mode,
    selectedClasses: state.selectedClasses,
    selectedSubjects: state.selectedSubjects,
    selectedExam: state.selectedExam,
    searchTerm: state.searchTerm,
    dateRange: state.dateRange,
    isFiltered,

    // Actions
    updateFilter,
    resetFilter,
    setMode,
    addClassFilter,
    removeClassFilter,
    toggleSubjectFilter,
  };

  return (
    <FilterModuleContext.Provider value={contextValue}>
      {children}
    </FilterModuleContext.Provider>
  );
};

// ==================== Hook ====================

export const useFilterModule = (): FilterModuleContextType => {
  const context = useContext(FilterModuleContext);
  if (!context) {
    throw new Error("useFilterModule must be used within FilterModuleProvider");
  }
  return context;
};

// ==================== 筛选工具函数 ====================

export const filterUtils = {
  // 根据筛选状态构建Supabase查询条件
  buildQuery: (filterState: FilterModuleState, baseQuery: any) => {
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
    filterState: FilterModuleState,
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

      // 班级筛选
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
  getFilterDescription: (filterState: FilterModuleState): string => {
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
  isEqual: (state1: FilterModuleState, state2: FilterModuleState): boolean => {
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

  // 导出筛选状态为URL查询参数
  toURLParams: (filterState: FilterModuleState): URLSearchParams => {
    const params = new URLSearchParams();

    if (filterState.mode !== "grade") params.set("mode", filterState.mode);
    if (filterState.selectedClasses.length > 0) {
      params.set("classes", filterState.selectedClasses.join(","));
    }
    if (filterState.selectedSubjects.length > 0) {
      params.set("subjects", filterState.selectedSubjects.join(","));
    }
    if (filterState.selectedExam) params.set("exam", filterState.selectedExam);
    if (filterState.searchTerm) params.set("search", filterState.searchTerm);
    if (filterState.dateRange) {
      const [start, end] = filterState.dateRange;
      params.set("dateStart", start.toISOString());
      params.set("dateEnd", end.toISOString());
    }

    return params;
  },

  // 从URL查询参数导入筛选状态
  fromURLParams: (params: URLSearchParams): Partial<FilterModuleState> => {
    const state: Partial<FilterModuleState> = {};

    const mode = params.get("mode");
    if (mode && ["grade", "single-class", "multi-class"].includes(mode)) {
      state.mode = mode as FilterModuleState["mode"];
    }

    const classes = params.get("classes");
    if (classes) {
      state.selectedClasses = classes.split(",").filter(Boolean);
    }

    const subjects = params.get("subjects");
    if (subjects) {
      state.selectedSubjects = subjects.split(",").filter(Boolean);
    }

    const exam = params.get("exam");
    if (exam) {
      state.selectedExam = exam;
    }

    const search = params.get("search");
    if (search) {
      state.searchTerm = search;
    }

    const dateStart = params.get("dateStart");
    const dateEnd = params.get("dateEnd");
    if (dateStart && dateEnd) {
      try {
        state.dateRange = [new Date(dateStart), new Date(dateEnd)];
      } catch (error) {
        console.warn("Invalid date range in URL params:", {
          dateStart,
          dateEnd,
        });
      }
    }

    return state;
  },
};
