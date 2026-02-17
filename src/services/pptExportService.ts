/**
 * PPT导出服务
 * 使用 pptxgenjs 生成增值评价分析报告
 * 设计风格: Positivus (深黑+荧光绿)
 */
import PptxGenJS from "pptxgenjs";

// pptxgenjs 的 charts/shapes 是实例属性，类型定义可能缺失
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PptxAny = any;

// -- 设计令牌 --
const COLOR = {
  dark: "191A23",
  accent: "B9FF66",
  white: "FFFFFF",
  red: "FF6B6B",
  yellow: "FFD93D",
  blue: "4D96FF",
  gray: "888888",
  tableBorder: "333333",
} as const;

const FONT = {
  cn: "Microsoft YaHei",
  en: "Arial",
} as const;

export interface PPTExportData {
  activityName: string;
  date: string;
  classData: Array<{
    class_name: string;
    avgRate: number;
    subjectCount: number;
  }>;
  teacherData: Array<{
    teacher_name: string;
    subject: string;
    avg_score_value_added_rate: number;
    total_students: number;
    class_details?: Array<{
      class_name: string;
      avg_rate: number;
      student_count: number;
    }>;
  }>;
  insights: Array<{
    title: string;
    description: string;
    priority: string; // "HIGH" | "MEDIUM" | "LOW"
    confidence: number;
  }>;
  aiReportText?: string; // AI生成的完整报告文本
}

// -- 工具函数 --

/** 深色全覆盖背景 */
function darkBg(slide: PptxGenJS.Slide) {
  slide.background = { color: COLOR.dark };
}

/** 白色背景 */
function lightBg(slide: PptxGenJS.Slide) {
  slide.background = { color: COLOR.white };
}

/** 格式化百分比 */
function fmtPct(rate: number): string {
  const v = (rate * 100).toFixed(1);
  return rate >= 0 ? `+${v}%` : `${v}%`;
}

/**
 * 解析Markdown文本为pptxgenjs富文本段落
 * 支持 **粗体** 和 【高亮标记】
 */
function parseRichText(
  text: string,
  baseFontSize: number
): PptxGenJS.TextProps[] {
  const runs: PptxGenJS.TextProps[] = [];
  const regex = /(\*\*(.+?)\*\*|【(.+?)】)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push({
        text: text.slice(lastIndex, match.index),
        options: { fontSize: baseFontSize, fontFace: FONT.cn, color: "333333" },
      });
    }

    if (match[2]) {
      runs.push({
        text: match[2],
        options: {
          fontSize: baseFontSize,
          fontFace: FONT.cn,
          bold: true,
          color: COLOR.dark,
        },
      });
    } else if (match[3]) {
      runs.push({
        text: `【${match[3]}】`,
        options: {
          fontSize: baseFontSize,
          fontFace: FONT.cn,
          bold: true,
          color: "2E7D32",
        },
      });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    runs.push({
      text: text.slice(lastIndex),
      options: { fontSize: baseFontSize, fontFace: FONT.cn, color: "333333" },
    });
  }

  if (runs.length === 0) {
    runs.push({
      text,
      options: { fontSize: baseFontSize, fontFace: FONT.cn, color: "333333" },
    });
  }

  return runs;
}

// -- Slide 构建器 --

function buildCoverSlide(pptx: PptxGenJS, data: PPTExportData) {
  const slide = pptx.addSlide();
  darkBg(slide);

  // 主标题
  slide.addText(data.activityName, {
    x: 0.5,
    y: 2.2,
    w: 12.33,
    h: 1.2,
    fontSize: 36,
    bold: true,
    color: COLOR.accent,
    fontFace: FONT.cn,
    align: "center",
  });

  // 副标题
  slide.addText("\u589E\u503C\u8BC4\u4EF7\u5206\u6790\u62A5\u544A", {
    x: 0.5,
    y: 3.5,
    w: 12.33,
    h: 0.8,
    fontSize: 20,
    color: COLOR.white,
    fontFace: FONT.cn,
    align: "center",
  });

  // 底部信息
  slide.addText(
    `${data.date}  |  \u7531AI\u5206\u6790\u7CFB\u7EDF\u81EA\u52A8\u751F\u6210`,
    {
      x: 0.5,
      y: 6.2,
      w: 12.33,
      h: 0.5,
      fontSize: 12,
      color: COLOR.gray,
      fontFace: FONT.cn,
      align: "center",
    }
  );
}

