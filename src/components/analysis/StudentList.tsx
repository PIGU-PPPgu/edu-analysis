
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUpDown, Search } from "lucide-react"

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

const StudentList: React.FC<Props> = ({ students }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("averageScore");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

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

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    
    return (
      <ArrowUpDown className={`ml-1 h-4 w-4 inline-block ${sortDirection === "asc" ? "rotate-180" : ""}`} />
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap justify-between items-center">
          <div>
            <CardTitle>学生列表</CardTitle>
            <CardDescription>查看学生详细信息和成绩画像</CardDescription>
          </div>
          <div className="relative mt-2 md:mt-0 w-full md:w-60">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="搜索学生..."
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
              {filteredAndSortedStudents.length > 0 ? (
                filteredAndSortedStudents.map((student, index) => (
                  <TableRow key={index}>
                    <TableCell>{student.studentId}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.className || '-'}</TableCell>
                    <TableCell>{student.averageScore.toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/student-profile/${student.studentId}`)}
                      >
                        查看画像
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
      </CardContent>
    </Card>
  );
};

export default StudentList;
