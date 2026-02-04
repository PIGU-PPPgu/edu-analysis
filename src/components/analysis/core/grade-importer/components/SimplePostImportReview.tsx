import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SimplePostImportReviewProps {
  headers: string[];
  sampleData: any[];
  currentMapping: Record<string, string>;
  onConfirmAndProceed: () => void;
  onReimport: () => void;
}

const SimplePostImportReview: React.FC<SimplePostImportReviewProps> = ({
  headers,
  sampleData,
  currentMapping,
  onConfirmAndProceed,
  onReimport,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>导入后检查</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-sm font-medium mb-2">字段映射</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {headers.map((header) => (
              <div
                key={header}
                className="flex items-center justify-between rounded border px-2 py-1"
              >
                <span className="text-muted-foreground">{header}</span>
                <span className="font-medium">
                  {currentMapping[header] || "未映射"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {sampleData.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">样例数据</div>
            <ScrollArea className="h-40 rounded border">
              <div className="p-2 text-xs space-y-1">
                {sampleData.slice(0, 5).map((row, index) => (
                  <pre key={index} className="whitespace-pre-wrap">
                    {JSON.stringify(row, null, 2)}
                  </pre>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onReimport}>
            重新导入
          </Button>
          <Button onClick={onConfirmAndProceed}>确认并继续</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimplePostImportReview;