function buildClassChartSlide(pptx: PptxGenJS, data: PPTExportData) {
  const slide = pptx.addSlide();
  lightBg(slide);

  // 标题
  slide.addText("\u73ED\u7EA7\u589E\u503C\u7387\u5206\u5E03", {
    x: 0.5,
    y: 0.3,
    w: 12,
    h: 0.8,
    fontSize: 28,
    bold: true,
    color: COLOR.dark,
    fontFace: FONT.cn,
  });

  const sorted = [...data.classData]
    .sort((a, b) => b.avgRate - a.avgRate)
    .slice(0, 15);

  if (sorted.length === 0) {
    slide.addText("\u6682\u65E0\u73ED\u7EA7\u6570\u636E", {
      x: 1,
      y: 3,
      w: 11,
      h: 1,
      fontSize: 16,
      color: COLOR.gray,
      fontFace: FONT.cn,
      align: "center",
    });
    return;
  }

  const labels = sorted.map((c) => c.class_name);
  const values = sorted.map((c) => +(c.avgRate * 100).toFixed(1));

  // 为每个柱子设置颜色
  const chartColors = sorted.map((c) =>
    c.avgRate >= 0 ? COLOR.accent : COLOR.red
  );

  // pptxgenjs BAR chart - 使用多个系列实现逐条着色
  // 由于 pptxgenjs 不支持单系列内逐条颜色，用单系列 + chartColors
  const chartData = [
    {
      name: "\u589E\u503C\u7387(%)",
      labels,
      values,
    },
  ];

  slide.addChart(
    (pptx as PptxAny).charts.BAR,
    chartData as PptxAny,
    {
      x: 0.5,
      y: 1.3,
      w: 12.33,
      h: 5.5,
      showTitle: false,
      showValue: true,
      valueFontSize: 8,
      catAxisOrientation: "minMax",
      valAxisOrientation: "minMax",
      catAxisLabelFontSize: 9,
      valAxisLabelFontSize: 9,
      chartColors,
      valAxisTitle: "\u589E\u503C\u7387 (%)",
      valAxisTitleFontSize: 10,
      catAxisLabelRotate: 45,
      showLegend: false,
    } as any
  );
}

function buildClassRankSlide(pptx: PptxGenJS, data: PPTExportData) {
  const slide = pptx.addSlide();
  lightBg(slide);

  slide.addText("\u4F18\u79C0\u73ED\u7EA7 & \u9700\u5173\u6CE8\u73ED\u7EA7", {
    x: 0.5,
    y: 0.3,
    w: 12,
    h: 0.8,
    fontSize: 28,
    bold: true,
    color: COLOR.dark,
    fontFace: FONT.cn,
  });

  const sorted = [...data.classData].sort((a, b) => b.avgRate - a.avgRate);
  const top3 = sorted.slice(0, 3);
  const bottom3 = [...data.classData]
    .sort((a, b) => a.avgRate - b.avgRate)
    .slice(0, 3);

  // 左侧 - 优秀班级
  slide.addText("\u2B50 \u4F18\u79C0\u73ED\u7EA7 Top3", {
    x: 0.5,
    y: 1.2,
    w: 5.8,
    h: 0.5,
    fontSize: 14,
    bold: true,
    color: COLOR.dark,
    fontFace: FONT.cn,
  });

  const topHeader: PptxGenJS.TableRow = [
    {
      text: "\u6392\u540D",
      options: {
        bold: true,
        color: COLOR.accent,
        fill: { color: COLOR.dark },
        fontSize: 11,
        fontFace: FONT.cn,
        align: "center",
      },
    },
    {
      text: "\u73ED\u7EA7",
      options: {
        bold: true,
        color: COLOR.accent,
        fill: { color: COLOR.dark },
        fontSize: 11,
        fontFace: FONT.cn,
        align: "center",
      },
    },
    {
      text: "\u589E\u503C\u7387",
      options: {
        bold: true,
        color: COLOR.accent,
        fill: { color: COLOR.dark },
        fontSize: 11,
        fontFace: FONT.cn,
        align: "center",
      },
    },
  ];

  const topRows: PptxGenJS.TableRow[] = top3.map((c, i) => [
    {
      text: `${i + 1}`,
      options: { fontSize: 11, fontFace: FONT.cn, align: "center" as const },
    },
    {
      text: c.class_name,
      options: { fontSize: 11, fontFace: FONT.cn, align: "center" as const },
    },
    {
      text: fmtPct(c.avgRate),
      options: {
        fontSize: 11,
        fontFace: FONT.cn,
        align: "center" as const,
        color: c.avgRate >= 0 ? "2E7D32" : COLOR.red,
        bold: true,
      },
    },
  ]);

  slide.addTable([topHeader, ...topRows], {
    x: 0.5,
    y: 1.8,
    w: 5.8,
    h: 2.0,
    colW: [1, 2.8, 2],
    border: { type: "solid", pt: 0.5, color: COLOR.tableBorder },
    rowH: [0.45, 0.45, 0.45, 0.45],
    autoPage: false,
  });

  // 右侧 - 需关注班级
  slide.addText("\u26A0\uFE0F \u9700\u5173\u6CE8\u73ED\u7EA7 Bottom3", {
    x: 7,
    y: 1.2,
    w: 5.8,
    h: 0.5,
    fontSize: 14,
    bold: true,
    color: COLOR.dark,
    fontFace: FONT.cn,
  });

  const bottomRows: PptxGenJS.TableRow[] = bottom3.map((c, i) => [
    {
      text: `${i + 1}`,
      options: { fontSize: 11, fontFace: FONT.cn, align: "center" as const },
    },
    {
      text: c.class_name,
      options: { fontSize: 11, fontFace: FONT.cn, align: "center" as const },
    },
    {
      text: fmtPct(c.avgRate),
      options: {
        fontSize: 11,
        fontFace: FONT.cn,
        align: "center" as const,
        color: c.avgRate >= 0 ? "2E7D32" : COLOR.red,
        bold: true,
      },
    },
  ]);

  slide.addTable([topHeader, ...bottomRows], {
    x: 7,
    y: 1.8,
    w: 5.8,
    h: 2.0,
    colW: [1, 2.8, 2],
    border: { type: "solid", pt: 0.5, color: COLOR.tableBorder },
    rowH: [0.45, 0.45, 0.45, 0.45],
    autoPage: false,
  });
}

