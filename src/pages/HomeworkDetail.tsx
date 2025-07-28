import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import HomeworkDetailComponent from "@/components/homework/HomeworkDetail";
import Navbar from "@/components/shared/Navbar";

const HomeworkDetailPage = () => {
  const { homeworkId } = useParams<{ homeworkId: string }>();

  useEffect(() => {
    console.log("HomeworkDetailPage 加载 - homeworkId:", homeworkId);
  }, [homeworkId]);

  if (!homeworkId) {
    return (
      <>
        <Navbar />
        <div className="container py-6">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-red-500">作业ID无效</h2>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container py-6">
        <HomeworkDetailComponent homeworkId={homeworkId} />
      </div>
    </div>
  );
};

export default HomeworkDetailPage;
