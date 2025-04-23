
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { 
  Search, 
  Users, 
  ChevronUp, 
  ChevronDown, 
  FileText, 
  LineChart 
} from "lucide-react";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ClassData {
  id: string;
  name: string;
  grade: string;
  studentCount: number;
  avgScore?: number;
}

const ITEMS_PER_PAGE = 10;

const ClassProfilesList: React.FC = () => {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"name" | "grade" | "studentCount">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        
        // 从数据库获取班级数据
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('*')
          .order('name');
        
        if (classesError) throw classesError;
        
        // 获取每个班级的学生数量
        const classesWithCounts = await Promise.all((classesData || []).map(async (classItem: any) => {
          // 获取学生数量
          const { count: studentCount, error: countError } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', classItem.id);
          
          if (countError) {
            console.error('获取班级学生数量失败:', countError);
            return {
              id: classItem.id,
              name: classItem.name,
              grade: classItem.grade,
              studentCount: 0
            };
          }
          
          return {
            id: classItem.id,
            name: classItem.name,
            grade: classItem.grade,
            studentCount: studentCount || 0
          };
        }));
        
        setClasses(classesWithCounts);
      } catch (error) {
        console.error('获取班级数据失败:', error);
        toast.error('获取班级数据失败');
        setClasses([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchClasses();
  }, []);
  
  const handleSort = (field: "name" | "grade" | "studentCount") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  
  const filteredClasses = classes
    .filter(classItem => 
      classItem.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      classItem.grade.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === "grade") {
        comparison = a.grade.localeCompare(b.grade);
      } else if (sortField === "studentCount") {
        comparison = a.studentCount - b.studentCount;
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });
  
  const totalPages = Math.ceil(filteredClasses.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedClasses = filteredClasses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  
  const getSortIcon = (field: "name" | "grade" | "studentCount") => {
    if (sortField !== field) return null;
    
    return sortDirection === "asc" ? 
      <ChevronUp className="ml-1 h-4 w-4 inline" /> : 
      <ChevronDown className="ml-1 h-4 w-4 inline" />;
  };
  
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <CardTitle>班级列表</CardTitle>
            <CardDescription>管理班级信息和查看班级分析</CardDescription>
          </div>
          <div className="relative w-full md:w-60">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="搜索班级..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort("name")}
                >
                  班级名称 {getSortIcon("name")}
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort("grade")}
                >
                  年级 {getSortIcon("grade")}
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort("studentCount")}
                >
                  学生数量 {getSortIcon("studentCount")}
                </TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : paginatedClasses.length > 0 ? (
                paginatedClasses.map((classItem) => (
                  <TableRow key={classItem.id}>
                    <TableCell className="font-medium">{classItem.name}</TableCell>
                    <TableCell>{classItem.grade}</TableCell>
                    <TableCell>{classItem.studentCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/class-management?id=${classItem.id}`}>
                            <LineChart className="h-4 w-4 mr-1" />
                            分析
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/class-management?id=${classItem.id}&tab=students`}>
                            <Users className="h-4 w-4 mr-1" />
                            学生列表
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    {searchQuery ? '没有找到匹配的班级' : '暂无班级数据'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {filteredClasses.length > ITEMS_PER_PAGE && (
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
      </CardContent>
    </Card>
  );
};

export default ClassProfilesList;
