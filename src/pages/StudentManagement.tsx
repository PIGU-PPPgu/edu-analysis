import React from "react";
import StudentTable from "@/components/homework/StudentTable";

export default function StudentManagement() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">学生作业管理</h1>
      <StudentTable />
    </div>
  );
}
