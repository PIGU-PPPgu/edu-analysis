import React from "react";
import { TableIcon, FileInput, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import FilePreviewTable from "./FilePreviewTable";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface DataPreviewProps {
  data: any[];
  headers: string[];
  mappings: Record<string, string>;
  onShowMapping: () => void;
  onReupload: () => void;
  onConfirmImport: () => void;
}

const DataPreview: React.FC<DataPreviewProps> = ({
  data,
  headers,
  mappings,
  onShowMapping,
  onReupload,
  onConfirmImport
}) => {
  // 计算表格宽度，保证内容可以完全显示
  const tableWidth = Math.max(headers.length * 180, 1200);
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium text-lg">预览解析结果</h3>
          <p className="text-sm text-gray-500">
            已预览前 5 条记录，共解析 {data.length} 条记录
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={onShowMapping}
          >
            <TableIcon className="h-4 w-4 mr-2" />
            字段映射
          </Button>
          <Button 
            className="bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
            onClick={onReupload}
          >
            重新上传
          </Button>
        </div>
      </div>
      
      <ScrollArea 
        className="w-full rounded-md"
        style={{
          height: 'auto', 
          maxHeight: '400px',
          border: '1px solid var(--border)', // 使用CSS变量确保与主题一致
          boxSizing: 'border-box' // 确保边框和内边距包含在宽度和高度内
        }}
      >
        <div style={{ width: `${tableWidth}px`, maxWidth: 'none' }}>
          <FilePreviewTable 
            data={data} 
            headers={headers} 
            mappings={mappings}
          />
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      
      <div className="mt-4 flex justify-between items-center">
        <p className="text-sm text-gray-500">
          已预览前 5 条记录，共解析 {data.length} 条记录
        </p>
        
        <Button 
          size="lg"
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={onConfirmImport}
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          确认导入数据
        </Button>
      </div>
    </div>
  );
};

export default DataPreview;
