"use client";

/**
 * 计算公式说明组件
 * 为最终用户提供友好的公式解释
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Calculator,
  TrendingUp,
  Award,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

interface FormulaExplanationProps {
  trigger?: React.ReactNode;
}

export function FormulaExplanation({ trigger }: FormulaExplanationProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <BookOpen className="h-4 w-4" />
            计算公式说明
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calculator className="h-5 w-5" />
            增值评价计算公式说明
          </DialogTitle>
          <DialogDescription>
            了解我们如何科学、公平地评估教学效果
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">概述</TabsTrigger>
            <TabsTrigger value="basic">基础统计</TabsTrigger>
            <TabsTrigger value="value-added">增值评价</TabsTrigger>
            <TabsTrigger value="levels">等级划分</TabsTrigger>
            <TabsTrigger value="theory">理论依据</TabsTrigger>
          </TabsList>

          {/* 概述标签 */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                什么是增值评价？
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                增值评价通过比较学生的<strong>入口成绩</strong>（学期初）和
                <strong>出口成绩</strong>（学期末），评估教师、班级对学生进步的
                <strong>贡献程度</strong>。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white dark:bg-gray-900 p-3 rounded border">
                  <div className="font-semibold text-green-600 mb-1">
                    公平性
                  </div>
                  <div className="text-xs text-muted-foreground">
                    考虑学生起点差异，低起点的大幅进步同样值得肯定
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-900 p-3 rounded border">
                  <div className="font-semibold text-blue-600 mb-1">科学性</div>
                  <div className="text-xs text-muted-foreground">
                    使用标准化方法（Z-score）消除试卷难度影响
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-900 p-3 rounded border">
                  <div className="font-semibold text-purple-600 mb-1">
                    全面性
                  </div>
                  <div className="text-xs text-muted-foreground">
                    从分数、等级、优秀人数等多维度评价
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200">
              <h3 className="font-semibold mb-2">核心理念</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600 font-bold">✓</span>
                  <span>
                    <strong>关注进步</strong>：不仅看绝对分数，更看相对进步
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600 font-bold">✓</span>
                  <span>
                    <strong>消除偏差</strong>：标准化处理消除试卷难度影响
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600 font-bold">✓</span>
                  <span>
                    <strong>多维评价</strong>：巩固率、转化率、贡献率全面考量
                  </span>
                </li>
              </ul>
            </div>
          </TabsContent>

          {/* 基础统计标签 */}
          <TabsContent value="basic" className="mt-4">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="zscore">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">核心</Badge>
                    <span>Z分数（标准分）</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 px-2">
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-center">
                    <BlockMath math="Z_i = \dfrac{X_i - \bar{X}}{\sigma_X}" />
                    <div className="text-xs text-muted-foreground mt-1">
                      标准分：
                      <InlineMath math="\text{标准分}_i = 500 + 100 \cdot Z_i" />
                    </div>
                  </div>
                  <div className="text-sm space-y-2">
                    <p>
                      <strong>作用</strong>
                      ：将不同难度的考试分数标准化，使其可以横向比较。
                    </p>
                    <p>
                      <strong>解读</strong>：
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Z = 0：分数等于平均分</li>
                      <li>Z = 1：比平均分高1个标准差（优秀）</li>
                      <li>Z = -1：比平均分低1个标准差（需提升）</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded border border-blue-200">
                    <div className="text-xs font-semibold mb-2">📝 示例</div>
                    <div className="text-xs space-y-1">
                      <div>考试A：平均70分，标准差10，小明80分 → Z = 1.0</div>
                      <div>考试B：平均60分，标准差15，小明75分 → Z = 1.0</div>
                      <div className="text-green-600 font-semibold mt-2">
                        ✓ 虽然绝对分数不同，但相对表现一致
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="percentile">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">重要</Badge>
                    <span>百分位排名</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 px-2">
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-center">
                    <BlockMath math="P_i = \dfrac{\text{rank}(X_i) - 1}{N - 1}" />
                  </div>
                  <div className="text-sm space-y-2">
                    <p>
                      <strong>作用</strong>：表示该分数超过了百分之多少的同学。
                    </p>
                    <p>
                      <strong>解读</strong>：
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>百分位 = 1.0：最高分（超过100%的人）</li>
                      <li>百分位 = 0.5：中位数（超过50%的人）</li>
                      <li>百分位 = 0.0：最低分</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950 p-3 rounded border border-green-200">
                    <div className="text-xs font-semibold mb-2">📝 示例</div>
                    <div className="text-xs space-y-1">
                      <div>
                        班级30人，小明第9名 → 百分位 ≈ 0.73（超过73%的同学）
                      </div>
                      <div>小红第1名 → 百分位 = 1.0（最高分）</div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="std">
                <AccordionTrigger>标准差</AccordionTrigger>
                <AccordionContent className="space-y-3 px-2">
                  <div className="text-sm space-y-2">
                    <p>
                      <strong>作用</strong>
                      ：衡量数据的离散程度（分数之间的差异大小）。
                    </p>
                    <p>
                      <strong>解读</strong>：
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>标准差大：分数分布分散，差距明显</li>
                      <li>标准差小：分数分布集中，差距较小</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          {/* 增值评价标签 */}
          <TabsContent value="value-added" className="mt-4">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="value-added-rate">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500">核心</Badge>
                    <span>分数增值率</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 px-2">
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-center">
                    <BlockMath math="\text{TVA}_i = Z_{\text{exit},i} - \hat{\beta} \cdot Z_{\text{entry},i}" />
                    <div className="text-xs text-muted-foreground mt-1">
                      教师增值率 = 班级学生 <InlineMath math="\text{TVA}_i" />{" "}
                      的平均值
                    </div>
                  </div>
                  <div className="text-sm space-y-2">
                    <p>
                      <strong>作用</strong>：评估学生的相对进步程度。
                    </p>
                    <p>
                      <strong>解读</strong>：
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>增值率 &gt; 0：学生进步了</li>
                      <li>增值率 = 0：学生维持原水平</li>
                      <li>增值率 &lt; 0：学生退步了</li>
                    </ul>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded border border-purple-200">
                    <div className="text-xs font-semibold mb-2">
                      📝 对比示例
                    </div>
                    <div className="text-xs space-y-2">
                      <div className="border-b pb-2">
                        <div className="font-semibold">学生A（基础好）：</div>
                        <div>入口Z=1.0 → 出口Z=0.5，增值率=-0.5（退步）</div>
                      </div>
                      <div>
                        <div className="font-semibold">学生B（基础弱）：</div>
                        <div>入口Z=-1.0 → 出口Z=-0.5，增值率=+0.5（进步）</div>
                      </div>
                      <div className="text-green-600 font-semibold mt-2">
                        ✓ 虽然B的绝对分数低，但相对进步更大
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="ols-beta">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-500">核心</Badge>
                    <span>β 系数：均值回归修正因子</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 px-2">
                  {/* β 值展示卡片 */}
                  <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                        本次计算值
                      </span>
                      <span className="font-mono text-2xl font-bold text-purple-700 dark:text-purple-300">
                        β = 0.886
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-purple-200 dark:bg-purple-800 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: "88.6%" }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        88.6%
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      全年级 OLS 回归斜率（无截距）
                    </div>
                  </div>

                  {/* 三重含义 */}
                  <div className="space-y-2 text-sm">
                    <div className="bg-white dark:bg-gray-900 border rounded p-3 flex gap-3">
                      <span className="text-purple-500 font-bold shrink-0 mt-0.5">
                        ①
                      </span>
                      <div>
                        <div className="font-semibold text-xs mb-1">
                          统计含义：Pearson 相关系数
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <InlineMath math="\hat{\beta} = r_{\text{entry,exit}} \approx 0.886" />
                          ，即入口成绩与出口成绩的线性相关强度。
                          两次考试排名约有 88.6% 的稳定性。
                        </div>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 border rounded p-3 flex gap-3">
                      <span className="text-blue-500 font-bold shrink-0 mt-0.5">
                        ②
                      </span>
                      <div>
                        <div className="font-semibold text-xs mb-1">
                          测量含义：考试信度系数（CTT）
                        </div>
                        <div className="text-xs text-muted-foreground">
                          经典测量理论（Classical Test Theory）中，
                          <InlineMath math="\hat{\beta} \approx \rho_{xx'}" />
                          （重测信度）。 0.886
                          属于良好水平（标准化考试信度通常在 0.7–0.95 区间）。
                        </div>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 border rounded p-3 flex gap-3">
                      <span className="text-green-500 font-bold shrink-0 mt-0.5">
                        ③
                      </span>
                      <div>
                        <div className="font-semibold text-xs mb-1">
                          公平性含义：Galton 回归修正
                        </div>
                        <div className="text-xs text-muted-foreground">
                          β &lt; 1
                          正是统计中均值回归现象的体现——高分学生期末倾向于回落，低分学生倾向于回升。
                          用 β 而不是 1 才能还原教师的真实贡献。
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 为什么不用 β = 1 */}
                  <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 rounded p-3 text-xs">
                    <div className="font-semibold mb-2 text-amber-700 dark:text-amber-300">
                      ▷ 为什么不能令 β = 1？
                    </div>
                    <div className="space-y-1 text-muted-foreground">
                      <div>
                        β = 1 等价于「增益分数法（Gain Score）」，即直接用出口分
                        − 入口分。
                      </div>
                      <div className="mt-1">
                        缺陷：对高水平班系统性低估，对低水平班系统性高估，产生不公平的排名偏差。
                      </div>
                      <div className="mt-1">
                        β = r 是 OLS 最小二乘的最优无偏估计（MLE），理论最优。
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="consolidation">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-yellow-500">重要</Badge>
                    <span>巩固率</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 px-2">
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                    <div className="font-mono text-center text-sm mb-2">
                      巩固率 = 保持A+等级的学生数 / 入口A+等级的学生总数
                    </div>
                  </div>
                  <div className="text-sm space-y-2">
                    <p>
                      <strong>作用</strong>：评估教师对优秀学生的保持能力。
                    </p>
                    <p>
                      <strong>适用场景</strong>：重点班、实验班的教学评价。
                    </p>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded border border-yellow-200">
                    <div className="text-xs font-semibold mb-2">📝 示例</div>
                    <div className="text-xs">
                      <div>入口A+等级：10人</div>
                      <div>出口仍为A+：8人</div>
                      <div className="font-semibold mt-1">
                        巩固率 = 8/10 = 80%
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="transformation">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-500">重要</Badge>
                    <span>转化率</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 px-2">
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                    <div className="font-mono text-center text-sm mb-2">
                      转化率 = 等级提升的学生数 / 可提升学生总数
                    </div>
                  </div>
                  <div className="text-sm space-y-2">
                    <p>
                      <strong>作用</strong>：评估教师对中下游学生的提升能力。
                    </p>
                    <p>
                      <strong>适用场景</strong>：普通班、后进班的教学评价。
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded border border-blue-200">
                    <div className="text-xs font-semibold mb-2">📝 示例</div>
                    <div className="text-xs">
                      <div>可提升学生（入口非A+）：20人</div>
                      <div>等级提升（如B→A, C→B+）：12人</div>
                      <div className="font-semibold mt-1">
                        转化率 = 12/20 = 60%
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="contribution">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-500">重要</Badge>
                    <span>贡献率</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 px-2">
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                    <div className="font-mono text-center text-sm mb-2">
                      贡献率 = 教师优秀人数增量 / 年级优秀人数增量
                    </div>
                  </div>
                  <div className="text-sm space-y-2">
                    <p>
                      <strong>作用</strong>
                      ：评估教师对年级整体优秀人数增长的贡献。
                    </p>
                    <p>
                      <strong>特殊情况</strong>
                      ：年级下降但教师上升，标记为"逆势增长"。
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-green-50 dark:bg-green-950 p-2 rounded border border-green-200">
                      <div className="text-xs font-semibold mb-1">正常情况</div>
                      <div className="text-xs">
                        <div>年级增量：+20人</div>
                        <div>教师增量：+8人</div>
                        <div className="font-semibold mt-1">贡献率 = 40%</div>
                      </div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-950 p-2 rounded border border-orange-200">
                      <div className="text-xs font-semibold mb-1">逆势增长</div>
                      <div className="text-xs">
                        <div>年级增量：-10人</div>
                        <div>教师增量：+5人</div>
                        <div className="font-semibold mt-1 text-orange-600">
                          贡献率 = 50% ⭐
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          {/* 等级划分标签 */}
          <TabsContent value="levels" className="mt-4 space-y-4">
            <div className="bg-gradient-to-r from-red-50 to-green-50 dark:from-red-950 dark:to-green-950 p-4 rounded-lg border">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Award className="h-5 w-5" />
                能力等级划分标准
              </h3>
              <div className="space-y-2">
                <div className="grid grid-cols-6 gap-2 text-xs font-semibold text-center">
                  <div>等级</div>
                  <div>百分位</div>
                  <div>说明</div>
                  <div>占比</div>
                  <div>典型排名</div>
                  <div>颜色</div>
                </div>
                {[
                  {
                    level: "A+",
                    range: "前5%",
                    desc: "优秀",
                    ratio: "前5%",
                    rank: "排名前5%",
                    color: "bg-red-500",
                  },
                  {
                    level: "A",
                    range: "5-25%",
                    desc: "良好",
                    ratio: "5-25%",
                    rank: "排名5-25%",
                    color: "bg-orange-500",
                  },
                  {
                    level: "B+",
                    range: "25-50%",
                    desc: "中上",
                    ratio: "25-50%",
                    rank: "排名25-50%",
                    color: "bg-yellow-500",
                  },
                  {
                    level: "B",
                    range: "50-75%",
                    desc: "中等",
                    ratio: "50-75%",
                    rank: "排名50-75%",
                    color: "bg-blue-500",
                  },
                  {
                    level: "C+",
                    range: "75-95%",
                    desc: "中下",
                    ratio: "75-95%",
                    rank: "排名75-95%",
                    color: "bg-purple-500",
                  },
                  {
                    level: "C",
                    range: "95-100%",
                    desc: "需提升",
                    ratio: "后5%",
                    rank: "排名后5%",
                    color: "bg-gray-500",
                  },
                ].map((item) => (
                  <div
                    key={item.level}
                    className="grid grid-cols-6 gap-2 items-center text-xs p-2 bg-white dark:bg-gray-900 rounded border"
                  >
                    <div className="font-bold text-center">{item.level}</div>
                    <div className="text-center">{item.range}</div>
                    <div className="text-center">{item.desc}</div>
                    <div className="text-center">{item.ratio}</div>
                    <div className="text-center text-muted-foreground">
                      {item.rank}
                    </div>
                    <div className="flex justify-center">
                      <div className={`w-4 h-4 rounded ${item.color}`}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold mb-2 text-sm">等级判定说明</h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>
                  • 等级基于<strong>百分位</strong>自动划分，确保分布合理
                </li>
                <li>• 典型排名假设班级30人，实际以百分位为准</li>
                <li>
                  • <strong>等级提升</strong>：如B→B+、B+→A，计入转化率
                </li>
                <li>
                  • <strong>优秀等级</strong>：默认为A+和A，用于计算贡献率
                </li>
              </ul>
            </div>
          </TabsContent>

          {/* 理论依据标签 */}
          <TabsContent value="theory" className="mt-4 space-y-4">
            {/* 政策依据 */}
            <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg border border-red-200">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5 text-red-600" />
                政策依据
              </h3>
              <div className="space-y-3 text-sm">
                <div className="bg-white dark:bg-gray-900 p-3 rounded border-l-4 border-red-400">
                  <div className="font-semibold text-red-700 dark:text-red-400 mb-1">
                    《深化新时代教育评价改革总体方案》（2020）
                  </div>
                  <div className="text-xs text-muted-foreground">
                    中共中央、国务院印发。明确提出"探索增值评价"，要求改变用分数给学生贴标签的做法，创新德智体美劳过程性评价办法，完善综合素质评价体系。
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-900 p-3 rounded border-l-4 border-orange-400">
                  <div className="font-semibold text-orange-700 dark:text-orange-400 mb-1">
                    《义务教育课程方案和课程标准（2022年版）》
                  </div>
                  <div className="text-xs text-muted-foreground">
                    教育部印发。强调"增值性评价"，关注学生学习过程与进步幅度，反对以单一分数作为评价学生和教师的唯一标准。
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-900 p-3 rounded border-l-4 border-yellow-400">
                  <div className="font-semibold text-yellow-700 dark:text-yellow-400 mb-1">
                    《教育督导条例》及配套文件（2021）
                  </div>
                  <div className="text-xs text-muted-foreground">
                    国务院修订。将增值评价纳入教育质量监测指标体系，作为综合评价学校办学质量的重要组成部分。
                  </div>
                </div>

                {/* 深圳本地政策 */}
                <div className="mt-3 pt-3 border-t border-red-200">
                  <div className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1">
                    📍 深圳市配套政策
                  </div>
                  <div className="space-y-2">
                    <div className="bg-white dark:bg-gray-900 p-2.5 rounded border-l-4 border-rose-300">
                      <div className="font-semibold text-xs text-rose-700 dark:text-rose-400 mb-0.5">
                        《深圳市教育局2024年工作要点》
                      </div>
                      <div className="text-xs text-muted-foreground">
                        明确深入实施全市{" "}
                        <strong>53项省级、61项市级教育评价改革试点</strong>
                        ，健全区域教育高质量发展指标体系，支持各区学校探索利用新技术开展学生综合素质评价。
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-2.5 rounded border-l-4 border-pink-300">
                      <div className="font-semibold text-xs text-pink-700 dark:text-pink-400 mb-0.5">
                        《深圳市教育局2025年工作要点》
                      </div>
                      <div className="text-xs text-muted-foreground">
                        修订出台"
                        <strong>教育监测评价督导"体系建设方案2.0版</strong>
                        ，研究制定青少年幸福成长评价体系，深化教学评一体化改革，构建人工智能赋能教研新模式。
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 学术研究依据 */}
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                学术研究支撑
              </h3>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="sanders1994">
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2 text-left">
                      <Badge variant="outline" className="text-xs shrink-0">
                        国际
                      </Badge>
                      <span>Sanders & Horn (1994)：增值评价奠基之作</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-xs space-y-1 px-2 text-muted-foreground">
                    <p>
                      <strong>发表刊物</strong>：Journal of Personnel Evaluation
                      in Education
                    </p>
                    <p>
                      <strong>核心贡献</strong>
                      ：首次将统计模型引入教师效能评价，创立田纳西增值评价系统（TVAAS），证明了不同教师对学生学业成长的影响存在显著差异。
                    </p>
                    <p>
                      <strong>应用意义</strong>
                      ：本系统OLS增值模型的核心思想源自该研究框架。
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="chetty2014">
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2 text-left">
                      <Badge variant="outline" className="text-xs shrink-0">
                        国际
                      </Badge>
                      <span>Chetty et al. (2014)：250万学生大规模验证</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-xs space-y-1 px-2 text-muted-foreground">
                    <p>
                      <strong>发表刊物</strong>：American Economic Review, Vol.
                      104
                    </p>
                    <p>
                      <strong>研究规模</strong>：基于美国250万学生的纵向数据
                    </p>
                    <p>
                      <strong>核心结论</strong>
                      ：OLS增值分数与学生长期收入、大学升学率显著正相关，验证了增值评价指标的长期预测效度。
                    </p>
                    <p>
                      <strong>应用意义</strong>
                      ：为本系统的OLS方法提供了最大规模的实证支持。
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="mayunpeng2018">
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2 text-left">
                      <Badge variant="outline" className="text-xs shrink-0">
                        国内
                      </Badge>
                      <span>马云鹏等（2018）：中国义务教育增值评价体系</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-xs space-y-1 px-2 text-muted-foreground">
                    <p>
                      <strong>机构</strong>：东北师范大学
                    </p>
                    <p>
                      <strong>出版信息</strong>
                      ：《义务教育学校增值评价研究》，东北师范大学出版社
                    </p>
                    <p>
                      <strong>核心贡献</strong>
                      ：系统构建了中国基础教育情境下的增值评价框架，提出"保优"（巩固率）与"促进"（转化率）双维度评价体系，与本系统能力增值指标高度吻合。
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="xintao2019">
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2 text-left">
                      <Badge variant="outline" className="text-xs shrink-0">
                        国内
                      </Badge>
                      <span>辛涛、姜宇（2019）：增值评价本土化研究</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-xs space-y-1 px-2 text-muted-foreground">
                    <p>
                      <strong>发表刊物</strong>：《教育研究》2019年第5期
                    </p>
                    <p>
                      <strong>核心贡献</strong>
                      ：分析了OLS、HLM等不同增值模型在中国教育情境中的适用性，论证了OLS模型在年级内横向比较场景下的合理性与可操作性。
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* 方法论说明 */}
            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Calculator className="h-5 w-5 text-green-600" />
                核心方法：OLS均值回归修正
              </h3>
              <div className="text-sm space-y-3">
                <div className="bg-white dark:bg-gray-900 p-3 rounded">
                  <div className="font-semibold mb-2 text-xs text-muted-foreground">
                    为什么不能直接用"出口分 - 入口分"？
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex items-start gap-1">
                      <span className="text-red-500 font-bold shrink-0">✗</span>
                      <span>
                        教高水平班的教师吃亏（高分学生期末自然回归均值）
                      </span>
                    </div>
                    <div className="flex items-start gap-1">
                      <span className="text-red-500 font-bold shrink-0">✗</span>
                      <span>
                        教低水平班的教师占便宜（低分学生期末自然回归均值）
                      </span>
                    </div>
                    <div className="text-muted-foreground mt-1 italic">
                      这是统计学中的"Galton均值回归"现象
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-900 p-3 rounded">
                  <div className="font-semibold mb-2 text-xs text-muted-foreground">
                    OLS修正公式
                  </div>
                  <BlockMath math="\text{TVA}_i = Z_{\text{exit},i} - \hat{\beta} \cdot Z_{\text{entry},i}" />
                  <BlockMath math="\hat{\beta} = \dfrac{\sum Z_{\text{entry}} \cdot Z_{\text{exit}}}{\sum Z_{\text{entry}}^2}" />
                  <div className="text-xs text-muted-foreground">
                    β由<strong>全年级数据</strong>
                    统一计算，消除不同起点班级的系统性偏差
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 rounded p-3">
                  <div className="font-semibold mb-2 text-xs text-purple-700 dark:text-purple-300">
                    β 的双重理论支撑
                  </div>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <div>
                      <strong>① OLS 统计最优：</strong>
                      <InlineMath math="\hat{\beta} = r" /> 是无截距 OLS
                      的最大似然估计（MLE），是所有线性无偏估计中方差最小的。
                    </div>
                    <div>
                      <strong>② 测量信度（CTT）：</strong>经典测量理论中{" "}
                      <InlineMath math="\hat{\beta} \approx \rho_{xx'}" />
                      （重测信度）。β = 0.886
                      表明本次入口→出口考试信度良好，符合标准化考试 0.7–0.95
                      的期望区间（Cronbach, 1951）。
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-green-100 dark:bg-green-900 p-2 rounded text-center">
                    <div className="font-semibold text-green-700 dark:text-green-300">
                      高水平班
                    </div>
                    <div className="text-muted-foreground mt-1">
                      修正后公平反映真实贡献
                    </div>
                  </div>
                  <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded text-center">
                    <div className="font-semibold text-blue-700 dark:text-blue-300">
                      中等水平班
                    </div>
                    <div className="text-muted-foreground mt-1">
                      结果与简单差值基本一致
                    </div>
                  </div>
                  <div className="bg-orange-100 dark:bg-orange-900 p-2 rounded text-center">
                    <div className="font-semibold text-orange-700 dark:text-orange-300">
                      低水平班
                    </div>
                    <div className="text-muted-foreground mt-1">
                      修正后避免虚高估计
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 pt-4 border-t">
          <div className="text-xs text-muted-foreground space-y-1">
            <div>
              📚 <strong>开发者文档</strong>：完整技术说明请查看{" "}
              <a
                href="/docs/methodology"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80"
              >
                增值评价计算方法与理论依据 ↗
              </a>
            </div>
            <div>
              🧪 <strong>单元测试</strong>：算法验证请查看{" "}
              <code>
                src/utils/__tests__/statistics.algorithm-fixes.test.ts
              </code>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
