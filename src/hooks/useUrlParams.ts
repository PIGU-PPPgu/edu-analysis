import { useEffect, useState } from "react";

export interface UrlParams {
  exam?: string;
  date?: string;
  from?: string;
  student?: string;
  class?: string;
  severity?: string;
}

/**
 * Hook for parsing and managing URL parameters
 */
export const useUrlParams = () => {
  const [params, setParams] = useState<UrlParams>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const parseUrlParams = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const parsedParams: UrlParams = {};

        // 解析各种参数
        const exam = urlParams.get("exam");
        if (exam) parsedParams.exam = decodeURIComponent(exam);

        const date = urlParams.get("date");
        if (date) parsedParams.date = date;

        const from = urlParams.get("from");
        if (from) parsedParams.from = from;

        const student = urlParams.get("student");
        if (student) parsedParams.student = decodeURIComponent(student);

        const classParam = urlParams.get("class");
        if (classParam) parsedParams.class = decodeURIComponent(classParam);

        const severity = urlParams.get("severity");
        if (severity) parsedParams.severity = severity;

        setParams(parsedParams);
      } catch (error) {
        console.error("解析URL参数失败:", error);
        setParams({});
      } finally {
        setIsLoading(false);
      }
    };

    parseUrlParams();

    // 监听URL变化
    const handlePopState = () => {
      parseUrlParams();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const updateUrlParams = (newParams: Partial<UrlParams>, replace = false) => {
    try {
      const currentUrl = new URL(window.location.href);
      const searchParams = new URLSearchParams(currentUrl.search);

      // 更新参数
      Object.entries(newParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.set(key, encodeURIComponent(String(value)));
        } else {
          searchParams.delete(key);
        }
      });

      const newUrl = `${currentUrl.pathname}${
        searchParams.toString() ? `?${searchParams.toString()}` : ""
      }`;

      if (replace) {
        window.history.replaceState({}, "", newUrl);
      } else {
        window.history.pushState({}, "", newUrl);
      }

      setParams((prev) => ({ ...prev, ...newParams }));
    } catch (error) {
      console.error("更新URL参数失败:", error);
    }
  };

  const clearParams = () => {
    const currentUrl = new URL(window.location.href);
    const newUrl = currentUrl.pathname;
    window.history.replaceState({}, "", newUrl);
    setParams({});
  };

  const hasParam = (key: keyof UrlParams) => {
    return params[key] !== undefined && params[key] !== null && params[key] !== "";
  };

  return {
    params,
    isLoading,
    updateUrlParams,
    clearParams,
    hasParam,
    // 便捷方法
    isFromAnomalyDetection: params.from === "anomaly-detection",
    hasExamFilter: hasParam("exam"),
    hasDateFilter: hasParam("date"),
  };
};