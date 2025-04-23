
import React, { useState, useMemo } from "react";
import { Table, TableBody } from "@/components/ui/table";
import SearchBar from "./student/SearchBar";
import StudentTableHeader from "./student/StudentTableHeader";
import StudentTableRow from "./student/StudentTableRow";
import StudentPagination from "./student/StudentPagination";

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

  return (
    <div>
      <SearchBar value={searchQuery} onChange={setSearchQuery} />

      <div className="rounded-md border">
        <Table>
          <StudentTableHeader
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
          <TableBody>
            {paginatedStudents.length > 0 ? (
              paginatedStudents.map((student, index) => (
                <StudentTableRow key={index} student={student} />
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">
                  没有找到匹配的学生数据
                </td>
              </tr>
            )}
          </TableBody>
        </Table>
      </div>

      <StudentPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default StudentList;
