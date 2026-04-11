"use client";

import * as React from "react";
import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  BarChart3,
  AlertTriangle,
  FileText,
  Users,
  Upload,
  ArrowRight,
  ChevronDown,
} from "lucide-react";

// ── Slide definitions ──────────────────────────────────────────────────────────

const slides = [
  {
    id: "hero",
    label: "首页",
  },
  {
    id: "features",
    label: "核心功能",
    title: "核心功能",
    subtitle: "CORE FEATURES",
    items: [
      {
        icon: Brain,
        title: "智能数据分析",
        desc: "多维度成绩分析，自动生成学习趋势报告，识别知识点薄弱环节",
      },
      {
        icon: BarChart3,
        title: "增值评价模型",
        desc: "九段评价体系，精准衡量学生真实进步，排除起点差异干扰",
      },
      {
        icon: AlertTriangle,
        title: "预警系统",
        desc: "成绩下滑早期预警，学习行为异常检测，家校联动提醒",
      },
      {
        icon: FileText,
        title: "AI 学生画像",
        desc: "全方位能力评估，学习风格识别，个性化教学建议",
      },
      {
        icon: Users,
        title: "班级管理",
        desc: "班级整体表现分析，教学效果评估，一键生成家长报告",
      },
      {
        icon: Upload,
        title: "数据可视化",
        desc: "多维度图表，实时更新，自定义报表，支持 Excel 导出",
      },
    ],
  },
  {
    id: "scenarios",
    label: "应用场景",
    title: "应用场景",
    subtitle: "USE CASES",
    items: [
      {
        num: "01",
        title: "新学期快速建档",
        desc: "导入学生信息，AI 分析历史成绩，48 小时内生成全班能力画像",
      },
      {
        num: "02",
        title: "期中考试深度复盘",
        desc: "上传成绩数据，自动识别教学薄弱环节，调整后续教学计划",
      },
      {
        num: "03",
        title: "学困生精准干预",
        desc: "系统自动预警，分析困难原因，制定帮扶计划并追踪效果",
      },
      {
        num: "04",
        title: "家长会专业报告",
        desc: "一键生成个性化学生报告，数据可视化，家校沟通更高效",
      },
    ],
  },
  {
    id: "why",
    label: "Why us",
    title: "为什么选择我们",
    subtitle: "WHY US",
    points: [
      { val: "增值评价", desc: "不看起点看进步，真实反映教学成效" },
      { val: "九段体系", desc: "比五级更细腻，区分度更高的评价维度" },
      { val: "数据安全", desc: "银行级加密，严格遵守数据保护法规" },
      { val: "开箱即用", desc: "无需 IT 部署，导入 Excel 即可开始分析" },
    ],
  },
  {
    id: "cta",
    label: "开始使用",
  },
];

// ── Slide variants ─────────────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    y: dir > 0 ? 40 : -40,
  }),
  center: {
    opacity: 1,
    y: 0,
  },
  exit: (dir: number) => ({
    opacity: 0,
    y: dir > 0 ? -40 : 40,
  }),
};

