import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuthContext } from "@/contexts/AuthContext";
import { Navbar } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import DisplayCards from "@/components/ui/display-cards";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { 
  Users, 
  BarChart3, 
  AlertTriangle, 
  BookOpen, 
  GraduationCap, 
  Settings,
  TrendingUp,
  TrendingDown,
  FileText,
  Brain,
  Sparkles,
  ArrowRight,
  Activity,
  Target,
  Zap,
  Shield,
  Clock,
  CheckCircle,
  Star,
  Play,
  Calendar,
  MessageSquare,
  UserCheck,
  Upload,
  Cpu,
  Bot,
  Lightbulb,
  Network,
  Eye,
  Search,
  Wand2,
  Layers,
  Globe,
  Database
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ModernHomepage = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  
  // 演示数据 - 不需要从数据库获取，用于展示产品功能
  const demoStats = {
    totalStudents: 1250,
    totalClasses: 48,
    totalHomework: 156,
    averageScore: 86.5,
    warningCount: 7,
    aiAnalysisCount: 2847
  };

  // 处理登录/注册按钮点击
  const handleGetStarted = () => {
    if (user) {
      // 如果已登录，跳转到仪表板
      navigate('/dashboard');
    } else {
      // 如果未登录，跳转到登录页面
      navigate('/login');
    }
  };

  // 处理功能模块点击
  const handleFeatureClick = (path: string) => {
    if (user) {
      // 如果已登录，直接跳转到功能页面
      navigate(path);
    } else {
      // 如果未登录，跳转到登录页面
      navigate('/login');
    }
  };

  // AI驱动的核心功能
  const aiFeatures = [
    {
      icon: Brain,
      title: "DeepSeek智能分析引擎",
      description: "基于DeepSeek大模型的深度学习分析",
      path: "/grade-analysis",
      aiModel: "DeepSeek-V3",
      capabilities: [
        "多维度成绩关联分析",
        "学习模式智能识别", 
        "知识图谱构建",
        "个性化推荐算法"
      ],
      stats: "95%准确率",
      bgGradient: "from-slate-50 to-gray-50",
      accentColor: "text-gray-800",
      borderColor: "border-gray-200"
    },
    {
      icon: Target,
      title: "AI预警预测系统",
      description: "基于机器学习的风险预测模型",
      path: "/warning-analysis",
      aiModel: "GPT-4 + DeepSeek",
      capabilities: [
        "行为模式异常检测",
        "成绩趋势预测分析",
        "多因子风险评估",
        "早期干预建议"
      ],
      stats: "提前15天预警",
      bgGradient: "from-[#B9FF66]/10 to-[#B9FF66]/5",
      accentColor: "text-gray-800",
      borderColor: "border-[#B9FF66]/30"
    },
    {
      icon: UserCheck,
      title: "智能学生画像",
      description: "AI驱动的全方位学生特征分析",
      path: "/student-portrait-management", 
      aiModel: "多模型融合",
      capabilities: [
        "学习风格智能识别",
        "兴趣偏好深度挖掘",
        "能力发展轨迹分析",
        "个性化成长建议"
      ],
      stats: "360°全面画像",
      bgGradient: "from-gray-900 to-gray-800",
      accentColor: "text-white",
      borderColor: "border-gray-700"
    },
    {
      icon: Wand2,
      title: "智能作业批改",
      description: "AI辅助的自动批改与评价系统",
      path: "/homework",
      aiModel: "Claude + DeepSeek",
      capabilities: [
        "智能错误识别定位",
        "个性化评语生成",
        "学习建议自动推荐",
        "批改质量一致性保证"
      ],
      stats: "节省80%批改时间",
      bgGradient: "from-slate-50 to-gray-50",
      accentColor: "text-gray-800",
      borderColor: "border-gray-200"
    }
  ];

  // AI技术栈展示
  const aiTechStack = [
    {
      icon: <Brain className="w-6 h-6 text-gray-700" />,
      title: "DeepSeek-V3",
      description: "核心推理引擎",
      detail: "超强推理能力，教育场景深度优化"
    },
    {
      icon: <Bot className="w-6 h-6 text-gray-700" />,
      title: "GPT-4 Turbo", 
      description: "语言理解分析",
      detail: "自然语言处理，学生行为分析"
    },
    {
      icon: <Network className="w-6 h-6 text-[#B9FF66]" />,
      title: "Claude-3.5",
      description: "内容生成助手",
      detail: "报告生成，个性化建议输出"
    },
    {
      icon: <Cpu className="w-6 h-6 text-gray-700" />,
      title: "豆包大模型",
      description: "中文优化处理",
      detail: "教育领域专业知识理解"
    }
  ];

  // AI工作流程
  const aiWorkflow = [
    {
      step: "01",
      title: "数据采集",
      description: "自动收集学习行为数据",
      icon: Database,
      details: "多源数据融合，实时数据流处理"
    },
    {
      step: "02", 
      title: "AI分析",
      description: "多模型协同深度分析",
      icon: Brain,
      details: "DeepSeek推理 + GPT理解 + Claude生成"
    },
    {
      step: "03",
      title: "模式识别",
      description: "智能识别学习模式", 
      icon: Eye,
      details: "行为模式、学习风格、能力特征识别"
    },
    {
      step: "04",
      title: "智能输出",
      description: "生成个性化建议报告",
      icon: Lightbulb,
      details: "可解释AI，actionable insights"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* AI Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* AI风格背景效果 */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gray-200/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#B9FF66]/10 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gray-100/20 rounded-full blur-3xl animate-pulse delay-500" />
          
          {/* AI神经网络风格背景 */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-2 h-2 bg-gray-400 rounded-full animate-ping" />
            <div className="absolute top-40 right-32 w-2 h-2 bg-[#B9FF66] rounded-full animate-ping delay-300" />
            <div className="absolute bottom-32 left-1/3 w-2 h-2 bg-gray-400 rounded-full animate-ping delay-700" />
            <div className="absolute bottom-20 right-20 w-2 h-2 bg-gray-500 rounded-full animate-ping delay-1000" />
          </div>
        </div>

        <div className="container px-4 md:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-5xl mx-auto"
          >
            <Badge className="mb-6 px-6 py-3 bg-[#B9FF66]/10 text-gray-700 border-[#B9FF66]/30">
              <Brain className="w-5 h-5 mr-2" />
              AI驱动的下一代教育平台
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
              让AI重新定义
              <br />
              <span className="text-6xl md:text-8xl text-[#B9FF66]">教育智能化</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
              集成DeepSeek、GPT-4、Claude等顶级AI模型，构建全球领先的教育AI平台
              <br />
              让每一个教学决策都有AI智慧支撑
            </p>

            {/* AI技术栈标签 */}
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <div className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-full shadow-sm">
                <Cpu className="w-5 h-5 text-gray-600" />
                <span className="font-semibold text-gray-700">DeepSeek-V3</span>
              </div>
              <div className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-full shadow-sm">
                <Bot className="w-5 h-5 text-gray-600" />
                <span className="font-semibold text-gray-700">GPT-4 Turbo</span>
              </div>
              <div className="flex items-center gap-2 px-6 py-3 bg-[#B9FF66]/10 border border-[#B9FF66]/30 rounded-full">
                <Network className="w-5 h-5 text-gray-700" />
                <span className="font-semibold text-gray-700">Claude-3.5</span>
              </div>
              <div className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-full shadow-sm">
                <Sparkles className="w-5 h-5 text-gray-600" />
                <span className="font-semibold text-gray-700">豆包大模型</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button 
                size="lg" 
                className="px-8 py-4 text-lg bg-[#B9FF66] text-gray-900 hover:bg-[#A8F055] shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={() => handleFeatureClick('/grade-analysis')}
              >
                <Brain className="w-6 h-6 mr-2" />
                体验AI分析
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="px-8 py-4 text-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-300"
                onClick={() => handleFeatureClick('/student-portrait-management')}
              >
                <Wand2 className="w-6 h-6 mr-2" />
                AI学生画像
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* AI统计展示 */}
      <motion.section 
        className="py-20 bg-gray-50"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <div className="container px-4 md:px-6">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              AI驱动的智能教育数据
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              实时AI分析，智能洞察，让数据成为教学的最强助手
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {[
              { name: "AI分析次数", value: demoStats.aiAnalysisCount, icon: Brain, color: "purple", change: "+127%" },
              { name: "学生总数", value: demoStats.totalStudents, icon: Users, color: "blue", change: "+12%" },
              { name: "智能预警", value: demoStats.warningCount, icon: AlertTriangle, color: "orange", change: "-8%" },
              { name: "班级数量", value: demoStats.totalClasses, icon: GraduationCap, color: "green", change: "+3%" },
              { name: "AI批改", value: demoStats.totalHomework, icon: BookOpen, color: "indigo", change: "+156%" },
              { name: "准确率", value: "95.8%", icon: Target, color: "pink", change: "+2.1%" }
            ].map((stat, index) => (
              <motion.div key={stat.name} variants={itemVariants}>
                <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group">
                  <GlowingEffect
                    spread={40}
                    glow={true}
                    disabled={false}
                    proximity={100}
                    inactiveZone={0.01}
                    borderWidth={2}
                  />
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br from-${stat.color}-100 to-${stat.color}-200 group-hover:scale-110 transition-transform duration-300`}>
                        <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className={`w-4 h-4 text-green-500`} />
                        <span className="text-sm font-semibold text-green-600">
                          {stat.change}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                        {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                      </p>
                      <p className="text-sm text-gray-600 font-medium">{stat.name}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* AI核心功能展示 */}
      <motion.section 
        id="features"
        className="py-20"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <div className="container px-4 md:px-6">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              AI如何重塑教育每个环节
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              从数据分析到个性化推荐，AI深度集成到教学管理的每一个细节
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {aiFeatures.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                className="cursor-pointer"
                onClick={() => handleFeatureClick(feature.path)}
              >
                <Card className={`h-full relative overflow-hidden bg-gradient-to-br ${feature.bgGradient} ${feature.borderColor} border-2 hover:shadow-2xl transition-all duration-500 group`}>
                  <GlowingEffect
                    spread={50}
                    glow={true}
                    disabled={false}
                    proximity={120}
                    inactiveZone={0.01}
                    borderWidth={3}
                  />
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-16 h-16 ${feature.accentColor === 'text-white' ? 'bg-white/20' : 'bg-gray-100'} backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                        <feature.icon className={`w-8 h-8 ${feature.accentColor === 'text-white' ? 'text-white' : 'text-gray-700'}`} />
                      </div>
                      <Badge variant="secondary" className={`${feature.accentColor === 'text-white' ? 'bg-white/20 text-white border-white/30' : 'bg-gray-200 text-gray-700 border-gray-300'}`}>
                        {feature.aiModel}
                      </Badge>
                    </div>
                    <h3 className={`text-2xl font-bold ${feature.accentColor} mb-2`}>
                      {feature.title}
                    </h3>
                    <p className={`${feature.accentColor === 'text-white' ? 'text-white/80' : 'text-gray-600'} text-lg`}>{feature.description}</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3 mb-6">
                      {feature.capabilities.map((capability, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className={`w-2 h-2 ${feature.accentColor === 'text-white' ? 'bg-white/60' : 'bg-gray-400'} rounded-full`} />
                          <span className={`${feature.accentColor === 'text-white' ? 'text-white/90' : 'text-gray-700'} text-sm font-medium`}>{capability}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-center">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-[#B9FF66]" />
                        <span className={`${feature.accentColor} font-semibold`}>{feature.stats}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* AI技术栈展示 */}
      <motion.section 
        id="technology"
        className="py-20 bg-gray-50"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <div className="container px-4 md:px-6">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              顶级AI技术栈
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              集成全球领先的AI大模型，构建最强教育智能化能力
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {aiTechStack.map((tech, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -5 }}
                className="group"
              >
                <Card className="h-full bg-white border-2 border-gray-200 hover:border-[#B9FF66]/30 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#B9FF66]"></div>
                  <CardContent className="p-6">
                    <div className="mb-4 group-hover:scale-110 transition-transform duration-300">
                      {tech.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-gray-900 group-hover:text-gray-700 transition-colors">
                      {tech.title}
                    </h3>
                    <p className="text-gray-600 mb-3 font-medium">{tech.description}</p>
                    <p className="text-sm text-gray-500">{tech.detail}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* AI工作流程 */}
      <motion.section 
        id="workflow"
        className="py-20"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <div className="container px-4 md:px-6">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">AI智能分析流程</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              四步智能化处理，让AI深度理解教育数据
            </p>
          </motion.div>

          <div className="relative">
            {/* 流程连接线 */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#B9FF66] transform -translate-y-1/2 hidden lg:block" />
            
            <div className="grid lg:grid-cols-4 gap-8">
              {aiWorkflow.map((step, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="relative"
                >
                  <Card className="text-center relative overflow-hidden bg-white border-2 border-gray-200 hover:border-[#B9FF66]/30 hover:shadow-xl transition-all duration-300 group">
                    <CardContent className="p-8">
                      <div className="w-20 h-20 bg-[#B9FF66]/10 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 group-hover:scale-110 transition-transform duration-300">
                        <step.icon className="w-10 h-10 text-gray-700" />
                      </div>
                      
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-[#B9FF66] text-gray-900 font-bold text-lg px-3 py-1">
                          {step.step}
                        </Badge>
                      </div>
                      
                      <h3 className="text-xl font-bold mb-3 text-gray-900 group-hover:text-gray-700 transition-colors">
                        {step.title}
                      </h3>
                      <p className="text-gray-600 mb-4">{step.description}</p>
                      <p className="text-sm text-gray-500 font-medium">{step.details}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section 
        className="py-20 bg-gray-900 text-white relative overflow-hidden"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {/* 背景装饰 */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#B9FF66]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        </div>
        
        <div className="container px-4 md:px-6 relative z-10">
          <motion.div variants={itemVariants} className="text-center max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              开启AI教育新时代
            </h2>
            <p className="text-xl md:text-2xl text-gray-300 mb-12">
              让DeepSeek、GPT-4等顶级AI模型为您的教学赋能
              <br />
              体验前所未有的智能化教育管理
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button 
                size="lg" 
                className="px-10 py-4 text-lg bg-[#B9FF66] text-gray-900 hover:bg-[#A8F055] shadow-xl hover:shadow-2xl transition-all duration-300"
                onClick={handleGetStarted}
              >
                <Upload className="w-6 h-6 mr-2" />
                开始使用
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="px-10 py-4 text-lg border-2 border-gray-400 text-gray-300 hover:bg-gray-800 hover:text-white transition-all duration-300"
                onClick={() => handleFeatureClick('/settings')}
              >
                <Settings className="w-6 h-6 mr-2" />
                配置AI模型
              </Button>
            </div>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
};

export default ModernHomepage; 