function buildTeacherRankSlide(pptx: PptxGenJS, data: PPTExportData) {
  const slide = pptx.addSlide();
  lightBg(slide);

  slide.addText("\u6559\u5E08\u589E\u503C\u7387\u6392\u884C Top10", {
    x: 0.5,
    y: 0.3,
    w: 12,
    h: 0.8,
    fontSize: 28,
    bold: true,
    color: COLOR.dark,
    fontFace: FONT.cn,
  });

  const sorted = [...data.teacherData]
    .sort((a, b) => b.avg_score_value_added_rate - a.avg_score_value_added_rate)
    .slice(0, 10);

  const header: PptxGenJS.TableRow = [
    "\u6392\u540D",
    "\u59D3\u540D",
    "\u79D1\u76EE",
    "\u589E\u503C\u7387(%)",
    "\u6559\u5B66\u4EBA\u6570",
  ].map((text) => ({
    text,
    options: {
      bold: true,
      color: COLOR.accent,
      fill: { color: COLOR.dark },
      fontSize: 11,
      fontFace: FONT.cn,
      align: "center" as const,
    },
  }));

  const rows: PptxGenJS.TableRow[] = sorted.map((t, i) => [
    {
      text: `${i + 1}`,
      options: { fontSize: 11, fontFace: FONT.cn, align: "center" as const },
    },
    {
      text: t.teacher_name,
      options: { fontSize: 11, fontFace: FONT.cn, align: "center" as const },
    },
    {
      text: t.subject,
      options: { fontSize: 11, fontFace: FONT.cn, align: "center" as const },
    },
    {
      text: fmtPct(t.avg_score_value_added_rate),
      options: {
        fontSize: 11,
        fontFace: FONT.cn,
        align: "center" as const,
        color: t.avg_score_value_added_rate >= 0 ? "2E7D32" : COLOR.red,
        bold: true,
      },
    },
    {
      text: `${t.total_students}`,
      options: { fontSize: 11, fontFace: FONT.cn, align: "center" as const },
    },
  ]);

  slide.addTable([header, ...rows], {
    x: 0.5,
    y: 1.3,
    w: 12.33,
    colW: [1, 2.5, 2.5, 3, 3.33],
    border: { type: "solid", pt: 0.5, color: COLOR.tableBorder },
    rowH: [0.45, ...Array(rows.length).fill(0.45)],
    autoPage: false,
  });
}

