
import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { UserCircle, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface StudentTableRowProps {
  student: {
    studentId: string;
    name: string;
    className?: string;
    averageScore: number;
  };
}

const StudentTableRow: React.FC<StudentTableRowProps> = ({ student }) => {
  const navigate = useNavigate();

  return (
    <TableRow>
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
  );
};

export default StudentTableRow;
