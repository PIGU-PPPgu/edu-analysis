
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StudentList from "@/components/analysis/StudentList";

// Mock student data
const mockStudents = [
  {
    studentId: "2024001",
    name: "张三",
    className: "高二(1)班",
    averageScore: 88.5,
  },
  {
    studentId: "2024002",
    name: "李四",
    className: "高二(1)班",
    averageScore: 92.0,
  },
  {
    studentId: "2024003",
    name: "王五",
    className: "高二(2)班",
    averageScore: 85.5,
  },
  {
    studentId: "2024004",
    name: "赵六",
    className: "高二(2)班",
    averageScore: 90.0,
  }
];

const StudentManagement: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>学生管理</CardTitle>
          </CardHeader>
          <CardContent>
            <StudentList students={mockStudents} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentManagement;
