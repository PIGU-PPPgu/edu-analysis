"use client";

import * as React from "react";
import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Brain,
  BarChart3,
  AlertTriangle,
  FileText,
  Users,
  TrendingUp,
  Target,
  Zap,
  Shield,
  Clock,
  CheckCircle,
  ArrowRight,
  Star,
  ChevronRight,
  Play,
  BookOpen,
  GraduationCap,
  UserCheck,
  Upload,
  Calendar,
  MessageSquare,
} from "lucide-react";

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  benefits: string[];
}

interface UseCaseProps {
  title: string;
  description: string;
  icon: React.ElementType;
  steps: string[];
}

interface TestimonialProps {
  name: string;
  role: string;
  school: string;
  content: string;
  rating: number;
  avatar: string;
}

interface ProcessStepProps {
  step: number;
  title: string;
  description: string;
  icon: React.ElementType;
}

const EducationalLandingPage = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  // 书页翻页：每页占滚动区间 1/5
  const bookPages = [
    {
      title: "增值评价系统",
      subtitle: "科学衡量教学真实贡献",
      desc: "基于入口-出口双考试模型，用 Z 分数标准化消除生源差异，真实反映每位教师、每个班级的教学增值。",
      icon: TrendingUp,
      color: "from-emerald-500/20 to-teal-500/20",
    },
    {
      title: "九段评价体系",
      subtitle: "深圳市标准，精准定位学生层次",
      desc: "将全年级学生按 Z 分数划分为 9 个段位，1 段为顶尖 4%，9 段为末尾 4%，横向比较一目了然。",
      icon: BarChart3,
      color: "from-blue-500/20 to-indigo-500/20",
    },
    {
      title: "AI 智能分析",
      subtitle: "一键生成深度教学报告",
      desc: "整合班级、教师、学生三维数据，由 AI 自动撰写分析报告，发现规律、识别风险、给出建议。",
      icon: Brain,
      color: "from-purple-500/20 to-pink-500/20",
    },
    {
      title: "历次追踪",
      subtitle: "纵向对比，看见成长轨迹",
      desc: "跨多次考试追踪教师、班级、学生的增值趋势，用折线图直观呈现进步与退步，支持多维对比。",
      icon: Target,
      color: "from-orange-500/20 to-amber-500/20",
    },
    {
      title: "预警与干预",
      subtitle: "提前发现，及时介入",
      desc: "自动识别成绩异常、能力退步的学生，触发预警通知，帮助教师在问题扩大前采取针对性干预。",
      icon: AlertTriangle,
      color: "from-red-500/20 to-rose-500/20",
    },
  ];

  // 每页对应的滚动进度区间
  const pageCount = bookPages.length;
  const pageIndex = useTransform(
    scrollYProgress,
    [0.1, 0.9],
    [0, pageCount - 1]
  );
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    return pageIndex.on("change", (v) => {
      setCurrentPage(Math.round(Math.min(Math.max(v, 0), pageCount - 1)));
    });
  }, [pageIndex, pageCount]);

  // 视频淡出：滚动到 20% 时开始淡出，40% 完全透明
  const videoOpacity = useTransform(
    scrollYProgress,
    [0, 0.15, 0.35],
    [1, 1, 0]
  );
  // 书本淡入：滚动到 15% 开始出现
  const bookOpacity = useTransform(scrollYProgress, [0.1, 0.3], [0, 1]);
  const bookScale = useTransform(scrollYProgress, [0.1, 0.3], [0.85, 1]);

  const features = [
    {
      icon: Brain,
      title: "智能数据分析",
      description: "多维度成绩分析，发现学习规律",
      benefits: [
        "自动生成学习趋势报告",
        "识别知识点薄弱环节",
        "预测学习成果",
        "个性化学习建议",
      ],
    },
    {
      icon: UserCheck,
      title: "AI学生画像",
      description: "深度了解学生特征和潜力",
      benefits: [
        "全方位学生能力评估",
        "学习风格识别",
        "兴趣爱好分析",
        "发展潜力预测",
      ],
    },
    {
      icon: AlertTriangle,
      title: "预警系统",
      description: "及时发现学习问题和风险",
      benefits: [
        "成绩下滑早期预警",
        "学习行为异常检测",
        "心理状态监控",
        "家校联动提醒",
      ],
    },
    {
      icon: FileText,
      title: "作业管理",
      description: "高效的作业发布和批改流程",
      benefits: ["智能作业推荐", "自动批改系统", "错题本生成", "学习进度跟踪"],
    },
    {
      icon: Users,
      title: "班级管理",
      description: "全面的班级数据统计和分析",
      benefits: [
        "班级整体表现分析",
        "学生排名统计",
        "教学效果评估",
        "家长沟通记录",
      ],
    },
    {
      icon: Upload,
      title: "数据可视化",
      description: "直观的图表展示教学数据",
      benefits: [
        "多维度数据图表",
        "实时数据更新",
        "自定义报表生成",
        "数据导出功能",
      ],
    },
  ];

  const useCases = [
    {
      title: "新学期开始，快速了解新学生",
      description: "通过AI分析快速建立学生档案，制定个性化教学计划",
      icon: BookOpen,
      steps: [
        "导入学生基础信息",
        "AI分析历史成绩数据",
        "生成学生能力画像",
        "制定个性化教学方案",
      ],
    },
    {
      title: "期中考试后，分析班级整体情况",
      description: "深度分析考试结果，发现教学问题，调整教学策略",
      icon: BarChart3,
      steps: [
        "上传考试成绩数据",
        "自动生成分析报告",
        "识别教学薄弱环节",
        "调整后续教学计划",
      ],
    },
    {
      title: "发现学习困难学生，及时干预",
      description: "通过预警系统及时发现问题，采取针对性帮扶措施",
      icon: Target,
      steps: [
        "系统自动预警提醒",
        "分析学习困难原因",
        "制定帮扶计划",
        "跟踪干预效果",
      ],
    },
    {
      title: "家长会前，准备详细的学生报告",
      description: "一键生成专业的学生发展报告，提升家校沟通效果",
      icon: MessageSquare,
      steps: [
        "选择报告时间范围",
        "自动汇总学习数据",
        "生成可视化报告",
        "分享给家长查看",
      ],
    },
  ];

  const processSteps = [
    {
      step: 1,
      title: "数据收集",
      description: "自动收集学生的学习数据、成绩信息和行为记录",
      icon: BarChart3,
    },
    {
      step: 2,
      title: "AI分析",
      description: "运用人工智能算法深度分析数据，发现学习规律",
      icon: Brain,
    },
    {
      step: 3,
      title: "生成报告",
      description: "自动生成个性化的学生画像和分析报告",
      icon: FileText,
    },
    {
      step: 4,
      title: "智能建议",
      description: "基于分析结果提供个性化的教学建议和干预方案",
      icon: Zap,
    },
  ];

  const testimonials = [
    {
      name: "张老师",
      role: "高中数学教师",
      school: "北京市第一中学",
      content:
        "使用这个系统后，我能更精准地了解每个学生的学习状况，教学效果显著提升。特别是预警功能，帮我及时发现了很多潜在问题。",
      rating: 5,
      avatar:
        "https://images.unsplash.com/photo-1494790108755-2616b332e234?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "李主任",
      role: "教务主任",
      school: "上海实验中学",
      content:
        "这个平台的数据分析功能非常强大，帮助我们学校整体提升了教学管理水平。家长反馈也很好，都说报告很专业。",
      rating: 5,
      avatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "王老师",
      role: "班主任",
      school: "广州市育才学校",
      content:
        "AI学生画像功能让我对学生有了更深入的了解，制定教学计划更有针对性。系统操作简单，数据准确可靠。",
      rating: 5,
      avatar:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    },
  ];

  const faqs = [
    {
      question: "系统如何保护学生隐私数据？",
      answer:
        "我们采用银行级别的数据加密技术，所有数据传输和存储都经过严格加密。同时严格遵守相关法律法规，确保学生隐私得到充分保护。",
    },
    {
      question: "系统支持哪些数据格式导入？",
      answer:
        "系统支持Excel、CSV等常见格式的数据导入，也可以通过API接口与现有的教务系统对接，实现数据自动同步。",
    },
    {
      question: "如何确保AI分析结果的准确性？",
      answer:
        "我们的AI模型基于大量教育数据训练，准确率超过95%。同时系统会持续学习和优化，分析结果会越来越精准。",
    },
    {
      question: "系统是否支持移动端使用？",
      answer:
        "是的，系统完全支持手机和平板电脑访问，教师可以随时随地查看学生数据和分析报告。",
    },
    {
      question: "如何获得技术支持？",
      answer:
        "我们提供7×24小时技术支持服务，包括在线客服、电话支持和现场培训。还有详细的使用手册和视频教程。",
    },
    {
      question: "系统的价格如何？",
      answer:
        "我们提供灵活的定价方案，根据学校规模和使用需求定制。可以先免费试用30天，满意后再正式购买。",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section — 视频背景 + 滚动书页 */}
      {/* 高度 = 100vh 视频 + 5页书页滚动区 */}
      <div ref={heroRef} style={{ height: `${100 + pageCount * 80}vh` }}>
        {/* sticky 容器，固定在视口内 */}
        <div className="sticky top-0 h-screen overflow-hidden">
          {/* 视频背景 */}
          <motion.div
            className="absolute inset-0"
            style={{ opacity: videoOpacity }}
          >
            <video
              className="w-full h-full object-cover"
              src="/hero.mp4"
              autoPlay
              loop
              muted
              playsInline
            />
            {/* 渐变遮罩，让文字可读 */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/40" />
            {/* 首屏标题 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.3 }}
                className="text-center px-4"
              >
                <p className="text-sm tracking-[0.3em] uppercase mb-4 text-white/70">
                  AI 驱动的教育评价平台
                </p>
                <h1 className="text-5xl md:text-7xl font-bold mb-6 drop-shadow-lg">
                  智见教育
                </h1>
                <p className="text-lg md:text-xl text-white/80 max-w-xl mx-auto">
                  向下滚动，翻开我们的故事
                </p>
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ repeat: Infinity, duration: 1.8 }}
                  className="mt-10 text-white/60"
                >
                  ↓
                </motion.div>
              </motion.div>
            </div>
          </motion.div>

          {/* 书本区域 */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            style={{ opacity: bookOpacity, scale: bookScale }}
          >
            {/* 书本外框 */}
            <div className="relative w-full max-w-3xl mx-4">
              {/* 书页堆叠阴影 */}
              <div className="absolute -bottom-2 left-2 right-2 h-full bg-amber-100/30 rounded-2xl blur-sm" />
              <div className="absolute -bottom-1 left-1 right-1 h-full bg-amber-50/40 rounded-2xl" />

              {/* 书页主体 */}
              <div className="relative bg-amber-50/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-amber-200/50">
                {/* 书脊装饰线 */}
                <div className="absolute left-12 top-0 bottom-0 w-px bg-amber-300/40" />

                {/* 页码指示器 */}
                <div className="absolute top-4 right-6 flex gap-1.5">
                  {bookPages.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all duration-300",
                        i === currentPage ? "bg-amber-600 w-4" : "bg-amber-300"
                      )}
                    />
                  ))}
                </div>

                {/* 页面内容 */}
                <div className="relative min-h-[420px] md:min-h-[360px]">
                  {bookPages.map((page, i) => {
                    const Icon = page.icon;
                    return (
                      <motion.div
                        key={i}
                        className="absolute inset-0 p-10 md:p-14 flex flex-col justify-center"
                        initial={false}
                        animate={{
                          opacity: i === currentPage ? 1 : 0,
                          x: i === currentPage ? 0 : i < currentPage ? -30 : 30,
                        }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                      >
                        <div
                          className={cn(
                            "inline-flex items-center gap-3 px-4 py-2 rounded-full mb-6 w-fit",
                            "bg-gradient-to-r",
                            page.color
                          )}
                        >
                          <Icon className="w-5 h-5 text-amber-800" />
                          <span className="text-sm font-medium text-amber-800">
                            {page.subtitle}
                          </span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-amber-900 mb-4">
                          {page.title}
                        </h2>
                        <p className="text-amber-800/70 text-lg leading-relaxed max-w-xl">
                          {page.desc}
                        </p>
                        <div className="mt-8 text-amber-400/60 text-sm">
                          第 {i + 1} 页 / 共 {pageCount} 页
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              核心功能特性
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              全面的教育数据分析工具，助力教师提升教学质量
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {feature.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20">
        <div className="container px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">应用场景</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              覆盖教学全流程，满足不同场景下的数据分析需求
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {useCases.map((useCase, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <useCase.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">
                          {useCase.title}
                        </h3>
                        <p className="text-muted-foreground">
                          {useCase.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {useCase.steps.map((step, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                            {i + 1}
                          </div>
                          <span className="text-sm">{step}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                为什么选择我们？
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                AI驱动的教育数据分析，让每一个教学决策都有数据支撑
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">提升教学效果</h3>
                    <p className="text-muted-foreground">
                      基于数据分析的个性化教学，平均提升学生成绩15-25%
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">节省时间成本</h3>
                    <p className="text-muted-foreground">
                      自动化数据分析，减少80%的手工统计时间
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">数据安全可靠</h3>
                    <p className="text-muted-foreground">
                      银行级数据加密，确保学生信息安全
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-primary/10 to-blue-500/10 rounded-2xl p-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">
                      95%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      AI分析准确率
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">
                      10000+
                    </div>
                    <div className="text-sm text-muted-foreground">
                      服务教师数量
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">
                      500+
                    </div>
                    <div className="text-sm text-muted-foreground">
                      合作学校
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">
                      99.9%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      系统稳定性
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">工作流程</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              简单四步，开启智能化教学数据分析之旅
            </p>
          </motion.div>

          <div className="relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border transform -translate-y-1/2 hidden lg:block" />

            <div className="grid lg:grid-cols-4 gap-8">
              {processSteps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">
                      <step.icon className="w-8 h-8" />
                    </div>
                    <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-primary/20 rounded-full -z-10" />

                    <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground text-sm">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-muted/30">
        <div className="container px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">用户评价</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              听听一线教师的真实反馈
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-4 h-4 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>

                    <p className="text-muted-foreground mb-6 italic">
                      "{testimonial.content}"
                    </p>

                    <div className="flex items-center gap-3">
                      <img
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <div className="font-semibold">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {testimonial.role} · {testimonial.school}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="container px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">常见问题</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              解答您关心的问题
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border rounded-lg px-6"
                >
                  <AccordionTrigger className="text-left hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              开启智能化教学新时代
            </h2>
            <p className="text-xl opacity-90 mb-8">
              立即体验AI驱动的学生画像系统，让数据为您的教学赋能
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" className="gap-2">
                <Play className="w-5 h-5" />
                立即免费试用
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Calendar className="w-5 h-5" />
                联系销售顾问
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default EducationalLandingPage;
