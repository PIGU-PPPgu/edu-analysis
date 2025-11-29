/**
 * 简单的 Markdown 渲染工具
 * 支持 **加粗** 和基本格式
 */

import React from "react";

/**
 * 渲染简单的 markdown 文本
 * 支持：
 * - **加粗文本**
 * - *斜体文本*
 * - ⚠️ emoji
 */
export function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  // 分割文本，保留markdown标记
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  let partIndex = 0;

  // 匹配 **加粗** 和 *斜体*
  const boldRegex = /\*\*(.+?)\*\*/g;
  const italicRegex = /\*(.+?)\*/g;

  // 先处理加粗
  let match;
  const processedBold = text.replace(boldRegex, (match, content) => {
    return `<bold>${content}</bold>`;
  });

  // 再处理斜体（跳过已经处理的加粗）
  const processedItalic = processedBold.replace(
    /\*(.+?)\*/g,
    (match, content) => {
      // 如果是在<bold>标签内，跳过
      if (match.includes("<bold>")) return match;
      return `<italic>${content}</italic>`;
    }
  );

  // 分割并渲染
  const segments = processedItalic.split(
    /(<bold>|<\/bold>|<italic>|<\/italic>)/g
  );
  let isBold = false;
  let isItalic = false;

  segments.forEach((segment, index) => {
    if (segment === "<bold>") {
      isBold = true;
    } else if (segment === "</bold>") {
      isBold = false;
    } else if (segment === "<italic>") {
      isItalic = true;
    } else if (segment === "</italic>") {
      isItalic = false;
    } else if (segment) {
      if (isBold) {
        parts.push(
          <strong key={`bold-${index}`} className="font-bold text-[#191A23]">
            {segment}
          </strong>
        );
      } else if (isItalic) {
        parts.push(
          <em key={`italic-${index}`} className="italic">
            {segment}
          </em>
        );
      } else {
        parts.push(<span key={`text-${index}`}>{segment}</span>);
      }
    }
  });

  return <>{parts}</>;
}

/**
 * Markdown段落组件
 */
export const MarkdownParagraph: React.FC<{ children: string }> = ({
  children,
}) => {
  return (
    <p className="text-base leading-relaxed text-gray-700">
      {renderMarkdown(children)}
    </p>
  );
};

/**
 * Markdown列表项组件
 */
export const MarkdownListItem: React.FC<{ children: string }> = ({
  children,
}) => {
  return (
    <li className="text-sm leading-relaxed text-gray-700">
      {renderMarkdown(children)}
    </li>
  );
};