function buildInsightsSlide(pptx: PptxGenJS, data: PPTExportData) {
  const slide = pptx.addSlide();
  lightBg(slide);

  slide.addText("\u7B97\u6CD5\u6D1E\u5BDF", {
    x: 0.5,
    y: 0.3,
    w: 12,
    h: 0.8,
    fontSize: 28,
    bold: true,
    color: COLOR.dark,
    fontFace: FONT.cn,
  });

  if (data.insights.length === 0) {
    slide.addText("\u6682\u65E0\u7B97\u6CD5\u6D1E\u5BDF\u6570\u636E", {
      x: 1,
      y: 3,
      w: 11,
      h: 1,
      fontSize: 16,
      color: COLOR.gray,
      fontFace: FONT.cn,
      align: "center",
    });
    return;
  }

  const priorityConfig: Record<
    string,
    { label: string; color: string; dotColor: string }
  > = {
    HIGH: {
      label: "\u9AD8\u4F18\u5148\u7EA7",
      color: COLOR.red,
      dotColor: COLOR.red,
    },
    high: {
      label: "\u9AD8\u4F18\u5148\u7EA7",
      color: COLOR.red,
      dotColor: COLOR.red,
    },
    MEDIUM: {
      label: "\u4E2D\u4F18\u5148\u7EA7",
      color: COLOR.yellow,
      dotColor: "E6A817",
    },
    medium: {
      label: "\u4E2D\u4F18\u5148\u7EA7",
      color: COLOR.yellow,
      dotColor: "E6A817",
    },
    LOW: {
      label: "\u4F4E\u4F18\u5148\u7EA7",
      color: COLOR.blue,
      dotColor: COLOR.blue,
    },
    low: {
      label: "\u4F4E\u4F18\u5148\u7EA7",
      color: COLOR.blue,
      dotColor: COLOR.blue,
    },
  };

  // 按优先级分组
  const groups: Record<string, typeof data.insights> = {};
  for (const insight of data.insights) {
    const key = insight.priority.toUpperCase();
    if (!groups[key]) groups[key] = [];
    groups[key].push(insight);
  }

  let yPos = 1.3;
  const groupOrder = ["HIGH", "MEDIUM", "LOW"];

  for (const priority of groupOrder) {
    const items = groups[priority];
    if (!items || items.length === 0) continue;

    const cfg = priorityConfig[priority] || priorityConfig.LOW;

    // 分组标题
    slide.addText(cfg.label, {
      x: 0.5,
      y: yPos,
      w: 3,
      h: 0.4,
      fontSize: 12,
      bold: true,
      color: cfg.dotColor,
      fontFace: FONT.cn,
    });
    yPos += 0.45;

    for (const item of items.slice(0, 3)) {
      if (yPos > 6.5) break;

      const desc =
        item.description.length > 80
          ? item.description.slice(0, 80) + "..."
          : item.description;

      // 圆点 + 标题 + 描述
      slide.addShape((pptx as PptxAny).shapes.OVAL, {
        x: 0.7,
        y: yPos + 0.1,
        w: 0.15,
        h: 0.15,
        fill: { color: cfg.dotColor },
      });

      slide.addText(item.title, {
        x: 1.0,
        y: yPos,
        w: 11,
        h: 0.35,
        fontSize: 11,
        bold: true,
        color: COLOR.dark,
        fontFace: FONT.cn,
      });
      yPos += 0.35;

      slide.addText(desc, {
        x: 1.0,
        y: yPos,
        w: 11,
        h: 0.35,
        fontSize: 9,
        color: COLOR.gray,
        fontFace: FONT.cn,
      });
      yPos += 0.5;
    }

    yPos += 0.15;
  }
}

