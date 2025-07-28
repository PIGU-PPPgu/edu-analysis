import React, { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface SimpleFileUploaderProps {
  onFileSelected: (file: File) => void;
}

const SimpleFileUploader: React.FC<SimpleFileUploaderProps> = ({
  onFileSelected,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    console.log("[SimpleFileUploader] 按钮点击");
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log("[SimpleFileUploader] 文件选择:", file);
    if (file) {
      onFileSelected(file);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          简单文件上传
        </CardTitle>
      </CardHeader>
      <CardContent>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <Button onClick={handleClick} className="w-full">
          选择文件
        </Button>
        <p className="text-xs text-gray-500 mt-2">
          支持 .xlsx, .xls, .csv 格式
        </p>
      </CardContent>
    </Card>
  );
};

export default SimpleFileUploader;
