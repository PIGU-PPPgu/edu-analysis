import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FormState, termFormSchema, TermFormValues } from "./types";
import { AcademicTermForm } from "./AcademicTermForm";
import { ClassInfoForm } from "./ClassInfoForm";
import { SubjectsForm } from "./SubjectsForm";

export const OnboardingWizard = () => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const [formState, setFormState] = useState<FormState>({
    academicYear: "",
    semester: "",
    startDate: new Date(),
    endDate: new Date(),
    grade: "",
    className: "",
  });

  const termForm = useForm<TermFormValues>({
    resolver: zodResolver(termFormSchema),
    defaultValues: {
      academicYear: "",
      semester: undefined,
      startDate: undefined,
      endDate: undefined,
      grade: "",
      className: "",
      subjects: [],
    },
  });

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const { data: termsData, error: termsError } = await supabase
          .from("academic_terms")
          .select("*")
          .order("start_date", { ascending: false })
          .limit(1);

        if (termsError) {
          console.error("Failed to fetch academic terms:", termsError);
          toast.error("错误", {
            description: "无法加载学年信息，请重试。",
          });
          return;
        }

        if (termsData && termsData.length > 0) {
          // If there's existing data, redirect to the dashboard
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Failed to load initial data:", error);
        toast.error("错误", {
          description: "初始化失败，请检查网络连接。",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [navigate]);

  const nextStep = () => {
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState({
      ...formState,
      [e.target.name]: e.target.value,
    });
  };

  const handleTermSubmit = async (values: TermFormValues) => {
    setIsSaving(true);
    try {
      // Extract values from the form
      const {
        academicYear,
        semester,
        startDate,
        endDate,
        className,
        grade,
        subjects,
      } = values;

      // Insert academic term
      const { data: insertedTerm, error: insertTermError } = await supabase
        .from("academic_terms")
        .insert({
          academic_year: academicYear,
          semester: semester,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          is_current: true,
        })
        .select();

      if (insertTermError) {
        console.error("Failed to insert academic term:", insertTermError);
        toast.error("错误", {
          description: "无法保存学年信息，请重试。",
        });
        return;
      }

      // Insert class
      const { data: insertedClass, error: insertClassError } = await supabase
        .from("classes")
        .insert({
          name: className,
          grade: grade,
        })
        .select();

      if (insertClassError) {
        console.error("Failed to insert class:", insertClassError);
        toast.error("错误", {
          description: "无法保存班级信息，请重试。",
        });
        return;
      }

      // Insert subjects
      const subjectsToInsert = subjects.map((subjectName) => ({
        subject_name: subjectName,
        subject_code:
          subjectName.substring(0, 2).toUpperCase() +
          Math.floor(Math.random() * 1000),
      }));

      const { error: insertSubjectsError } = await supabase
        .from("subjects")
        .insert(subjectsToInsert);

      if (insertSubjectsError) {
        console.error("Failed to insert subjects:", insertSubjectsError);
        toast.error("错误", {
          description: "无法保存科目信息，请重试。",
        });
        return;
      }

      toast.success("初始化完成", {
        description: "学年、班级和科目信息已成功保存。",
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to submit term form:", error);
      toast.error("错误", {
        description: "提交失败，请检查网络连接。",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <AcademicTermForm
            formState={formState}
            setFormState={setFormState}
            handleInputChange={handleInputChange}
          />
        );
      case 2:
        return (
          <ClassInfoForm
            formState={formState}
            handleInputChange={handleInputChange}
          />
        );
      case 3:
        return <SubjectsForm termForm={termForm} />;
      default:
        return <div>未知步骤</div>;
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mx-auto w-full sm:w-3/4 lg:w-1/2 space-y-6">
        <h2 className="text-2xl font-bold text-center">欢迎来到智慧教育平台</h2>
        {isLoading ? (
          <p className="text-center">加载中，请稍候...</p>
        ) : (
          <>
            {renderStepContent()}
            <div className="flex justify-between">
              {step > 1 && (
                <Button variant="secondary" onClick={prevStep}>
                  返回
                </Button>
              )}
              {step < 3 ? (
                <Button onClick={nextStep}>下一步</Button>
              ) : (
                <Form {...termForm}>
                  <form
                    onSubmit={termForm.handleSubmit(handleTermSubmit)}
                    className="space-y-4"
                  >
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? "保存中..." : "完成初始化"}
                    </Button>
                  </form>
                </Form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OnboardingWizard;
