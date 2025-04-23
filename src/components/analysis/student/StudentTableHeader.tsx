
import React from "react";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown } from "lucide-react";

type SortField = "name" | "studentId" | "className" | "averageScore";

interface StudentTableHeaderProps {
  sortField: SortField;
  sortDirection: "asc" | "desc";
  onSort: (field: SortField) => void;
}

const StudentTableHeader: React.FC<StudentTableHeaderProps> = ({
  sortField,
  sortDirection,
  onSort,
}) => {
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return (
      <ArrowUpDown className={`ml-1 h-4 w-4 inline-block ${sortDirection === "asc" ? "rotate-180" : ""}`} />
    );
  };

  return (
    <TableHeader>
      <TableRow>
        <TableHead 
          className="cursor-pointer"
          onClick={() => onSort("studentId")}
        >
          学号 {getSortIcon("studentId")}
        </TableHead>
        <TableHead 
          className="cursor-pointer"
          onClick={() => onSort("name")}
        >
          姓名 {getSortIcon("name")}
        </TableHead>
        <TableHead 
          className="cursor-pointer"
          onClick={() => onSort("className")}
        >
          班级 {getSortIcon("className")}
        </TableHead>
        <TableHead 
          className="cursor-pointer"
          onClick={() => onSort("averageScore")}
        >
          平均分 {getSortIcon("averageScore")}
        </TableHead>
        <TableHead className="text-right">操作</TableHead>
      </TableRow>
    </TableHeader>
  );
};

export default StudentTableHeader;
