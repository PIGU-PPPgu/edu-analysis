import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/unified/modules/AuthModule";
import { Navbar } from "@/components/shared";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  Database,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Footer from "@/components/landing/Footer";

const ModernHomepage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // 演示数据 - 不需要从数据库获取，用于展示产品功能
  const demoStats = {
    totalStudents: 1250,
    totalClasses: 48,
    totalHomework: 156,
    averageScore: 86.5,
    warningCount: 7,
    aiAnalysisCount: 2847,
  };

  // 处理登录/注册按钮点击
  const handleGetStarted = () => {
    navigate("/dashboard");
  };

  // 处理功能模块点击
  const handleFeatureClick = (path: string) => {
    navigate(path);
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
        "个性化推荐算法",
      ],
      stats: "95%准确率",
      bgGradient: "from-slate-50 to-gray-50",
      accentColor: "text-gray-800",
      borderColor: "border-gray-200",
    },
    {
      icon: Target,
      title: "AI预警预测系统",
      description: "基于机器学习的风险预测模型",
      path: "/warning-analysis",
      aiModel: "智能模型 + DeepSeek",
      capabilities: [
        "行为模式异常检测",
        "成绩趋势预测分析",
        "多因子风险评估",
        "早期干预建议",
      ],
      stats: "提前15天预警",
      bgGradient: "from-[#B9FF66]/10 to-[#B9FF66]/5",
      accentColor: "text-gray-800",
      borderColor: "border-[#B9FF66]/30",
    },
    {
      icon: UserCheck,
      title: "智能学生画像",
      description: "AI驱动的全方位学生特征分析",
      path: "/class-management",
      aiModel: "多模型融合",
      capabilities: [
        "学习风格智能识别",
        "兴趣偏好深度挖掘",
        "能力发展轨迹分析",
        "个性化成长建议",
      ],
      stats: "360°全面画像",
      bgGradient: "from-gray-900 to-gray-800",
      accentColor: "text-white",
      borderColor: "border-gray-700",
    },
    {
      icon: Wand2,
      title: "智能作业批改",
      description: "AI辅助的自动批改与评价系统",
      path: "/homework",
      aiModel: "对话助手 + DeepSeek",
      capabilities: [
        "智能错误识别定位",
        "个性化评语生成",
        "学习建议自动推荐",
        "批改质量一致性保证",
      ],
      stats: "节省80%批改时间",
      bgGradient: "from-slate-50 to-gray-50",
      accentColor: "text-gray-800",
      borderColor: "border-gray-200",
    },
  ];

  // AI技术栈展示
  const aiTechStack = [
    {
      icon: <Brain className="w-6 h-6 text-gray-700" />,
      title: "DeepSeek-V3",
      description: "核心推理引擎",
      detail: "超强推理能力，教育场景深度优化",
    },
    {
      icon: <Bot className="w-6 h-6 text-gray-700" />,
      title: "智能模型-增强版",
      description: "语言理解分析",
      detail: "自然语言处理，学生行为分析",
    },
    {
      icon: <Network className="w-6 h-6 text-[#B9FF66]" />,
      title: "对话助手-专业版",
      description: "内容生成助手",
      detail: "报告生成，个性化建议输出",
    },
    {
      icon: <Cpu className="w-6 h-6 text-gray-700" />,
      title: "豆包大模型",
      description: "中文优化处理",
      detail: "教育领域专业知识理解",
    },
  ];

  // AI工作流程
  const aiWorkflow = [
    {
      step: "01",
      title: "数据采集",
      description: "自动收集学习行为数据",
      icon: Database,
      details: "多源数据融合，实时数据流处理",
    },
    {
      step: "02",
      title: "AI分析",
      description: "多模型协同深度分析",
      icon: Brain,
      details: "DeepSeek推理 + 智能理解 + 对话生成",
    },
    {
      step: "03",
      title: "模式识别",
      description: "智能识别学习模式",
      icon: Eye,
      details: "行为模式、学习风格、能力特征识别",
    },
    {
      step: "04",
      title: "智能输出",
      description: "生成个性化建议报告",
      icon: Lightbulb,
      details: "可解释AI，actionable insights",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section - Positivus Style */}
      <section className="relative bg-white pt-16 pb-24 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#B9FF66] rounded-full opacity-10" />
          <div className="absolute top-1/2 -left-20 w-32 h-32 bg-black rounded-full opacity-5" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <div className="inline-block">
                <Badge className="px-4 py-2 bg-[#B9FF66] text-black font-medium rounded-full border-2 border-black">
                  AI驱动的教育平台
                </Badge>
              </div>

              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-black leading-tight">
                让AI重新定义
                <span className="block text-[#B9FF66] bg-black px-4 py-2 mt-2 inline-block transform -rotate-1">
                  教育智能化
                </span>
              </h1>

              <p className="text-lg md:text-xl text-gray-700 leading-relaxed max-w-lg">
                集成DeepSeek、豆包、通义等国内智能大模型，为教师提供多维度的智能化教学分析
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="px-8 py-4 bg-[#B9FF66] text-black font-bold border-2 border-black rounded-xl hover:bg-[#A8F055] hover:translate-y-[-2px] transition-all duration-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  onClick={() => handleFeatureClick("/grade-analysis")}
                >
                  体验AI分析
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8 py-4 bg-white text-black font-bold border-2 border-black rounded-xl hover:bg-gray-100 hover:translate-y-[-2px] transition-all duration-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  onClick={() => handleFeatureClick("/class-management")}
                >
                  查看功能
                </Button>
              </div>
            </motion.div>

            {/* Right Visual */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-[#B9FF66] to-[#A8F055] rounded-3xl p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform rotate-2">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    {
                      icon: Brain,
                      label: "所有界面配置AI，帮助教师理解数据",
                      value: "AI辅助分析",
                    },
                    {
                      icon: Users,
                      label: "从个人到小组再到班级，全面了解学生情况，动态更新",
                      value: "班级画像",
                    },
                    {
                      icon: Target,
                      label: "机器学习算法+AI，实时预警，精准预测",
                      value: "智能追踪与预警",
                    },
                    {
                      icon: BookOpen,
                      label: "知识点掌握、作业情况",
                      value: "作业与考试管理",
                    },
                  ].map((stat, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-2xl p-4 border-2 border-black text-center"
                    >
                      <stat.icon className="w-8 h-8 mx-auto mb-2 text-black" />
                      <div className="font-bold text-2xl text-black">
                        {stat.value}
                      </div>
                      <div className="text-sm text-gray-600">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section - Positivus Style */}
      <motion.section
        className="py-16 bg-black"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <div className="container mx-auto px-4">
          <motion.div variants={itemVariants} className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black mb-4 text-white">
              平台数据一览
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              AI驱动的智能教育数据分析
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { name: "AI分析", value: "2.8K+", icon: Brain },
              { name: "学生总数", value: "1.2K+", icon: Users },
              { name: "智能预警", value: "7", icon: AlertTriangle },
              { name: "班级数量", value: "48", icon: GraduationCap },
              { name: "AI批改", value: "156", icon: BookOpen },
              { name: "准确率", value: "95.8%", icon: Target },
            ].map((stat, index) => (
              <motion.div
                key={stat.name}
                variants={itemVariants}
                className="group"
              >
                <div className="bg-white rounded-2xl p-6 border-3 border-[#B9FF66] hover:border-white transition-all duration-300 hover:translate-y-[-4px] shadow-[4px_4px_0px_0px_rgba(185,255,102,1)] hover:shadow-[8px_8px_0px_0px_rgba(185,255,102,1)]">
                  <div className="text-center space-y-3">
                    <div className="w-12 h-12 bg-[#B9FF66] rounded-full flex items-center justify-center mx-auto border-2 border-black">
                      <stat.icon className="w-6 h-6 text-black" />
                    </div>
                    <div className="text-2xl font-black text-black">
                      {stat.value}
                    </div>
                    <div className="text-sm font-medium text-gray-600">
                      {stat.name}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Services Section - Positivus Style */}
      <motion.section
        id="features"
        className="py-16 bg-white"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <div className="container mx-auto px-4">
          <motion.div variants={itemVariants} className="text-center mb-12">
            <div className="inline-block mb-4">
              <Badge className="px-6 py-3 bg-[#B9FF66] text-black font-bold rounded-full border-2 border-black">
                我们的服务
              </Badge>
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-black">
              AI如何重塑教育每个环节
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              从数据分析到个性化推荐，AI深度集成到教学管理的每一个细节
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {aiFeatures.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -8 }}
                className="cursor-pointer group"
                onClick={() => handleFeatureClick(feature.path)}
              >
                <div
                  className={`h-full bg-white rounded-3xl p-8 border-3 border-black hover:border-[#B9FF66] transition-all duration-300 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(185,255,102,1)] ${index % 2 === 0 ? "bg-[#B9FF66]" : "bg-white"}`}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div
                      className={`w-16 h-16 ${index % 2 === 0 ? "bg-black" : "bg-[#B9FF66]"} rounded-2xl flex items-center justify-center border-2 border-black`}
                    >
                      <feature.icon
                        className={`w-8 h-8 ${index % 2 === 0 ? "text-white" : "text-black"}`}
                      />
                    </div>
                    <Badge
                      className={`${index % 2 === 0 ? "bg-black text-white" : "bg-black text-white"} border-2 border-black font-bold`}
                    >
                      {feature.aiModel}
                    </Badge>
                  </div>

                  <h3
                    className={`text-2xl font-black mb-4 ${index % 2 === 0 ? "text-black" : "text-black"}`}
                  >
                    {feature.title}
                  </h3>

                  <p
                    className={`text-lg mb-6 ${index % 2 === 0 ? "text-black/80" : "text-gray-600"}`}
                  >
                    {feature.description}
                  </p>

                  <div className="space-y-3 mb-6">
                    {feature.capabilities.map((capability, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 ${index % 2 === 0 ? "bg-black" : "bg-[#B9FF66]"} rounded-full border border-black`}
                        />
                        <span
                          className={`font-medium ${index % 2 === 0 ? "text-black" : "text-gray-700"}`}
                        >
                          {capability}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target
                        className={`w-5 h-5 ${index % 2 === 0 ? "text-black" : "text-[#B9FF66]"}`}
                      />
                      <span
                        className={`font-bold ${index % 2 === 0 ? "text-black" : "text-black"}`}
                      >
                        {feature.stats}
                      </span>
                    </div>
                    <ArrowRight
                      className={`w-6 h-6 ${index % 2 === 0 ? "text-black" : "text-black"} group-hover:translate-x-2 transition-transform`}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Technology Stack - Positivus Style */}
      <motion.section
        id="technology"
        className="py-16 bg-[#B9FF66]"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <div className="container mx-auto px-4">
          <motion.div variants={itemVariants} className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-black">
              顶级AI技术栈
            </h2>
            <p className="text-lg text-black/80 max-w-2xl mx-auto">
              集成全球领先的AI大模型，构建最强教育智能化能力
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {aiTechStack.map((tech, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -6 }}
                className="group"
              >
                <div className="h-full bg-black rounded-2xl p-6 border-3 border-black hover:border-white transition-all duration-300 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
                  <div className="mb-6 group-hover:scale-110 transition-transform duration-300">
                    <div className="w-12 h-12 bg-[#B9FF66] rounded-xl flex items-center justify-center border-2 border-white">
                      {React.cloneElement(tech.icon, {
                        className: "w-6 h-6 text-black",
                      })}
                    </div>
                  </div>
                  <h3 className="text-xl font-black mb-3 text-white">
                    {tech.title}
                  </h3>
                  <p className="text-[#B9FF66] mb-3 font-bold text-sm">
                    {tech.description}
                  </p>
                  <p className="text-white/80 text-sm leading-relaxed">
                    {tech.detail}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Workflow Process - Positivus Style */}
      <motion.section
        id="workflow"
        className="py-16 bg-white"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <div className="container mx-auto px-4">
          <motion.div variants={itemVariants} className="text-center mb-12">
            <div className="inline-block mb-4">
              <Badge className="px-6 py-3 bg-[#B9FF66] text-black font-bold rounded-full border-2 border-black">
                工作流程
              </Badge>
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-black">
              AI智能分析流程
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              四步智能化处理，让AI深度理解教育数据
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {aiWorkflow.map((step, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="relative group"
              >
                <div className="bg-white rounded-2xl p-6 border-3 border-black hover:border-[#B9FF66] transition-all duration-300 hover:translate-y-[-4px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(185,255,102,1)]">
                  <div className="text-center space-y-4">
                    {/* Step Number */}
                    <div className="w-16 h-16 bg-[#B9FF66] rounded-2xl flex items-center justify-center mx-auto border-2 border-black group-hover:scale-110 transition-transform duration-300">
                      <span className="text-2xl font-black text-black">
                        {step.step}
                      </span>
                    </div>

                    {/* Icon */}
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mx-auto">
                      <step.icon className="w-6 h-6 text-white" />
                    </div>

                    <h3 className="text-xl font-black text-black">
                      {step.title}
                    </h3>

                    <p className="text-gray-600 font-medium">
                      {step.description}
                    </p>

                    <p className="text-sm text-gray-500 leading-relaxed">
                      {step.details}
                    </p>
                  </div>
                </div>

                {/* Connection Arrow (except for last item) */}
                {index < aiWorkflow.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-[#B9FF66]" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Case Studies Section - Positivus Style */}
      <motion.section
        className="py-16 bg-white"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <div className="container mx-auto px-4">
          <motion.div variants={itemVariants} className="text-center mb-12">
            <div className="inline-block mb-4">
              <Badge className="px-6 py-3 bg-[#B9FF66] text-black font-bold rounded-full border-2 border-black">
                应用案例
              </Badge>
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-black">
              AI如何变革教育实践
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              真实案例展示AI技术在教育管理中的具体应用效果
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "智能成绩分析",
                description: "AI自动识别学生薄弱环节，生成个性化学习建议",
                result: "学习效率提升35%",
                icon: BarChart3,
                bgColor: "bg-[#B9FF66]",
                details:
                  "通过DeepSeek模型分析历史成绩数据，识别学习模式，预测学习趋势",
              },
              {
                title: "预警系统应用",
                description: "提前15天识别学习风险，及时干预",
                result: "风险事件减少68%",
                icon: AlertTriangle,
                bgColor: "bg-black",
                details:
                  "多维度数据融合分析，智能识别异常行为模式和学习困难征象",
              },
              {
                title: "个性化推荐",
                description: "AI驱动的学习资源智能匹配",
                result: "学生满意度92%",
                icon: Target,
                bgColor: "bg-white",
                details: "基于学习风格和能力特征，推荐最适合的学习路径和资源",
              },
            ].map((caseStudy, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -6 }}
                className="group"
              >
                <div
                  className={`${caseStudy.bgColor} ${caseStudy.bgColor === "bg-black" ? "text-white" : "text-black"} rounded-2xl p-8 border-3 border-black hover:border-[#B9FF66] transition-all duration-300 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(185,255,102,1)]`}
                >
                  <div className="space-y-6">
                    <div
                      className={`w-16 h-16 ${caseStudy.bgColor === "bg-black" ? "bg-[#B9FF66]" : caseStudy.bgColor === "bg-[#B9FF66]" ? "bg-black" : "bg-black"} rounded-2xl flex items-center justify-center border-2 ${caseStudy.bgColor === "bg-black" ? "border-white" : "border-black"}`}
                    >
                      <caseStudy.icon
                        className={`w-8 h-8 ${caseStudy.bgColor === "bg-black" ? "text-black" : "text-white"}`}
                      />
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-2xl font-black">{caseStudy.title}</h3>
                      <p
                        className={`font-medium ${caseStudy.bgColor === "bg-black" ? "text-white/90" : "text-black/80"}`}
                      >
                        {caseStudy.description}
                      </p>
                      <p className="text-sm leading-relaxed opacity-80">
                        {caseStudy.details}
                      </p>
                    </div>

                    <div
                      className={`inline-block px-4 py-2 ${caseStudy.bgColor === "bg-black" ? "bg-[#B9FF66] text-black" : "bg-black text-white"} rounded-full font-bold text-sm border-2 border-black`}
                    >
                      {caseStudy.result}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* AI Analysis Deep Dive Section */}
      <motion.section
        className="py-16 bg-[#B9FF66]"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <div className="container mx-auto px-4">
          <motion.div variants={itemVariants} className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-black">
              AI分析引擎深度解析
            </h2>
            <p className="text-lg text-black/80 max-w-2xl mx-auto">
              了解我们的AI如何处理和分析教育数据
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Analysis Features */}
            <motion.div variants={itemVariants} className="space-y-8">
              {[
                {
                  title: "多维度数据融合",
                  description:
                    "整合成绩、作业、行为等多源数据，构建完整学生画像",
                  features: [
                    "成绩趋势分析",
                    "学习行为跟踪",
                    "互动参与度评估",
                    "知识掌握图谱",
                  ],
                },
                {
                  title: "智能模式识别",
                  description: "AI自动识别学习模式和风险因子，提供预测性洞察",
                  features: [
                    "学习风格识别",
                    "困难点预测",
                    "进步轨迹分析",
                    "潜力挖掘",
                  ],
                },
                {
                  title: "个性化推荐算法",
                  description: "基于AI分析结果，生成定制化教学建议和学习方案",
                  features: [
                    "学习路径规划",
                    "资源智能匹配",
                    "难度自适应",
                    "效果反馈优化",
                  ],
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="bg-black rounded-2xl p-6 border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                >
                  <h3 className="text-xl font-black text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-[#B9FF66] mb-4 font-medium">
                    {feature.description}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {feature.features.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#B9FF66] rounded-full" />
                        <span className="text-white/80 text-sm font-medium">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Right - Visual Analysis Demo */}
            <motion.div variants={itemVariants} className="space-y-6">
              <div className="bg-black rounded-3xl p-8 border-4 border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="text-2xl font-black text-white mb-6 text-center">
                  实时分析演示
                </h3>

                {/* Analysis Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {[
                    { label: "数据处理速度", value: "< 2秒", icon: Zap },
                    { label: "分析准确率", value: "95.8%", icon: Target },
                    { label: "预测精度", value: "89.2%", icon: Brain },
                    { label: "响应时间", value: "实时", icon: Clock },
                  ].map((metric, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-xl p-4 border-2 border-[#B9FF66] text-center"
                    >
                      <metric.icon className="w-6 h-6 mx-auto mb-2 text-black" />
                      <div className="font-black text-2xl text-black">
                        {metric.value}
                      </div>
                      <div className="text-sm text-gray-600 font-medium">
                        {metric.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Processing Steps */}
                <div className="space-y-3">
                  {[
                    "✓ 数据收集完成 - 1,250 学生记录",
                    "✓ AI模型分析中 - DeepSeek处理",
                    "✓ 模式识别完成 - 发现3个关键洞察",
                    "⚡ 生成个性化报告...",
                  ].map((step, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 text-[#B9FF66] font-medium"
                    >
                      <div className="text-sm">{step}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* CTA Section - Positivus Style */}
      <motion.section
        className="py-16 bg-black relative overflow-hidden"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-10 right-10 w-32 h-32 bg-[#B9FF66] rounded-full opacity-20" />
          <div className="absolute bottom-10 left-10 w-24 h-24 bg-white rounded-full opacity-10" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div variants={itemVariants} className="max-w-4xl mx-auto">
            <div className="bg-[#B9FF66] rounded-3xl p-12 border-4 border-white shadow-[12px_12px_0px_0px_rgba(255,255,255,1)] transform -rotate-1">
              <div className="text-center space-y-8">
                <h2 className="text-3xl md:text-6xl font-black text-black leading-tight">
                  准备开启
                  <span className="block">AI教育新时代？</span>
                </h2>

                <p className="text-lg md:text-xl text-black/80 max-w-2xl mx-auto leading-relaxed">
                  让DeepSeek、智能大模型等顶级AI技术为您的教学赋能，体验前所未有的智能化教育管理
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button
                    size="lg"
                    className="px-10 py-4 text-lg bg-black text-white font-bold border-2 border-black rounded-xl hover:bg-gray-800 hover:translate-y-[-2px] transition-all duration-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    onClick={handleGetStarted}
                  >
                    立即开始
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="px-10 py-4 text-lg bg-white text-black font-bold border-2 border-black rounded-xl hover:bg-gray-100 hover:translate-y-[-2px] transition-all duration-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    onClick={() => handleFeatureClick("/ai-settings")}
                  >
                    了解更多
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ModernHomepage;
