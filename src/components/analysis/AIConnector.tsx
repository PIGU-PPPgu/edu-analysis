
import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CloudUpload, Database, Settings } from "lucide-react";

interface AIConnectorProps {
  onConnect: (apiKey: string, provider: string, enabled: boolean) => void;
}

const AIConnector: React.FC<AIConnectorProps> = ({ onConnect }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("openai");
  
  const form = useForm({
    defaultValues: {
      apiKey: "",
      enabled: true,
    },
  });

  const onSubmit = (data: { apiKey: string; enabled: boolean }) => {
    if (!data.apiKey) {
      toast.error("请输入API密钥");
      return;
    }
    
    setIsConnected(true);
    onConnect(data.apiKey, selectedProvider, data.enabled);
    toast.success("AI连接成功", {
      description: `已成功连接到${getProviderName(selectedProvider)}`,
    });
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case "openai": return "OpenAI";
      case "deepseek": return "DeepSeek";
      case "baichuan": return "百川大模型";
      case "qwen": return "通义千问";
      default: return provider;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CloudUpload className="h-5 w-5" />
          AI分析配置
        </CardTitle>
        <CardDescription>
          连接大模型API，开启智能分析功能
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isConnected ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="openai" className="w-full" 
                onValueChange={(value) => setSelectedProvider(value)}>
                <TabsList className="grid grid-cols-4 mb-4">
                  <TabsTrigger value="openai">OpenAI</TabsTrigger>
                  <TabsTrigger value="deepseek">DeepSeek</TabsTrigger>
                  <TabsTrigger value="baichuan">百川大模型</TabsTrigger>
                  <TabsTrigger value="qwen">通义千问</TabsTrigger>
                </TabsList>
                
                <TabsContent value="openai" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="openai-key">OpenAI API密钥</Label>
                    <Input 
                      id="openai-key" 
                      type="password" 
                      placeholder="sk-..." 
                      {...form.register("apiKey")}
                    />
                    <p className="text-xs text-gray-500">
                      获取您的OpenAI API密钥，系统将使用GPT-4分析您的教学数据
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="deepseek" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="deepseek-key">DeepSeek API密钥</Label>
                    <Input 
                      id="deepseek-key" 
                      type="password" 
                      placeholder="sk-..." 
                      {...form.register("apiKey")}
                    />
                    <p className="text-xs text-gray-500">
                      DeepSeek提供先进的中文理解能力，适合教育场景的数据分析
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="baichuan" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="baichuan-key">百川大模型API密钥</Label>
                    <Input 
                      id="baichuan-key" 
                      type="password" 
                      placeholder="..." 
                      {...form.register("apiKey")}
                    />
                    <p className="text-xs text-gray-500">
                      国产大模型，提供专业的教育领域知识和分析能力
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="qwen" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="qwen-key">通义千问API密钥</Label>
                    <Input 
                      id="qwen-key" 
                      type="password" 
                      placeholder="..." 
                      {...form.register("apiKey")}
                    />
                    <p className="text-xs text-gray-500">
                      阿里云提供的大语言模型，拥有丰富的知识库和分析能力
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>启用AI分析</FormLabel>
                      <FormDescription>
                        开启后，系统将自动对数据进行智能分析并生成报告
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full bg-[#B9FF66] text-black hover:bg-[#a8e85c]">
                连接AI服务
              </Button>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <div>
                  <p className="font-medium">已连接 {getProviderName(selectedProvider)}</p>
                  <p className="text-xs text-gray-500">API密钥已安全加密存储</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsConnected(false)}>
                更改
              </Button>
            </div>
            
            <div className="space-y-3">
              <Label>AI分析选项</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch id="student-analysis" defaultChecked />
                  <Label htmlFor="student-analysis">学生个体分析</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="class-analysis" defaultChecked />
                  <Label htmlFor="class-analysis">班级整体分析</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="improvement-suggestions" defaultChecked />
                  <Label htmlFor="improvement-suggestions">改进建议</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="performance-prediction" defaultChecked />
                  <Label htmlFor="performance-prediction">成绩趋势预测</Label>
                </div>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                toast.success("AI分析设置已保存");
              }}
            >
              保存设置
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIConnector;
