
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AIAnalysisOverviewPanel } from "./AIAnalysisOverviewPanel";
import { AIAnalysisInsightsPanel } from "./AIAnalysisInsightsPanel";
import { AIAnalysisRecommendationsPanel } from "./AIAnalysisRecommendationsPanel";
import { RefreshCw } from "lucide-react";

interface Props {
  analysis: {
    overview: string;
    insights: string[];
    recommendations: string[];
  };
  dataCount: number;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const AIAnalysisTabs: React.FC<Props> = ({ analysis, dataCount, onRetry, isRetrying = false }) => (
  <Tabs defaultValue="overview" className="w-full">
    <div className="flex justify-between items-center mb-4">
      <TabsList className="grid grid-cols-3">
        <TabsTrigger value="overview">总体分析</TabsTrigger>
        <TabsTrigger value="insights">关键发现</TabsTrigger>
        <TabsTrigger value="recommendations">教学建议</TabsTrigger>
      </TabsList>
      
      {onRetry && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRetry} 
          disabled={isRetrying}
          className="text-xs"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
          重新分析
        </Button>
      )}
    </div>
    
    <TabsContent value="overview" className="space-y-4">
      <AIAnalysisOverviewPanel overview={analysis.overview} dataCount={dataCount} />
    </TabsContent>
    <TabsContent value="insights" className="space-y-4">
      <AIAnalysisInsightsPanel insights={analysis.insights} />
    </TabsContent>
    <TabsContent value="recommendations" className="space-y-4">
      <AIAnalysisRecommendationsPanel recommendations={analysis.recommendations} />
    </TabsContent>
  </Tabs>
);
