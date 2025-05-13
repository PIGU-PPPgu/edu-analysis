import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PivotTableProps {
  data: any[];
  rowKey: string;
  colKey: string;
  valueKey: string;
  formatFn?: (value: any) => string | number;
}

/**
 * 数据透视表组件，用于多维数据分析
 */
const PivotTable: React.FC<PivotTableProps> = ({ 
  data, 
  rowKey, 
  colKey, 
  valueKey,
  formatFn = (val) => val 
}) => {
  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-gray-500">暂无数据</div>;
  }

  // 提取唯一的行和列值
  const rows = [...new Set(data.map(item => item[rowKey]))].sort();
  const cols = [...new Set(data.map(item => item[colKey]))].sort();

  // 创建数据透视表的数据结构
  const pivotData: Record<string, Record<string, any>> = {};
  
  // 初始化数据结构
  rows.forEach(row => {
    pivotData[row] = {};
    cols.forEach(col => {
      pivotData[row][col] = null;
    });
  });
  
  // 填充数据
  data.forEach(item => {
    const rowVal = item[rowKey];
    const colVal = item[colKey];
    
    // 确保行和列都存在
    if (rows.includes(rowVal) && cols.includes(colVal)) {
      pivotData[rowVal][colVal] = item[valueKey];
    }
  });

  // 计算每列的合计
  const columnTotals: Record<string, number> = {};
  cols.forEach(col => {
    columnTotals[col] = rows.reduce((sum, row) => {
      const val = pivotData[row][col];
      return sum + (typeof val === 'number' ? val : 0);
    }, 0);
  });

  // 计算每行的合计
  const rowTotals: Record<string, number> = {};
  rows.forEach(row => {
    rowTotals[row] = cols.reduce((sum, col) => {
      const val = pivotData[row][col];
      return sum + (typeof val === 'number' ? val : 0);
    }, 0);
  });

  // 计算总计
  const grandTotal = Object.values(rowTotals).reduce((sum, val) => sum + val, 0);

  return (
    <div className="overflow-x-auto border rounded-md">
      <Table className="min-w-full">
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold border-r">{rowKey} / {colKey}</TableHead>
            {cols.map(col => (
              <TableHead key={col} className="text-center font-medium whitespace-nowrap border-r">
                {col}
              </TableHead>
            ))}
            <TableHead className="text-center font-semibold whitespace-nowrap bg-muted/70">合计</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row} className="hover:bg-muted/20">
              <TableCell className="font-medium border-r bg-muted/20">{row}</TableCell>
              {cols.map(col => (
                <TableCell key={col} className="text-center border-r">
                  {pivotData[row][col] !== null ? formatFn(pivotData[row][col]) : '-'}
                </TableCell>
              ))}
              <TableCell className="text-center font-semibold bg-muted/30">
                {formatFn(rowTotals[row])}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted/50 font-semibold">
            <TableCell className="border-r">合计</TableCell>
            {cols.map(col => (
              <TableCell key={col} className="text-center border-r">
                {formatFn(columnTotals[col])}
              </TableCell>
            ))}
            <TableCell className="text-center bg-muted/70">
              {formatFn(grandTotal)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default PivotTable; 