/** 将AI报告文本拆分为多张幻灯片，按"一、""二、"等大章节分割 */
function buildAIReportSlides(pptx: PptxGenJS, data: PPTExportData) {
  const text = data.aiReportText;
  if (!text) return;

  // 按大章节标题拆分（"一、""二、"...）
  const sectionRegex = /(?=(?:^|\n)[一二三四五六七八九十]+、)/;
  const rawSections = text.split(sectionRegex).filter((s) => s.trim());

  const MAX_CHARS = 350;

  for (const section of rawSections) {
    // 提取章节标题（第一行）
    const lines = section.split("\n");
    const titleLine = lines[0].trim();
    // 去掉"一、"前缀提取纯标题，保留数字前缀用于排序参考
    const titleMatch = titleLine.match(/^[一二三四五六七八九十]+、\s*(.*)/);
    const sectionTitle = titleMatch ? titleMatch[1] : titleLine;
    const body = lines.slice(1).join("\n").trim();

    // 清理markdown标记：去掉 ────、**粗体**
    const cleanBody = body.replace(/─+/g, "").trim();

    if (!cleanBody) {
      // 空章节只生成标题页
      const slide = pptx.addSlide();
      lightBg(slide);
      slide.addText(titleLine, {
        x: 0.5,
        y: 2.5,
        w: 12.33,
        h: 1.5,
        fontSize: 28,
        bold: true,
        color: COLOR.dark,
        fontFace: FONT.cn,
        align: "center",
      });
      continue;
    }

    // 按字数拆分为多张幻灯片
    const chunks: string[] = [];
    if (cleanBody.length <= MAX_CHARS) {
      chunks.push(cleanBody);
    } else {
      // 按段落拆分，尽量不切断段落
      const paragraphs = cleanBody.split(/\n\n+/);
      let current = "";
      for (const para of paragraphs) {
        if (
          current.length + para.length + 2 > MAX_CHARS &&
          current.length > 0
        ) {
          chunks.push(current.trim());
          current = para;
        } else {
          current += (current ? "\n\n" : "") + para;
        }
      }
      if (current.trim()) {
        chunks.push(current.trim());
      }
      // 如果某个chunk仍然超长，强制按字数切割
      const final: string[] = [];
      for (const chunk of chunks) {
        if (chunk.length <= MAX_CHARS) {
          final.push(chunk);
        } else {
          for (let i = 0; i < chunk.length; i += MAX_CHARS) {
            final.push(chunk.slice(i, i + MAX_CHARS));
          }
        }
      }
      chunks.length = 0;
      chunks.push(...final);
    }

    chunks.forEach((chunk, idx) => {
      const slide = pptx.addSlide();
      lightBg(slide);

      const displayTitle =
        chunks.length > 1
          ? `${titleLine}${idx > 0 ? "（续）" : ""}`
          : titleLine;

      slide.addText(displayTitle, {
        x: 0.5,
        y: 0.3,
        w: 12,
        h: 0.8,
        fontSize: 28,
        bold: true,
        color: COLOR.dark,
        fontFace: FONT.cn,
      });

      const richTextRuns = parseRichText(chunk, 20);

      slide.addText(richTextRuns, {
        x: 0.5,
        y: 1.3,
        w: 12.33,
        h: 5.8,
        valign: "top",
        lineSpacingMultiple: 1.5,
        paraSpaceAfter: 6,
      } as any);
    });
  }
}

function buildEndSlide(pptx: PptxGenJS, data: PPTExportData) {
  const slide = pptx.addSlide();
  darkBg(slide);

  slide.addText("\u8C22\u8C22\u67E5\u770B", {
    x: 0.5,
    y: 2.8,
    w: 12.33,
    h: 1.2,
    fontSize: 36,
    bold: true,
    color: COLOR.accent,
    fontFace: FONT.cn,
    align: "center",
  });

  slide.addText(
    `${data.date}  |  \u589E\u503C\u8BC4\u4EF7\u5206\u6790\u7CFB\u7EDF`,
    {
      x: 0.5,
      y: 6.2,
      w: 12.33,
      h: 0.5,
      fontSize: 12,
      color: COLOR.gray,
      fontFace: FONT.cn,
      align: "center",
    }
  );
}

// -- 主导出函数 --

export async function exportToPPT(data: PPTExportData): Promise<void> {
  const pptx = new PptxGenJS();

  // 16:9 宽屏布局
  pptx.defineLayout({ name: "CUSTOM", width: 13.33, height: 7.5 });
  pptx.layout = "CUSTOM";
  pptx.author = "AI\u5206\u6790\u7CFB\u7EDF";
  pptx.subject = data.activityName;
  pptx.title = `${data.activityName} - \u589E\u503C\u8BC4\u4EF7\u5206\u6790\u62A5\u544A`;

  buildCoverSlide(pptx, data);
  buildClassChartSlide(pptx, data);
  buildClassRankSlide(pptx, data);
  buildTeacherRankSlide(pptx, data);
  buildInsightsSlide(pptx, data);
  if (data.aiReportText?.trim()) {
    buildAIReportSlides(pptx, data);
  }
  buildEndSlide(pptx, data);

  const fileName = `${data.activityName}_\u589E\u503C\u8BC4\u4EF7\u62A5\u544A_${data.date.replace(/\//g, "-")}.pptx`;
  await pptx.writeFile({ fileName });
}
