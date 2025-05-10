import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface FilePreviewTableProps {
  data: any[];
  headers: string[];
  mappings: Record<string, string>;
}

const FilePreviewTable: React.FC<FilePreviewTableProps> = ({ data, headers, mappings }) => {
  const previewData = data.slice(0, 5);
  
  // 计算每列的宽度 - 更合理的列宽分配
  const baseColumnWidth = 180; // 基础列宽

  return (
    <Table className="w-full">
            <TableHeader>
              <TableRow>
          {headers.map((header) => {
            // 根据header内容长度动态调整列宽
            const headerLength = header.length;
            const columnWidth = Math.max(baseColumnWidth, headerLength * 12);
            
            const cellStyle = {
              width: `${columnWidth}px`, 
              minWidth: `${columnWidth}px`,
              maxWidth: `${columnWidth}px`,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              backgroundColor: '#f9fafb' // bg-gray-50的等效颜色
            };
            
            return (
              <TableHead 
                key={header} 
                className="px-2 py-3"
                style={cellStyle}
              >
                <div className="font-medium whitespace-normal break-words">{header}</div>
                    {mappings[header] && (
                  <span className="block text-xs text-gray-500 mt-1">
                        映射为: {mappings[header]}
                      </span>
                    )}
                  </TableHead>
            );
          })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewData.map((row, index) => (
                <TableRow key={index}>
            {headers.map((header) => {
              // 保持与表头相同的计算方式
              const headerLength = header.length;
              const columnWidth = Math.max(baseColumnWidth, headerLength * 12);
              
              const cellStyle = {
                width: `${columnWidth}px`, 
                minWidth: `${columnWidth}px`,
                maxWidth: `${columnWidth}px`,
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              };
              
              return (
                <TableCell 
                  key={header} 
                  className="px-2 py-3 align-top"
                  style={cellStyle}
                >
                  <div 
                    className="whitespace-normal break-words" 
                    title={row[header]}
                    style={{
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {row[header]}
                  </div>
                </TableCell>
              );
            })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
  );
};

export default FilePreviewTable;
