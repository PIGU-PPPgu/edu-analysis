
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUpDown, Search, UserCircle, AlertTriangle } from "lucide-react";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";

interface StudentData {
  studentId: string;
  name: string;
  className?: string;
  averageScore: number;
}

interface Props {
  students: StudentData[];
}

type SortField = "name" | "studentId" | "className" | "averageScore";
type SortDirection = "asc" | "desc";

const ITEMS_PER_PAGE = 10;

const StudentList: React.FC<Props> = ({ students }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("averageScore");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedStudents = useMemo(() => {
    return students
      .filter(student => 
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (student.className && student.className.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .sort((a, b) => {
        let comparison = 0;
        
        if (sortField === "averageScore") {
          comparison = a.averageScore - b.averageScore;
        } else if (sortField === "name") {
          comparison = a.name.localeCompare(b.name);
        } else if (sortField === "studentId") {
          comparison = a.studentId.localeCompare(b.studentId);
        } else if (sortField === "className" && a.className && b.className) {
          comparison = a.className.localeCompare(b.className);
        }
        
        return sortDirection === "desc" ? -comparison : comparison;
      });
  }, [students, searchQuery, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedStudents.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedStudents = filteredAndSortedStudents.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    
    return (
      <ArrowUpDown className={`ml-1 h-4 w-4 inline-block ${sortDirection === "asc" ? "rotate-180" : ""}`} />
    );
  };

  return (
    <div>
      <div className="relative mb-4 w-full md:w-60">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <Input
          placeholder="搜索学生..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer"
                onClick={() => handleSort("studentId")}
              >
                学号 {getSortIcon("studentId")}
              </TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => handleSort("name")}
              >
                姓名 {getSortIcon("name")}
              </TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => handleSort("className")}
              >
                班级 {getSortIcon("className")}
              </TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => handleSort("averageScore")}
              >
                平均分 {getSortIcon("averageScore")}
              </TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedStudents.length > 0 ? (
              paginatedStudents.map((student, index) => (
                <TableRow key={index}>
                  <TableCell>{student.studentId}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.className || '-'}</TableCell>
                  <TableCell>{student.averageScore.toFixed(1)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/warning-analysis/${student.studentId}`)}
                      className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      预警分析
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/student-profile/${student.studentId}`)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <UserCircle className="h-4 w-4 mr-1" />
                      学生画像
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  没有找到匹配的学生数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {filteredAndSortedStudents.length > ITEMS_PER_PAGE && (
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
    </div>
  );
};

export default StudentList;
