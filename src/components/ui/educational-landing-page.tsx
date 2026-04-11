"use client";

import * as React from "react";
import { useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  Play,
  BookOpen,
  UserCheck,
  Upload,
  Calendar,
  MessageSquare,
} from "lucide-react";

const EducationalLandingPage = () => {
  const loopVideoRef = useRef<HTMLVideoElement>(null);

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
    <div
      className="min-h-screen"
      style={{ background: "#FAFAFA", color: "#111827" }}
    >
      {/* ── NAVBAR ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 md:px-16"
        style={{
          height: 56,
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Logo */}
        <span
          className="text-sm font-semibold tracking-wide"
          style={{ color: "rgba(255,255,255,0.9)" }}
        >
          Intelliclass
        </span>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8">
          {["核心功能", "应用场景", "Why us"].map((label) => (
            <a
              key={label}
              href={`#${label}`}
              className="text-xs font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.6)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "rgba(255,255,255,0.95)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "rgba(255,255,255,0.6)")
              }
            >
              {label}
            </a>
          ))}
        </div>

        {/* Login */}
        <button
          className="text-xs font-medium px-4 py-1.5 rounded-md transition-colors"
          style={{
            background: "rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.85)",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,0.2)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,0.12)";
          }}
        >
          登录
        </button>
      </nav>

      {/* ── HERO ── */}
      <div className="relative h-screen overflow-hidden">
        <video
          ref={loopVideoRef}
          className="absolute inset-0 w-full h-full object-cover"
          src="/hero-loop.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        {/* 遮罩：底部渐暗，让文字可读 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />

        <div className="absolute inset-0 flex flex-col items-start justify-end pb-20 px-8 md:px-16 z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2 }}
          >
            <p className="text-xs font-semibold tracking-[0.12em] uppercase text-white/60 mb-4">
              教育数据分析平台
            </p>
            <h1 className="text-5xl md:text-7xl font-bold text-white leading-[1.1] tracking-tight mb-6">
              让每一分
              <br />
              有迹可循
            </h1>
            <p className="text-base md:text-lg text-white/70 max-w-md mb-8 leading-relaxed">
              基于增值评价模型，精准追踪学生学业成长轨迹。
              九段评价体系，让教学决策有数据支撑。
            </p>
            <div className="flex gap-3">
              <button
                className="px-6 py-3 text-sm font-medium rounded-lg"
                style={{ background: "white", color: "#111827" }}
              >
                免费试用 →
              </button>
              <button
                className="px-6 py-3 text-sm font-medium rounded-lg border"
                style={{ borderColor: "rgba(255,255,255,0.3)", color: "white" }}
              >
                查看演示
              </button>
            </div>
          </motion.div>

          {/* 品牌名 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.7 }}
            className="absolute bottom-8 right-8 md:right-16"
          >
            <span
              className="text-sm font-medium tracking-wide"
              style={{
                color: "rgba(255,255,255,0.5)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              Intelliclass.online
            </span>
          </motion.div>
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section className="py-24" style={{ background: "#FAFAFA" }}>
        <div className="max-w-6xl mx-auto px-8 md:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-14"
          >
            <p
              className="text-xs font-semibold tracking-[0.12em] uppercase mb-3"
              style={{ color: "#6B7280" }}
            >
              核心功能
            </p>
            <h2
              className="text-3xl font-bold tracking-tight mb-4"
              style={{ color: "#111827" }}
            >
              数据驱动的教学决策
            </h2>
            <p
              className="text-base max-w-lg leading-relaxed"
              style={{ color: "#6B7280" }}
            >
              从原始分数到增值评价，从个体追踪到班级分析，覆盖教学评估全链路。
            </p>
          </motion.div>

          <div
            className="grid md:grid-cols-2 lg:grid-cols-3"
            style={{
              border: "1px solid #E5E7EB",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.06 }}
                viewport={{ once: true }}
                style={{
                  background: "#FFFFFF",
                  padding: "28px 24px",
                  borderRight: index % 3 !== 2 ? "1px solid #E5E7EB" : "none",
                  borderBottom: index < 3 ? "1px solid #E5E7EB" : "none",
                }}
              >
                <div
                  className="flex items-center justify-center mb-5"
                  style={{
                    width: 36,
                    height: 36,
                    background: "#F3F4F6",
                    borderRadius: 8,
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <feature.icon
                    className="w-4 h-4"
                    style={{ color: "#374151" }}
                  />
                </div>
                <h3
                  className="text-sm font-semibold mb-2"
                  style={{ color: "#111827" }}
                >
                  {feature.title}
                </h3>
                <p
                  className="text-sm leading-relaxed mb-4"
                  style={{ color: "#6B7280" }}
                >
                  {feature.description}
                </p>
                <ul className="space-y-1.5">
                  {feature.benefits.map((benefit, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-xs"
                      style={{ color: "#6B7280" }}
                    >
                      <div
                        className="w-1 h-1 rounded-full flex-shrink-0"
                        style={{ background: "#9CA3AF" }}
                      />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── USE CASES ── */}
      <section
        className="py-24"
        style={{ background: "#FFFFFF", borderTop: "1px solid #E5E7EB" }}
      >
        <div className="max-w-6xl mx-auto px-8 md:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-14"
          >
            <p
              className="text-xs font-semibold tracking-[0.12em] uppercase mb-3"
              style={{ color: "#6B7280" }}
            >
              应用场景
            </p>
            <h2
              className="text-3xl font-bold tracking-tight"
              style={{ color: "#111827" }}
            >
              覆盖教学全流程
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {useCases.map((useCase, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                viewport={{ once: true }}
                style={{
                  background: "#FAFAFA",
                  border: "1px solid #E5E7EB",
                  borderRadius: 10,
                  padding: "24px",
                }}
              >
                <div className="flex items-start gap-4 mb-5">
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      background: "#F3F4F6",
                      borderRadius: 8,
                      border: "1px solid #E5E7EB",
                      flexShrink: 0,
                    }}
                    className="flex items-center justify-center"
                  >
                    <useCase.icon
                      className="w-4 h-4"
                      style={{ color: "#374151" }}
                    />
                  </div>
                  <div>
                    <h3
                      className="text-sm font-semibold mb-1"
                      style={{ color: "#111827" }}
                    >
                      {useCase.title}
                    </h3>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: "#6B7280" }}
                    >
                      {useCase.description}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {useCase.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className="flex items-center justify-center text-xs font-semibold flex-shrink-0"
                        style={{
                          width: 20,
                          height: 20,
                          background: "#111827",
                          color: "white",
                          borderRadius: "50%",
                          fontSize: 10,
                        }}
                      >
                        {i + 1}
                      </div>
                      <span className="text-xs" style={{ color: "#374151" }}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFITS + STATS ── */}
      <section
        className="py-24"
        style={{ background: "#FAFAFA", borderTop: "1px solid #E5E7EB" }}
      >
        <div className="max-w-6xl mx-auto px-8 md:px-16">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <p
                className="text-xs font-semibold tracking-[0.12em] uppercase mb-3"
                style={{ color: "#6B7280" }}
              >
                为什么选择我们
              </p>
              <h2
                className="text-3xl font-bold tracking-tight mb-10"
                style={{ color: "#111827" }}
              >
                让每个教学决策
                <br />
                都有数据支撑
              </h2>
              <div className="space-y-8">
                {[
                  {
                    icon: TrendingUp,
                    title: "提升教学效果",
                    desc: "基于数据分析的个性化教学，平均提升学生成绩 15–25%",
                  },
                  {
                    icon: Clock,
                    title: "节省时间成本",
                    desc: "自动化数据分析，减少 80% 的手工统计时间",
                  },
                  {
                    icon: Shield,
                    title: "数据安全可靠",
                    desc: "银行级数据加密，确保学生信息安全",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        background: "#F3F4F6",
                        borderRadius: 8,
                        border: "1px solid #E5E7EB",
                        flexShrink: 0,
                      }}
                      className="flex items-center justify-center"
                    >
                      <item.icon
                        className="w-4 h-4"
                        style={{ color: "#374151" }}
                      />
                    </div>
                    <div>
                      <h3
                        className="text-sm font-semibold mb-1"
                        style={{ color: "#111827" }}
                      >
                        {item.title}
                      </h3>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: "#6B7280" }}
                      >
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: 12,
                  padding: "40px",
                }}
                className="grid grid-cols-2 gap-8"
              >
                {[
                  { val: "95%", label: "AI 分析准确率" },
                  { val: "10,000+", label: "服务教师数量" },
                  { val: "500+", label: "合作学校" },
                  { val: "99.9%", label: "系统稳定性" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <div
                      className="text-3xl font-bold mb-1"
                      style={{
                        color: "#111827",
                        fontVariantNumeric: "tabular-nums",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {s.val}
                    </div>
                    <div className="text-xs" style={{ color: "#9CA3AF" }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section
        className="py-24"
        style={{ background: "#FFFFFF", borderTop: "1px solid #E5E7EB" }}
      >
        <div className="max-w-6xl mx-auto px-8 md:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-14"
          >
            <p
              className="text-xs font-semibold tracking-[0.12em] uppercase mb-3"
              style={{ color: "#6B7280" }}
            >
              工作流程
            </p>
            <h2
              className="text-3xl font-bold tracking-tight"
              style={{ color: "#111827" }}
            >
              四步开启智能分析
            </h2>
          </motion.div>

          <div
            className="grid lg:grid-cols-4 gap-0"
            style={{
              border: "1px solid #E5E7EB",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {processSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                viewport={{ once: true }}
                style={{
                  background: "#FAFAFA",
                  padding: "28px 24px",
                  borderRight: index < 3 ? "1px solid #E5E7EB" : "none",
                }}
              >
                <div
                  className="text-xs font-semibold mb-4"
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    color: "#9CA3AF",
                    fontFamily: "monospace",
                  }}
                >
                  0{step.step}
                </div>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    background: "#F3F4F6",
                    borderRadius: 8,
                    border: "1px solid #E5E7EB",
                  }}
                  className="flex items-center justify-center mb-4"
                >
                  <step.icon className="w-4 h-4" style={{ color: "#374151" }} />
                </div>
                <h3
                  className="text-sm font-semibold mb-2"
                  style={{ color: "#111827" }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "#6B7280" }}
                >
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section
        className="py-24"
        style={{ background: "#FFFFFF", borderTop: "1px solid #E5E7EB" }}
      >
        <div className="max-w-3xl mx-auto px-8 md:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-14"
          >
            <p
              className="text-xs font-semibold tracking-[0.12em] uppercase mb-3"
              style={{ color: "#6B7280" }}
            >
              常见问题
            </p>
            <h2
              className="text-3xl font-bold tracking-tight"
              style={{ color: "#111827" }}
            >
              解答您关心的问题
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Accordion type="single" collapsible className="space-y-0">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  style={{ borderBottom: "1px solid #E5E7EB" }}
                  className="border-0"
                >
                  <AccordionTrigger
                    className="text-left hover:no-underline py-5 text-sm font-medium"
                    style={{ color: "#111827" }}
                  >
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent
                    className="text-sm pb-5 leading-relaxed"
                    style={{ color: "#6B7280" }}
                  >
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className="py-24"
        style={{ background: "#111827", borderTop: "1px solid #E5E7EB" }}
      >
        <div className="max-w-6xl mx-auto px-8 md:px-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <p
              className="text-xs font-semibold tracking-[0.12em] uppercase mb-4"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              开始使用
            </p>
            <h2
              className="text-3xl md:text-4xl font-bold mb-4 tracking-tight"
              style={{ color: "white" }}
            >
              开启智能化教学新时代
            </h2>
            <p
              className="text-base mb-10 max-w-md mx-auto leading-relaxed"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              立即体验 AI 驱动的增值评价系统，让数据为您的教学赋能
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                className="px-8 py-3 text-sm font-medium rounded-lg"
                style={{ background: "white", color: "#111827" }}
              >
                立即免费试用 →
              </button>
              <button
                className="px-8 py-3 text-sm font-medium rounded-lg border"
                style={{
                  borderColor: "rgba(255,255,255,0.2)",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                联系销售顾问
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default EducationalLandingPage;
