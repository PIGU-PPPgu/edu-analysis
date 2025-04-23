
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ParsedData } from './types';

interface TextDataImporterProps {
  onDataImported: (data: ParsedData) => void;
  isAIEnhanced: boolean;
}

const TextDataImporter: React.FC<TextDataImporterProps> = ({ onDataImported, isAIEnhanced }) => {
  const [textData, setTextData] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextData(e.target.value);
  };

  const parseTextData = () => {
    if (!textData.trim()) {
      toast.error("数据为空", {
        description: "请粘贴或输入数据"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // 移除额外的空白行
      const lines = textData.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length < 2) {
        toast.error("数据不足", {
          description: "至少需要包含标题行和一行数据"
        });
        setIsProcessing(false);
        return;
      }

      // 检测分隔符：制表符、逗号或分号
      const firstLine = lines[0];
      let separator = '\t'; // 默认假设是制表符分隔（常见的复制粘贴情况）
      
      if (firstLine.includes(',') && !firstLine.includes('\t')) {
        separator = ',';
      } else if (firstLine.includes(';') && !firstLine.includes(',') && !firstLine.includes('\t')) {
        separator = ';';
      }

      // 解析表头
      const headers = firstLine.split(separator).map(h => h.trim());
      
      // 检测是否有空白表头
      if (headers.some(h => !h)) {
        toast.error("表头有空白列", {
          description: "请确保所有列都有标题"
        });
        setIsProcessing(false);
        return;
      }

      // 解析数据行
      const data = lines.slice(1).map(line => {
        const values = line.split(separator);
        const obj: Record<string, any> = {};
        
        headers.forEach((header, index) => {
          const value = values[index]?.trim() || '';
          
          // 简单类型检测和转换
          if (!isNaN(Number(value)) && value !== '') {
            obj[header] = Number(value);
          } else {
            obj[header] = value;
          }
        });
        
        return obj;
      });

      const parsedData: ParsedData = {
        headers,
        data,
        detectedFormat: 'text',
        confidence: 0.8,
        fieldMappings: {}
      };

      onDataImported(parsedData);
      
      toast.success("数据解析成功", {
        description: `已解析 ${data.length} 条记录`
      });
    } catch (error) {
      console.error("解析文本数据失败:", error);
      toast.error("数据解析失败", {
        description: error instanceof Error ? error.message : "未知错误"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Textarea 
        value={textData}
        onChange={handleTextChange}
        placeholder="粘贴数据，每行一条记录，字段之间用制表符、逗号或分号分隔..."
        className="h-40 p-3 resize-none font-mono text-sm"
      />
      
      <div className="space-y-2">
        <Button 
          onClick={parseTextData}
          className="w-full bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
          disabled={isProcessing || !textData.trim()}
        >
          {isProcessing ? "解析中..." : "解析数据"}
        </Button>
        
        <div className="text-xs text-gray-500">
          <p>支持从Excel、表格或其他来源复制粘贴的数据</p>
          <p>第一行需要包含列标题，后续每行为一条数据记录</p>
          <p>支持制表符、逗号、分号分隔的数据格式</p>
        </div>
      </div>
    </div>
  );
};

export default TextDataImporter;
