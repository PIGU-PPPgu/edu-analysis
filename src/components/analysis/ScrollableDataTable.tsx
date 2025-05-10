import React from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface ScrollableDataTableProps {
  data: any[]; // 原始数据数组
  headers: string[]; // 表头数组
  mappings?: Record<string, string>; // 可选的字段映射信息，用于在表头显示
  // visibleDataCount?: number; // 可以用来限制初始显示行数，但这里为了滚动我们将显示全部前5条
}

const ScrollableDataTable: React.FC<ScrollableDataTableProps> = ({
  data,
  headers,
  mappings,
  // visibleDataCount = 5 
}) => {
  const previewData = data.slice(0, 5); // 预览表格通常只显示少量数据

  // 计算一个合理的最小列宽，确保即使内容很少，列也不会过窄
  const minIndividualColWidth = 150; // px
  // 估算表格总宽度，确保内容区可以横向滚动
  // 这里我们为每个表头分配一个基础宽度，再加上一点额外空间
  const estimatedTableWidth = headers.reduce((acc, header) => {
    // 可以根据header内容长度估算更精确的宽度，但简单起见先用固定值
    return acc + Math.max(minIndividualColWidth, header.length * 10 + 40); // header.length * 10 (估算字符宽度) + 40 (padding等)
  }, 0);
  
  // 设置一个最小的总宽度，防止列数少时表格过窄
  const finalTableWidth = Math.max(estimatedTableWidth, headers.length > 0 ? 800 : 0); 

  if (!headers || headers.length === 0) {
    return <p className="text-sm text-gray-500">没有表头信息可供预览。</p>;
  }

  if (!previewData || previewData.length === 0) {
    return <p className="text-sm text-gray-500">没有数据可供预览。</p>;
  }

  return (
    <ScrollArea 
      className="w-full rounded-md border"
      style={{
        width: '100%',
        height: 'auto', // 高度自适应内容，直到 maxHeight
        maxHeight: '400px', // 限制最大高度，超出则内部垂直滚动
        // border: '1px solid var(--border)', // 已通过className实现
        boxSizing: 'border-box'
      }}
    >
      <div style={{ width: `${finalTableWidth}px`, minWidth: '100%' }}>
        <Table className="min-w-full table-fixed"><TableHeader>
            <TableRow>
              {headers.map((header, headerIndex) => {
                const columnWidth = Math.max(minIndividualColWidth, header.length * 10 + 40);
                const isFirstColumn = headerIndex === 0;
                return (
                  <TableHead 
                    key={header} 
                    className={`px-3 py-2 bg-gray-50 sticky top-0 whitespace-nowrap ${isFirstColumn ? 'left-0 z-30' : 'z-20'}`}
                    style={{ width: `${columnWidth}px`}} // 直接为每个表头设置宽度
                  >
                    <div 
                      className="font-medium truncate" // truncate 会在文字溢出时显示省略号
                      title={header} // 完整文字通过 title 显示
                    >
                      {header}
                    </div>
                    {mappings && mappings[header] && (
                      <span className="block text-xs text-gray-400 font-normal truncate" title={mappings[header]}>
                        (映射: {mappings[header]})
                      </span>
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader><TableBody>
            {previewData.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {headers.map((header, colIndex) => {
                  const columnWidth = Math.max(minIndividualColWidth, header.length * 10 + 40);
                  const isFirstColumn = colIndex === 0;
                  return (
                    <TableCell 
                      key={`${rowIndex}-${colIndex}`} 
                      className={`px-3 py-2 align-top ${isFirstColumn ? 'sticky left-0 z-10 bg-white' : ''}`}
                      style={{ width: `${columnWidth}px`}} // 确保单元格宽度与表头一致
                    >
                      <div 
                        className="whitespace-normal break-words" // 单元格内容允许换行
                        title={String(row[header] === undefined || row[header] === null ? '' : row[header])}
                      >
                        {String(row[header] === undefined || row[header] === null ? '-' : row[header])}
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody></Table>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};

export default ScrollableDataTable; 