/**
 * 格式化工具函数集合
 */

/**
 * 确保数字显示为阿拉伯数字而非中文
 * @param value 需要格式化的数值
 * @returns 阿拉伯数字格式的字符串
 */
export const formatNumber = (value: number | string): string => {
  // 如果是数字，直接转为字符串
  if (typeof value === "number") {
    return value.toString();
  }

  // 如果已经是字符串，检查是否为纯数字，如果是则直接返回
  if (/^\d+$/.test(value)) {
    return value;
  }

  // 尝试解析为数字然后转换回字符串（处理可能的中文数字情况）
  const num = parseFloat(value);
  if (!isNaN(num)) {
    return num.toString();
  }

  // 无法处理时返回原始值
  return value;
};

/**
 * 格式化百分比
 * @param value 小数值 (0.xx)
 * @param decimals 保留几位小数
 * @returns 百分比格式字符串
 */
export const formatPercent = (value: number, decimals: number = 1): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * 带千分位的数字格式化
 * @param value 数值
 * @returns 带千分位的数字字符串
 */
export const formatWithCommas = (value: number): string => {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

/**
 * 格式化日期
 * @param date 日期对象或日期字符串
 * @param format 格式化样式
 * @returns 格式化后的日期字符串
 */
export const formatDate = (
  date: Date | string,
  format: string = "YYYY-MM-DD"
): string => {
  const d = new Date(date);

  if (isNaN(d.getTime())) {
    return "无效日期";
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");

  switch (format) {
    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`;
    case "YYYY-MM-DD HH:mm":
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    case "YYYY-MM-DD HH:mm:ss":
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    case "MM-DD":
      return `${month}-${day}`;
    case "MM/DD":
      return `${month}/${day}`;
    case "YYYY/MM/DD":
      return `${year}/${month}/${day}`;
    default:
      return `${year}-${month}-${day}`;
  }
};

/**
 * 🔧 P1修复：安全的数值格式化，处理null/undefined/NaN情况
 * 避免多个组件重复定义相同的工具函数
 */
export const safeToFixed = (value: any, decimals: number = 2): string => {
  if (value == null || value === undefined || isNaN(Number(value))) {
    return "0." + "0".repeat(decimals);
  }
  return Number(value).toFixed(decimals);
};

/**
 * 安全的百分比格式化
 */
export const safePercent = (value: any, decimals: number = 1): string => {
  if (value == null || value === undefined || isNaN(Number(value))) {
    return "-";
  }
  return `${Number(value * 100).toFixed(decimals)}%`;
};

/**
 * 安全的数值显示，null/undefined显示为"-"
 */
export const safeNumber = (value: any, decimals: number = 2): string => {
  if (value == null || value === undefined || isNaN(Number(value))) {
    return "-";
  }
  return Number(value).toFixed(decimals);
};
