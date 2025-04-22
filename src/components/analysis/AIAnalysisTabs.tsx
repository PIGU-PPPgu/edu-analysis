
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIAnalysisOverviewPanel } from "./AIAnalysisOverviewPanel";
import { AIAnalysisInsightsPanel } from "./AIAnalysisInsightsPanel";
import { AIAnalysisRecommendationsPanel } from "./AIAnalysisRecommendationsPanel";

interface Props {
  analysis: {
    overview: string;
    insights: string[];
    recommendations: string[];
  };
  dataCount: number;
}

export const AIAnalysisTabs: React.FC<Props> = ({ analysis, dataCount }) => (
  <Tabs defaultValue="overview" className="w-full">
    <TabsList className="grid grid-cols-3 mb-4">
      <TabsTrigger value="overview">总体分析</TabsTrigger>
      <TabsTrigger value="insights">关键发现</TabsTrigger>
      <TabsTrigger value="recommendations">教学建议</TabsTrigger>
    </TabsList>
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
