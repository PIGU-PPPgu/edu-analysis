import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, ArrowUpDown } from "lucide-react";

interface KnowledgePoint {
  id: string;
  name: string;
  category: string;
  masteryRate: number;
  description?: string;
}

interface SubjectKnowledgePointsProps {
  data: KnowledgePoint[];
  subjectName: string;
}

const SubjectKnowledgePoints: React.FC<SubjectKnowledgePointsProps> = ({ data, subjectName }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof KnowledgePoint;
    direction: "asc" | "desc";
  }>({
    key: "masteryRate",
    direction: "desc",
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">暂无{subjectName}知识点数据</div>
    );
  }

  // 从数据中提取所有类别
  const categories = Array.from(new Set(data.map(point => point.category)));

  // 处理排序
  const sortedData = [...data].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === "asc" ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === "asc" ? 1 : -1;
    }
    return 0;
  });

  // 处理过滤
  const filteredData = sortedData.filter(point => {
    // 搜索过滤
    const searchMatch = point.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       (point.description && point.description.toLowerCase().includes(searchTerm.toLowerCase()));
                       
    // 类别过滤
    const categoryMatch = !selectedCategory || point.category === selectedCategory;
    
    return searchMatch && categoryMatch;
  });

  // 处理排序点击
  const handleSort = (key: keyof KnowledgePoint) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // 获取掌握度对应的颜色
  const getMasteryColor = (rate: number) => {
    if (rate < 30) return "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
    if (rate < 60) return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
    if (rate < 80) return "bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-900/30 dark:text-lime-300 dark:border-lime-800";
    return "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索知识点..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className={!selectedCategory ? "bg-gray-100 dark:bg-gray-800" : ""}
            onClick={() => setSelectedCategory(null)}
          >
            全部
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant="outline"
              size="sm"
              className={selectedCategory === category ? "bg-gray-100 dark:bg-gray-800" : ""}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">
                <div className="flex items-center">
                  知识点
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-1 p-0 h-8 w-8"
                    onClick={() => handleSort("name")}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center">
                  类别
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-1 p-0 h-8 w-8"
                    onClick={() => handleSort("category")}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>
              </TableHead>
              <TableHead className="text-right">
                <div className="flex items-center justify-end">
                  掌握度
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-1 p-0 h-8 w-8"
                    onClick={() => handleSort("masteryRate")}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-4 text-gray-500">
                  暂无匹配的知识点
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((point) => (
                <TableRow key={point.id}>
                  <TableCell>
                    <div className="font-medium">{point.name}</div>
                    {point.description && (
                      <div className="text-xs text-gray-500 mt-1">{point.description}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-gray-50 dark:bg-gray-800">
                      {point.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant="outline" 
                      className={`${getMasteryColor(point.masteryRate)}`}
                    >
                      {point.masteryRate.toFixed(1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="text-xs text-gray-500 text-right">
        共 {filteredData.length} 个知识点
        {filteredData.length !== data.length && ` (已过滤，总计 ${data.length} 个)`}
      </div>
    </div>
  );
};

export default SubjectKnowledgePoints; 