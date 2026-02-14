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
import { BookOpen, Calculator, TrendingUp, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">概述</TabsTrigger>
            <TabsTrigger value="basic">基础统计</TabsTrigger>
            <TabsTrigger value="value-added">增值评价</TabsTrigger>
            <TabsTrigger value="levels">等级划分</TabsTrigger>
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
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                    <div className="font-mono text-center text-lg mb-2">
                      Z = (考试分数 - 平均分) / 标准差
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
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                    <div className="font-mono text-center text-lg mb-2">
                      百分位 = (排名 - 1) / (总人数 - 1)
                    </div>
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
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                    <div className="font-mono text-center text-lg mb-2">
                      增值率 = 出口Z分数 - 入口Z分数
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
        </Tabs>

        <div className="mt-6 pt-4 border-t">
          <div className="text-xs text-muted-foreground space-y-1">
            <div>
              📚 <strong>开发者文档</strong>：完整技术说明请查看{" "}
              <code>docs/calculation-formulas.md</code>
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
