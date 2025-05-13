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
  if (typeof value === 'number') {
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