const transition = {
  duration: 0.55,
  ease: [0.32, 0, 0.67, 0] as [number, number, number, number],
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function EducationalLandingPage2() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [locked, setLocked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wheelAccum = useRef(0);
  const lastWheel = useRef(0);

  const goTo = useCallback(
    (next: number) => {
      if (locked) return;
      if (next < 0 || next >= slides.length) return;
      setDirection(next > current ? 1 : -1);
      setCurrent(next);
      setLocked(true);
      setTimeout(() => setLocked(false), 700);
    },
    [current, locked]
  );

  // Wheel handler — accumulate delta, fire when threshold crossed
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      // Reset accumulator if gap > 300ms (new gesture)
      if (now - lastWheel.current > 300) wheelAccum.current = 0;
      lastWheel.current = now;
      wheelAccum.current += e.deltaY;
      if (Math.abs(wheelAccum.current) > 80) {
        goTo(current + (wheelAccum.current > 0 ? 1 : -1));
        wheelAccum.current = 0;
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [current, goTo]);

  // Keyboard arrow support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") goTo(current + 1);
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") goTo(current - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, goTo]);

  const slide = slides[current];

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#000", color: "#fff" }}
    >
      {/* ── Persistent video background ── */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        src="/hero-loop.mp4"
        autoPlay
        loop
        muted
        playsInline
        style={{ opacity: 0.45 }}
      />
      {/* Overlay gradient — darker on non-hero slides for readability */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          background:
            current === 0
              ? "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)"
              : "rgba(0,0,0,0.72)",
        }}
      />

      {/* ── Navbar ── */}
      <nav
        className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-8 md:px-16"
        style={{ height: 56, borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <span
          className="text-sm font-semibold tracking-wide"
          style={{ color: "rgba(255,255,255,0.9)" }}
        >
          Intelliclass
        </span>
        <div className="hidden md:flex items-center gap-8">
          {slides.slice(1, 4).map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i + 1)}
              className="text-xs font-medium transition-colors"
              style={{
                color:
                  current === i + 1
                    ? "rgba(255,255,255,0.95)"
                    : "rgba(255,255,255,0.5)",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          className="text-xs font-medium px-4 py-1.5 rounded-md"
          style={{
            background: "rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.85)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          登录
        </button>
      </nav>

      {/* ── Slide content ── */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={current}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition}
          className="absolute inset-0 flex items-center justify-center z-10"
          style={{ paddingTop: 56 }}
        >
          {current === 0 && <SlideHero onNext={() => goTo(1)} />}
          {current === 1 && <SlideFeatures />}
          {current === 2 && <SlideScenarios />}
          {current === 3 && <SlideWhy />}
          {current === 4 && <SlideCTA />}
        </motion.div>
      </AnimatePresence>

      {/* ── Dot nav ── */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2.5">
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i)}
            title={s.label}
            style={{
              width: 6,
              height: current === i ? 20 : 6,
              borderRadius: 3,
              background:
                current === i
                  ? "rgba(255,255,255,0.9)"
                  : "rgba(255,255,255,0.3)",
              transition: "all 0.3s ease",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          />
        ))}
      </div>

      {/* ── Slide counter ── */}
      <div
        className="absolute bottom-6 left-8 md:left-16 z-50 text-xs"
        style={{
          color: "rgba(255,255,255,0.3)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {String(current + 1).padStart(2, "0")} /{" "}
        {String(slides.length).padStart(2, "0")}
      </div>

      {/* ── Brand watermark ── */}
      <div
        className="absolute bottom-6 right-8 md:right-16 z-50 text-xs"
        style={{ color: "rgba(255,255,255,0.25)" }}
      >
        Intelliclass.online
      </div>
    </div>
  );
}

// ── Individual slides ──────────────────────────────────────────────────────────

function SlideHero({ onNext }: { onNext: () => void }) {
  return (
    <div className="w-full px-8 md:px-16 flex flex-col items-start justify-end pb-24 h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
      >
        <p
          className="text-xs font-semibold tracking-[0.14em] uppercase mb-4"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          教育数据分析平台
        </p>
        <h1 className="text-5xl md:text-7xl font-bold leading-[1.08] tracking-tight mb-6">
          让每一分
          <br />
          有迹可循
        </h1>
        <p
          className="text-base md:text-lg max-w-md mb-10 leading-relaxed"
          style={{ color: "rgba(255,255,255,0.65)" }}
        >
          基于增值评价模型，精准追踪学生学业成长轨迹。
          九段评价体系，让教学决策有数据支撑。
        </p>
        <div className="flex gap-3 items-center">
          <button
            className="px-6 py-3 text-sm font-medium rounded-lg"
            style={{ background: "white", color: "#111827" }}
          >
            免费试用 →
          </button>
          <button
            className="px-6 py-3 text-sm font-medium rounded-lg border"
            style={{
              borderColor: "rgba(255,255,255,0.25)",
              color: "rgba(255,255,255,0.8)",
            }}
          >
            查看演示
          </button>
        </div>
      </motion.div>

      {/* Scroll hint */}
      <motion.button
        onClick={onNext}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
        style={{
          color: "rgba(255,255,255,0.35)",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        <span className="text-xs tracking-widest uppercase">滚动</span>
        <ChevronDown size={14} />
      </motion.button>
    </div>
  );
}

function SlideFeatures() {
  const items = slides[1].items as {
    icon: React.ElementType;
    title: string;
    desc: string;
  }[];
  return (
    <div className="w-full max-w-6xl px-8 md:px-16">
      <SlideHeader subtitle="CORE FEATURES" title="核心功能" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-10">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05 * i }}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                padding: "20px 22px",
              }}
            >
              <Icon
                size={18}
                style={{ color: "rgba(255,255,255,0.5)", marginBottom: 12 }}
              />
              <div className="text-sm font-semibold mb-1.5">{item.title}</div>
              <div
                className="text-xs leading-relaxed"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                {item.desc}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function SlideScenarios() {
  const items = slides[2].items as {
    num: string;
    title: string;
    desc: string;
  }[];
  return (
    <div className="w-full max-w-5xl px-8 md:px-16">
      <SlideHeader subtitle="USE CASES" title="应用场景" />
      <div className="grid md:grid-cols-2 gap-5 mt-10">
        {items.map((item, i) => (
          <motion.div
            key={item.num}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.07 * i }}
            className="flex gap-5"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 10,
              padding: "22px 24px",
            }}
          >
            <span
              className="text-2xl font-bold shrink-0 leading-none mt-0.5"
              style={{
                color: "rgba(255,255,255,0.15)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {item.num}
            </span>
            <div>
              <div className="text-sm font-semibold mb-1.5">{item.title}</div>
              <div
                className="text-xs leading-relaxed"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                {item.desc}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SlideWhy() {
  const points = slides[3].points as { val: string; desc: string }[];
  return (
    <div className="w-full max-w-4xl px-8 md:px-16">
      <SlideHeader subtitle="WHY US" title="为什么选择我们" />
      <div className="grid grid-cols-2 gap-6 mt-12">
        {points.map((p, i) => (
          <motion.div
            key={p.val}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 * i }}
          >
            <div
              className="text-3xl font-bold mb-2 tracking-tight"
              style={{ color: "rgba(255,255,255,0.9)" }}
            >
              {p.val}
            </div>
            <div className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              {p.desc}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SlideCTA() {
  return (
    <div className="w-full max-w-2xl px-8 md:px-16 text-center mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <p
          className="text-xs font-semibold tracking-[0.14em] uppercase mb-4"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          开始使用
        </p>
        <h2 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-5">
          让数据说话
          <br />
          让教学更精准
        </h2>
        <p
          className="text-sm mb-10 leading-relaxed"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          免费试用 14 天，无需信用卡，随时取消。
        </p>
        <div className="flex gap-3 justify-center">
          <button
            className="px-8 py-3 text-sm font-medium rounded-lg"
            style={{ background: "white", color: "#111827" }}
          >
            免费开始 →
          </button>
          <button
            className="px-8 py-3 text-sm font-medium rounded-lg border"
            style={{
              borderColor: "rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.75)",
            }}
          >
            预约演示
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function SlideHeader({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <p
        className="text-xs font-semibold tracking-[0.14em] uppercase mb-2"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
        {subtitle}
      </p>
      <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
    </motion.div>
  );
}
