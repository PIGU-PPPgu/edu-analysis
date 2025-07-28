import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, FileText, BarChart, Plus } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { KnowledgePoint } from "./AIKnowledgePointAnalyzer";
import AIKnowledgePointAnalyzer from "./AIKnowledgePointAnalyzer";
import { getAllKnowledgePoints } from "@/services/knowledgePointService";

interface KnowledgePointAnalysisProps {
  homeworkId: string;
  submissions: any[]; // Assuming submission type
  knowledgePoints: KnowledgePoint[];
  onKnowledgePointsUpdated: (knowledgePoints: KnowledgePoint[]) => void;
}

const KnowledgePointAnalysis: React.FC<KnowledgePointAnalysisProps> = ({
  homeworkId,
  submissions = [],
  knowledgePoints = [],
  onKnowledgePointsUpdated,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [localKnowledgePoints, setLocalKnowledgePoints] = useState<
    KnowledgePoint[]
  >([]);

  useEffect(() => {
    const loadKnowledgePoints = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch knowledge points for this homework
        const points = await getAllKnowledgePoints(); // Fixed: removed the parameter
        setLocalKnowledgePoints(points);
        onKnowledgePointsUpdated(points);
      } catch (err) {
        console.error("Failed to load knowledge points:", err);
        setError("加载知识点失败，请稍后再试");
      } finally {
        setIsLoading(false);
      }
    };

    loadKnowledgePoints();
  }, [homeworkId, onKnowledgePointsUpdated]);

  useEffect(() => {
    // Update local state when props change
    if (knowledgePoints && knowledgePoints.length > 0) {
      setLocalKnowledgePoints(knowledgePoints);
    }
  }, [knowledgePoints]);

  const handleSaveKnowledgePoints = (points: KnowledgePoint[]) => {
    setLocalKnowledgePoints(points);
    onKnowledgePointsUpdated(points);
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart className="mr-2 h-5 w-5" />
            知识点分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">加载中...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart className="mr-2 h-5 w-5" />
            知识点分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>错误</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <BarChart className="mr-2 h-5 w-5" />
          知识点分析
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAnalyzer(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          添加知识点
        </Button>
      </CardHeader>
      <CardContent>
        {localKnowledgePoints.length > 0 ? (
          <div className="grid gap-4">
            {localKnowledgePoints.map((point) => (
              <div key={point.id} className="border rounded-md p-3 bg-gray-50">
                <div className="flex items-start">
                  <FileText className="h-5 w-5 mr-2 mt-0.5 text-gray-500" />
                  <div>
                    <h4 className="font-medium">{point.name}</h4>
                    {point.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {point.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p>尚未定义知识点，请添加知识点进行分析</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowAnalyzer(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              添加知识点
            </Button>
          </div>
        )}

        {submissions.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-3">提交情况分析</h3>
            <div className="text-center text-muted-foreground py-4">
              知识点掌握情况分析功能开发中...
            </div>
          </div>
        )}

        {showAnalyzer && (
          <AIKnowledgePointAnalyzer
            homeworkId={homeworkId}
            existingKnowledgePoints={localKnowledgePoints}
            onSaveKnowledgePoints={handleSaveKnowledgePoints}
            onClose={() => setShowAnalyzer(false)}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default KnowledgePointAnalysis;
