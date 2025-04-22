
import React from "react";
import { TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import FilePreviewTable from "./FilePreviewTable";

interface DataPreviewProps {
  data: any[];
  headers: string[];
  mappings: Record<string, string>;
  onShowMapping: () => void;
  onReupload: () => void;
}

const DataPreview: React.FC<DataPreviewProps> = ({
  data,
  headers,
  mappings,
  onShowMapping,
  onReupload
}) => {
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
      
      <FilePreviewTable 
        data={data} 
        headers={headers} 
        mappings={mappings}
      />
      
      <div className="mt-4 text-sm text-gray-500">
        <p>已预览前 5 条记录，共解析 {data.length} 条记录</p>
      </div>
    </div>
  );
};

export default DataPreview;
