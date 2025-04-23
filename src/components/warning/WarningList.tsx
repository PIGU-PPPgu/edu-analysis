
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Signal, SignalHigh, SignalMedium, SignalLow, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { db } from "@/utils/dbUtils";
import { Input } from "@/components/ui/input";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";

type WarningStudent = {
  student_id: string;
  name: string;
  risk_level: string;
  warning_subjects: string[];
  trend: string;
  last_update: string;
};

const ITEMS_PER_PAGE = 10;

const getRiskIcon = (level: string) => {
  switch (level) {
    case "high":
      return <SignalHigh className="h-4 w-4 text-red-500" />;
    case "medium":
      return <SignalMedium className="h-4 w-4 text-yellow-500" />;
    case "low":
      return <SignalLow className="h-4 w-4 text-blue-500" />;
    default:
      return <Signal className="h-4 w-4" />;
  }
};

const getRiskClass = (level: string) => {
  switch (level) {
    case "high":
      return "text-red-500";
    case "medium":
      return "text-yellow-500";
    case "low":
      return "text-blue-500";
    default:
      return "";
  }
};

const WarningList = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: warningData, isLoading, error } = useQuery({
    queryKey: ['warningStudents'],
    queryFn: async () => {
      const result = await db.getStudentWarnings();
      return result;
    },
  });

  if (error) {
    toast.error("获取预警数据失败");
    return null;
  }

  const warningStudents: WarningStudent[] = warningData || [];
  
  const filteredStudents = warningStudents.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.warning_subjects.some(subject => 
      subject.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
  
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            预警学生列表
          </CardTitle>
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索学生或科目..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">加载中...</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>风险等级</TableHead>
                  <TableHead>学号</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>预警科目</TableHead>
                  <TableHead>趋势</TableHead>
                  <TableHead>最后更新</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStudents.length > 0 ? (
                  paginatedStudents.map((student) => (
                    <TableRow key={student.student_id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getRiskIcon(student.risk_level)}
                          <span className={getRiskClass(student.risk_level)}>
                            {student.risk_level === "high" ? "高风险" : 
                             student.risk_level === "medium" ? "中风险" : "低风险"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{student.student_id}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.warning_subjects.join(", ")}</TableCell>
                      <TableCell>
                        {student.trend === "up" ? "↗️" : 
                         student.trend === "down" ? "↘️" : "→"}
                      </TableCell>
                      <TableCell>{new Date(student.last_update).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/student-profile/${student.student_id}`)}
                        >
                          查看详情
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {searchQuery ? "没有找到匹配的预警学生" : "暂无预警学生数据"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            {filteredStudents.length > ITEMS_PER_PAGE && (
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // 显示当前页附近的页码
                    let pageToShow;
                    if (totalPages <= 5) {
                      pageToShow = i + 1;
                    } else if (currentPage <= 3) {
                      pageToShow = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageToShow = totalPages - 4 + i;
                    } else {
                      pageToShow = currentPage - 2 + i;
                    }
                    
                    return (
                      <PaginationItem key={pageToShow}>
                        <PaginationLink
                          isActive={pageToShow === currentPage}
                          onClick={() => handlePageChange(pageToShow)}
                        >
                          {pageToShow}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WarningList;
