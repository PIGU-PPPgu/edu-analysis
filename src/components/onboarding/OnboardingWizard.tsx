import React, { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  School,
  BookOpen,
  Users,
  BookMarked,
  UserCircle,
  Building2,
  Bookmark,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// 个人信息表单验证
const personalInfoSchema = z.object({
  fullName: z.string().min(1, "姓名不能为空"),
  role: z.enum(["teacher", "student", "admin"]),
  phone: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().optional(),
});

// 步骤1表单验证
const step1Schema = z.object({
  schoolName: z.string().min(1, "学校名称不能为空"),
  educationStage: z.enum([
    "primary",
    "middle",
    "high",
    "university",
    "training",
  ]),
});

// 步骤2表单验证
const step2Schema = z.object({
  gradesCount: z.coerce
    .number()
    .min(1, "年级数量至少为1")
    .max(12, "年级数量过多"),
  classesPerGrade: z.coerce
    .number()
    .min(1, "每年级班级数至少为1")
    .max(20, "每年级班级数过多"),
  startYear: z.coerce
    .number()
    .min(2000, "开始年份格式不正确")
    .max(2100, "结束年份不能超过2100年"),
});

// 步骤3表单验证
const step3Schema = z.object({
  subjects: z.array(z.string()).min(1, "至少需要选择一个学科"),
});

// 步骤4表单验证
const step4Schema = z.object({
  confirmSetup: z.boolean(),
  enableNotifications: z.boolean().default(true),
  dataImportOption: z.enum(["now", "later"]).default("later"),
});

type PersonalInfoFormValues = z.infer<typeof personalInfoSchema>;
type Step1FormValues = z.infer<typeof step1Schema>;
type Step2FormValues = z.infer<typeof step2Schema>;
type Step3FormValues = z.infer<typeof step3Schema>;
type Step4FormValues = z.infer<typeof step4Schema>;

type AllFormValues = PersonalInfoFormValues &
  Step1FormValues &
  Step2FormValues &
  Step3FormValues &
  Step4FormValues;

// 定义教育阶段选项
const educationStages = [
  { value: "primary", label: "小学" },
  { value: "middle", label: "初中" },
  { value: "high", label: "高中" },
  { value: "university", label: "大学/高等教育" },
  { value: "training", label: "培训机构" },
];

// 预定义学科列表
const subjectOptions = [
  { value: "math", label: "数学" },
  { value: "chinese", label: "语文" },
  { value: "english", label: "英语" },
  { value: "physics", label: "物理" },
  { value: "chemistry", label: "化学" },
  { value: "biology", label: "生物" },
  { value: "history", label: "历史" },
  { value: "geography", label: "地理" },
  { value: "politics", label: "政治" },
  { value: "music", label: "音乐" },
  { value: "art", label: "美术" },
  { value: "pe", label: "体育" },
];

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0); // 从个人信息开始
  const [formData, setFormData] = useState<Partial<AllFormValues>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);

  // 获取当前用户信息
  useEffect(() => {
    async function getUserId() {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserId(data.user.id);

        // 检查用户是否已有进行中的引导流程
        const { data: onboarding } = await supabase
          .from("onboarding_status")
          .select("*")
          .eq("user_id", data.user.id)
          .single();

        if (onboarding) {
          // 恢复到之前的步骤
          if (!onboarding.is_completed && onboarding.current_step) {
            const stepMap: Record<string, number> = {
              personal: 0,
              school: 1,
              structure: 2,
              subjects: 3,
              complete: 4,
            };

            setCurrentStep(stepMap[onboarding.current_step] || 0);
          }
        } else {
          // 创建新的引导记录
          await supabase.from("onboarding_status").insert({
            user_id: data.user.id,
            current_step: "personal",
            first_login: new Date().toISOString(),
          });
        }
      }
    }

    getUserId();
  }, []);

  // 个人信息表单
  const personalInfoForm = useForm<PersonalInfoFormValues>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      fullName: formData.fullName || "",
      role: formData.role || "teacher",
      phone: formData.phone || "",
      bio: formData.bio || "",
      avatarUrl: formData.avatarUrl || "",
    },
  });

  // 步骤1表单
  const step1Form = useForm<Step1FormValues>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      schoolName: formData.schoolName || "",
      educationStage: formData.educationStage || undefined,
    },
  });

  // 步骤2表单
  const step2Form = useForm<Step2FormValues>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      gradesCount: formData.gradesCount || 3,
      classesPerGrade: formData.classesPerGrade || 3,
      startYear: formData.startYear || new Date().getFullYear(),
    },
  });

  // 步骤3表单
  const step3Form = useForm<Step3FormValues>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      subjects: formData.subjects || ["math", "chinese", "english"],
    },
  });

  // 步骤4表单
  const step4Form = useForm<Step4FormValues>({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      confirmSetup: false,
      enableNotifications: true,
      dataImportOption: "later",
    },
  });

  // 处理下一步
  const handleNext = async (data: any) => {
    // 合并表单数据
    setFormData({ ...formData, ...data });

    // 保存当前步骤
    if (userId) {
      const stepNames = [
        "personal",
        "school",
        "structure",
        "subjects",
        "complete",
      ];
      const nextStep = stepNames[currentStep + 1];

      await supabase
        .from("onboarding_status")
        .update({
          current_step: nextStep,
        })
        .eq("user_id", userId);
    }

    // 前进到下一步
    setCurrentStep(currentStep + 1);
  };

  // 处理上一步
  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  // 最终提交
  const handleFinalSubmit = async (data: Step4FormValues) => {
    setIsSubmitting(true);

    // 合并所有表单数据
    const allData = { ...formData, ...data };

    try {
      // 保存引导设置
      await saveOnboardingData(allData as AllFormValues);

      // 更新引导状态为已完成
      if (userId) {
        await supabase
          .from("onboarding_status")
          .update({
            is_completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
      }

      toast.success("设置完成！", {
        description: "教育系统初始化成功",
      });

      // 如果选择现在导入数据，跳转到导入页面
      if (data.dataImportOption === "now") {
        navigate("/import-data");
      } else {
        // 否则跳转到仪表盘
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("设置失败:", error);
      toast.error("设置失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 保存设置到数据库
  const saveOnboardingData = async (data: AllFormValues) => {
    try {
      // 1. 更新用户配置
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({
          full_name: data.fullName,
          phone: data.phone,
          bio: data.bio,
          avatar_url: data.avatarUrl,
          user_type: data.role,
          preferences: {
            education_stage: data.educationStage,
            setup_completed: true,
            setup_date: new Date().toISOString(),
            school_name: data.schoolName,
          },
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      // 2. 创建学年
      const { data: academicYearData, error: yearError } = await supabase
        .from("academic_terms")
        .insert({
          academic_year: `${data.startYear}-${data.startYear + 1}`,
          semester: "第一学期",
          start_date: `${data.startYear}-09-01`,
          end_date: `${data.startYear + 1}-01-31`,
          is_current: true,
        })
        .select()
        .single();

      if (yearError) throw yearError;

      // 3. 创建第二学期
      await supabase.from("academic_terms").insert({
        academic_year: `${data.startYear}-${data.startYear + 1}`,
        semester: "第二学期",
        start_date: `${data.startYear + 1}-02-01`,
        end_date: `${data.startYear + 1}-07-15`,
        is_current: false,
      });

      // 4. 创建学科
      for (const subject of data.subjects) {
        const subjectName =
          subjectOptions.find((s) => s.value === subject)?.label || subject;
        await supabase.from("subjects").upsert(
          {
            subject_code: subject,
            subject_name: subjectName,
            is_required: true,
          },
          { onConflict: "subject_code", ignoreDuplicates: true }
        );
      }

      // 5. 创建班级（如果年级数量和每年级班级数不为0）
      if (data.gradesCount && data.classesPerGrade) {
        for (let grade = 1; grade <= data.gradesCount; grade++) {
          const gradeNumber = getGradeName(grade, data.educationStage);

          for (let classNum = 1; classNum <= data.classesPerGrade; classNum++) {
            const className = `${gradeNumber}${classNum}班`;

            await supabase.from("class_info").upsert(
              {
                class_name: className,
                grade_level: gradeNumber,
                academic_year: `${data.startYear}-${data.startYear + 1}`,
                student_count: 0,
              },
              { onConflict: "class_name", ignoreDuplicates: true }
            );
          }
        }
      }

      // 6. 创建通知设置
      await supabase.from("notification_settings").upsert(
        {
          user_id: userId,
          email_notifications: data.enableNotifications,
          push_notifications: data.enableNotifications,
        },
        { onConflict: "user_id" }
      );
    } catch (error) {
      console.error("保存数据失败:", error);
      throw error;
    }
  };

  // 根据年级索引和教育阶段获取年级名称
  const getGradeName = (index: number, stage: string) => {
    const primaryNames = [
      "一年级",
      "二年级",
      "三年级",
      "四年级",
      "五年级",
      "六年级",
    ];
    const middleNames = ["初一", "初二", "初三"];
    const highNames = ["高一", "高二", "高三"];
    const collegeNames = ["大一", "大二", "大三", "大四"];

    if (stage === "primary" && index <= primaryNames.length) {
      return primaryNames[index - 1];
    } else if (stage === "middle" && index <= middleNames.length) {
      return middleNames[index - 1];
    } else if (stage === "high" && index <= highNames.length) {
      return highNames[index - 1];
    } else if (stage === "university" && index <= collegeNames.length) {
      return collegeNames[index - 1];
    } else {
      return `第${index}级`;
    }
  };

  // 渲染步骤内容
  const renderStepContent = () => {
    const steps = [
      // 个人信息
      <Form key="personal" {...personalInfoForm}>
        <form
          onSubmit={personalInfoForm.handleSubmit(handleNext)}
          className="space-y-6"
        >
          <div className="space-y-4">
            <FormField
              control={personalInfoForm.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>姓名</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入您的姓名" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={personalInfoForm.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>您的角色</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择您的角色" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="teacher">教师</SelectItem>
                      <SelectItem value="student">学生</SelectItem>
                      <SelectItem value="admin">管理员</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={personalInfoForm.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>联系电话</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入您的联系电话" {...field} />
                  </FormControl>
                  <FormDescription>选填</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={personalInfoForm.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>个人简介</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="请简单介绍一下您自己"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>选填</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit">下一步</Button>
          </div>
        </form>
      </Form>,

      // 学校信息
      <Form key="step1" {...step1Form}>
        <form
          onSubmit={step1Form.handleSubmit(handleNext)}
          className="space-y-6"
        >
          <div className="space-y-4">
            <FormField
              control={step1Form.control}
              name="schoolName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>学校/机构名称</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入学校名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={step1Form.control}
              name="educationStage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>教育阶段</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择教育阶段" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {educationStages.map((stage) => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={handleBack}>
              上一步
            </Button>
            <Button type="submit">下一步</Button>
          </div>
        </form>
      </Form>,

      // 教育结构
      <Form key="step2" {...step2Form}>
        <form
          onSubmit={step2Form.handleSubmit(handleNext)}
          className="space-y-6"
        >
          <div className="space-y-4">
            <FormField
              control={step2Form.control}
              name="gradesCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>年级数量</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" max="12" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={step2Form.control}
              name="classesPerGrade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>每年级班级数</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" max="20" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={step2Form.control}
              name="startYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>学年开始年份</FormLabel>
                  <FormControl>
                    <Input type="number" min="2000" max="2100" {...field} />
                  </FormControl>
                  <FormDescription>
                    例如：输入2023表示2023-2024学年
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={handleBack}>
              上一步
            </Button>
            <Button type="submit">下一步</Button>
          </div>
        </form>
      </Form>,

      // 学科设置
      <Form key="step3" {...step3Form}>
        <form
          onSubmit={step3Form.handleSubmit(handleNext)}
          className="space-y-6"
        >
          <div className="space-y-2">
            <FormField
              control={step3Form.control}
              name="subjects"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">选择学科</FormLabel>
                    <FormDescription>
                      勾选需要管理的学科，后续可在设置中修改
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {subjectOptions.map((subject) => (
                      <FormField
                        key={subject.value}
                        control={step3Form.control}
                        name="subjects"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={subject.value}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(subject.value)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([
                                          ...field.value,
                                          subject.value,
                                        ])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== subject.value
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {subject.label}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={handleBack}>
              上一步
            </Button>
            <Button type="submit">下一步</Button>
          </div>
        </form>
      </Form>,

      // 完成设置
      <Form key="step4" {...step4Form}>
        <form
          onSubmit={step4Form.handleSubmit(handleFinalSubmit)}
          className="space-y-6"
        >
          <div className="space-y-4">
            <FormField
              control={step4Form.control}
              name="enableNotifications"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>启用通知</FormLabel>
                    <FormDescription>
                      接收作业、成绩和系统相关的通知
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={step4Form.control}
              name="dataImportOption"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>数据导入选项</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="now" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          现在立即导入学生和成绩数据
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="later" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          稍后从系统菜单导入数据
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-md border p-4 bg-yellow-50">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-yellow-100 p-1">
                  <Bookmark className="h-5 w-5 text-yellow-700" />
                </div>
                <p className="text-sm font-medium text-yellow-700">
                  初始化说明
                </p>
              </div>
              <div className="mt-2 text-sm text-yellow-600 pl-9">
                <p>完成设置后，系统将为您初始化以下内容：</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>根据设置创建班级结构</li>
                  <li>创建学科配置</li>
                  <li>设置学年和学期</li>
                  <li>配置个人信息和通知设置</li>
                </ul>
              </div>
            </div>

            <FormField
              control={step4Form.control}
              name="confirmSetup"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>确认设置</FormLabel>
                    <FormDescription>
                      我已确认上述信息，准备完成系统设置
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={handleBack}>
              上一步
            </Button>
            <Button
              type="submit"
              disabled={!step4Form.getValues().confirmSetup || isSubmitting}
            >
              {isSubmitting ? "处理中..." : "完成设置"}
            </Button>
          </div>
        </form>
      </Form>,
    ];

    return steps[currentStep];
  };

  const stepIcons = [
    <UserCircle key="user" className="h-6 w-6" />,
    <School key="school" className="h-6 w-6" />,
    <Building2 key="building" className="h-6 w-6" />,
    <BookOpen key="book" className="h-6 w-6" />,
    <Bookmark key="finish" className="h-6 w-6" />,
  ];

  const stepTitles = [
    "个人信息",
    "学校信息",
    "教育结构",
    "学科设置",
    "完成设置",
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center mb-2">
            <CardTitle className="text-2xl font-bold">
              欢迎使用教育分析系统
            </CardTitle>
            <div className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-medium">
              步骤 {currentStep + 1}/{stepIcons.length}
            </div>
          </div>
          <CardDescription>
            请完成以下设置步骤，帮助我们为您提供个性化的体验
          </CardDescription>

          <div className="flex justify-between items-center mt-6 mb-2">
            {stepTitles.map((title, index) => (
              <div
                key={index}
                className={`flex flex-col items-center ${
                  index < currentStep
                    ? "text-primary"
                    : index === currentStep
                      ? "text-primary font-medium"
                      : "text-muted-foreground"
                }`}
              >
                <div
                  className={`rounded-full p-2 mb-1 ${
                    index < currentStep
                      ? "bg-primary/20"
                      : index === currentStep
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                  }`}
                >
                  {stepIcons[index]}
                </div>
                <span className="text-xs whitespace-nowrap">{title}</span>
              </div>
            ))}
          </div>

          <div className="relative mt-1 mb-6">
            <div className="absolute top-0 left-0 right-0 h-1 bg-muted rounded-full" />
            <div
              className="absolute top-0 left-0 h-1 bg-primary rounded-full transition-all duration-300"
              style={{
                width: `${(currentStep / (stepIcons.length - 1)) * 100}%`,
              }}
            />
          </div>
        </CardHeader>

        <CardContent>{renderStepContent()}</CardContent>
      </Card>
    </div>
  );
}

export default OnboardingWizard;
