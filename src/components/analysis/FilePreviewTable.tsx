
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { standardFields } from './utils/fileParsingUtils';
import { ParsedData } from './types';

interface FilePreviewTableProps {
  parsedPreview: ParsedData;
}

const FilePreviewTable: React.FC<FilePreviewTableProps> = ({ parsedPreview }) => {
  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {parsedPreview.headers.map((header, i) => (
              <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {header}
                <div className="mt-1">
                  {Object.entries(standardFields).map(([key, aliases]) => 
                    aliases.some(alias => header.toLowerCase().includes(alias.toLowerCase())) && (
                      <Badge key={key} variant="outline" className="text-[10px] mr-1" title={`已识别为${key}`}>
                        {key}
                      </Badge>
                    )
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {parsedPreview.data.slice(0, 5).map((row, i) => (
            <tr key={i}>
              {parsedPreview.headers.map((header, j) => (
                <td key={j} className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {String(row[header] !== undefined ? row[header] : '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FilePreviewTable;
