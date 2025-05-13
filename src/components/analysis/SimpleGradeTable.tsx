import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SearchIcon, ArrowUpDown } from 'lucide-react';

interface SimpleGradeTableProps {
  data: {
    studentId: string;
    name: string;
    className: string;
    subject: string;
    score: number;
    examDate?: string;
    examType?: string;
    examTitle?: string;
    rankInClass?: number;
    rankInGrade?: number;
    grade?: string;
  }[];
}

const SimpleGradeTable: React.FC<SimpleGradeTableProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // 处理排序
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };
  
  // 过滤并排序数据
  const filteredAndSortedData = data
    .filter(item => {
      if (!searchTerm) return true;
      
      const searchString = `${item.studentId} ${item.name} ${item.className} ${item.subject}`.toLowerCase();
      return searchString.includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      const aValue = a[sortColumn as keyof typeof a];
      const bValue = b[sortColumn as keyof typeof b];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      const aString = String(aValue || '').toLowerCase();
      const bString = String(bValue || '').toLowerCase();
      
      return sortDirection === 'asc' 
        ? aString.localeCompare(bString)
        : bString.localeCompare(aString);
    });

  // 获取排序图标样式
  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />;
    }
    
    return sortDirection === 'asc' 
      ? <ArrowUpDown className="ml-2 h-4 w-4 text-black rotate-180" /> 
      : <ArrowUpDown className="ml-2 h-4 w-4 text-black" />;
  };
  
  // 获取分数标签样式
  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 80) return 'bg-blue-100 text-blue-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    if (score >= 60) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
        <Input 
          placeholder="搜索学号、姓名或班级..." 
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="border rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">序号</TableHead>
                <TableHead 
                  className="w-[120px] cursor-pointer"
                  onClick={() => handleSort('studentId')}
                >
                  <div className="flex items-center">
                    学号
                    {getSortIcon('studentId')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    姓名
                    {getSortIcon('name')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('className')}
                >
                  <div className="flex items-center">
                    班级
                    {getSortIcon('className')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('subject')}
                >
                  <div className="flex items-center">
                    科目
                    {getSortIcon('subject')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer text-right"
                  onClick={() => handleSort('score')}
                >
                  <div className="flex items-center justify-end">
                    分数
                    {getSortIcon('score')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.length > 0 ? (
                filteredAndSortedData.map((item, index) => (
                  <TableRow key={`${item.studentId}-${item.subject}-${index}`}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{item.studentId}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.className}</TableCell>
                    <TableCell>{item.subject}</TableCell>
                    <TableCell className="text-right">
                      <Badge className={getScoreBadgeVariant(item.score)}>
                        {item.score}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {searchTerm ? '没有符合搜索条件的记录' : '暂无数据'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <div className="text-sm text-gray-500">
        共 {filteredAndSortedData.length} 条记录
      </div>
    </div>
  );
};

export default SimpleGradeTable; 