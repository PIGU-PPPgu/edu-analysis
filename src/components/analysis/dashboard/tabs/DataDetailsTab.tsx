import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import StatisticsOverview from "@/components/analysis/statistics/StatisticsOverview";
import OptimizedDataTable from "@/components/performance/OptimizedDataTable";
import ErrorBoundary from "@/components/performance/ErrorBoundary";

interface DataDetailsTabProps {
  filteredGradeData: any[];
  loading: boolean;
  examIds?: string[];
  classFilter?: string[];
  subjectFilter?: string[];
}

const DataDetailsTab: React.FC<DataDetailsTabProps> = ({
  filteredGradeData,
  loading,
  examIds,
  classFilter,
  subjectFilter,
}) => {
  return (
    <div className="space-y-6">
      <ErrorBoundary
        componentName="StatisticsOverview"
        enableRecovery={true}
        showErrorDetails={true}
      >
        <StatisticsOverview
          examId={examIds?.length === 1 ? examIds[0] : undefined}
          classFilter={classFilter}
          subjectFilter={subjectFilter}
          className=""
        />
      </ErrorBoundary>

      <ErrorBoundary
        componentName="OptimizedDataTable"
        enableRecovery={true}
        showErrorDetails={true}
      >
        <OptimizedDataTable
          data={filteredGradeData}
          columns={[
            {
              key: "name",
              title: "姓名",
              dataIndex: "name",
              width: 120,
              sortable: true,
              fixed: "left",
            },
            {
              key: "class_name",
              title: "班级",
              dataIndex: "class_name",
              width: 100,
              sortable: true,
              filterable: true,
            },
            {
              key: "subject",
              title: "科目",
              dataIndex: "subject",
              width: 80,
              sortable: true,
              filterable: true,
            },
            {
              key: "score",
              title: "分数",
              dataIndex: "score",
              width: 80,
              sortable: true,
              align: "center",
              render: (value: number) => (
                <Badge
                  className={cn(
                    "font-bold border-2 border-black",
                    value >= 90
                      ? "bg-[#B9FF66] text-black"
                      : value >= 60
                        ? "bg-[#6B7280] text-white"
                        : "bg-[#191A23] text-white"
                  )}
                >
                  {value}分
                </Badge>
              ),
            },
            {
              key: "exam_title",
              title: "考试",
              dataIndex: "exam_title",
              width: 150,
              sortable: true,
              ellipsis: true,
            },
            {
              key: "exam_date",
              title: "考试日期",
              dataIndex: "exam_date",
              width: 120,
              sortable: true,
              render: (value: string) =>
                value ? new Date(value).toLocaleDateString() : "-",
            },
            {
              key: "exam_type",
              title: "考试类型",
              dataIndex: "exam_type",
              width: 100,
              filterable: true,
              render: (value: string) => (
                <Badge
                  variant="outline"
                  className="border-2 border-black font-bold"
                >
                  {value || "常规"}
                </Badge>
              ),
            },
          ]}
          config={{
            virtual: filteredGradeData.length > 500,
            itemHeight: 60,
            pageSize: filteredGradeData.length > 2000 ? 25 : 50,
            showPagination: true,
            showSearch: true,
            showFilter: true,
            showColumnSettings: true,
            searchKeys: ["name", "class_name", "subject", "exam_title"],
            stickyHeader: true,
            bordered: filteredGradeData.length < 1000,
            striped: filteredGradeData.length < 1000,
            compact: filteredGradeData.length > 1000,
          }}
          title="成绩数据详情"
          showExport={true}
          loading={loading}
          emptyText="暂无成绩数据"
          rowKey="id"
          className=""
        />
      </ErrorBoundary>
    </div>
  );
};

export default DataDetailsTab;
