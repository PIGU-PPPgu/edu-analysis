
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FilePreviewTableProps {
  data: any[];
  headers: string[];
  mappings: Record<string, string>;
}

const FilePreviewTable: React.FC<FilePreviewTableProps> = ({ data, headers, mappings }) => {
  const previewData = data.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">数据预览</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((header) => (
                  <TableHead key={header}>
                    {header}
                    {mappings[header] && (
                      <span className="block text-xs text-gray-500">
                        映射为: {mappings[header]}
                      </span>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewData.map((row, index) => (
                <TableRow key={index}>
                  {headers.map((header) => (
                    <TableCell key={header}>{row[header]}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default FilePreviewTable;
