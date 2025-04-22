
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Search, User } from "lucide-react";

interface ClassStudentsListProps {
  classId: string;
  className: string;
  studentCount: number;
}

const ClassStudentsList: React.FC<ClassStudentsListProps> = ({ 
  classId,
  className,
  studentCount
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"name" | "averageScore">("averageScore");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  // 空数组替代模拟数据
  const students = [];
  
  const filteredStudents = students
    .filter(student => 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      student.studentId.includes(searchQuery)
    )
    .sort((a, b) => {
      if (sortField === "name") {
        return sortDirection === "asc" 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else {
        return sortDirection === "asc"
          ? a.averageScore - b.averageScore
          : b.averageScore - a.averageScore;
      }
    });
  
  const handleSort = (field: "name" | "averageScore") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{className}学生列表</CardTitle>
        <CardDescription>班级共有 {studentCount} 名学生</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索学生姓名或学号..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">学号</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                  <div className="flex items-center">
                    姓名
                    {sortField === "name" && (
                      sortDirection === "asc" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("averageScore")}>
                  <div className="flex items-center">
                    平均分
                    {sortField === "averageScore" && (
                      sortDirection === "asc" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead>趋势</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.studentId}>
                  <TableCell className="font-medium">{student.studentId}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>
                    <span className={student.averageScore >= 85 ? "text-green-600 font-medium" : ""}>
                      {student.averageScore}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={
                      student.trend > 0 
                        ? "text-green-600" 
                        : student.trend < 0 
                          ? "text-red-600" 
                          : ""
                    }>
                      {student.trend > 0 ? `+${student.trend}` : student.trend}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/student-profile/${student.studentId}`}>
                        <User className="h-4 w-4 mr-1" />
                        查看
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {filteredStudents.length === 0 && (
          <div className="flex justify-center items-center h-24 text-muted-foreground">
            暂无学生数据
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" asChild>
          <Link to="/student-management">查看所有学生</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ClassStudentsList;
