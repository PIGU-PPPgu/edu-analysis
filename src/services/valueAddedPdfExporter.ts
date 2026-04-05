/**
 * 增值评价报告PDF导出服务
 * 使用 html2pdf.js 导出包含图表的完整报告
 */

import html2pdf from "html2pdf.js";

export interface ValueAddedPdfOptions {
  filename?: string;
  format?: "a4" | "letter";
  orientation?: "portrait" | "landscape";
}

export class ValueAddedPdfExporter {
  /**
   * 从DOM元素导出PDF（保留所有图表和样式）
   */
  async exportFromElement(
    element: HTMLElement,
    reportTitle: string,
    options: ValueAddedPdfOptions = {}
  ): Promise<void> {
    const {
      filename = `${reportTitle}_${new Date().toLocaleDateString("zh-CN").replace(/\//g, "-")}.pdf`,
      format = "a4",
      orientation = "portrait",
    } = options;

    try {
      // 克隆元素避免修改原始DOM
      const clonedElement = element.cloneNode(true) as HTMLElement;

      // 创建包装容器
      const wrapper = document.createElement("div");
      wrapper.style.position = "absolute";
      wrapper.style.left = "0";
      wrapper.style.top = window.scrollY + "px";
      wrapper.style.width = "210mm"; // A4宽度
      wrapper.style.zIndex = "99999";
      wrapper.style.background = "white";
      wrapper.style.overflow = "visible";
      wrapper.style.margin = "0 auto";

      clonedElement.style.width = "100%";
      clonedElement.style.padding = "10mm";
      clonedElement.style.background = "white";
      clonedElement.style.position = "relative";
      clonedElement.style.overflow = "visible";
      clonedElement.style.height = "auto";
      clonedElement.style.maxHeight = "none";
      clonedElement.style.opacity = "1";
      clonedElement.style.boxSizing = "border-box";

      wrapper.appendChild(clonedElement);

      // 添加分页控制样式
      const style = document.createElement("style");
      style.textContent = `
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
        }

        * {
          box-sizing: border-box;
        }

        .no-page-break {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        .page-break-before {
          page-break-before: always !important;
          break-before: page !important;
        }

        /* 确保图表容器不被截断 */
        .recharts-wrapper,
        .recharts-surface,
        .recharts-responsive-container {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          margin-bottom: 10px;
        }

        /* 确保卡片不被截断 */
        [class*="Card"],
        [class*="card"],
        section,
        article {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          margin-bottom: 10px;
        }

        /* 标题不要单独在页尾 */
        h1, h2, h3, h4, h5, h6 {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }

        /* 表格不被截断 */
        table {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        /* 隐藏导出按钮 */
        button {
          display: none !important;
        }
      `;
      wrapper.appendChild(style);

      // 移除所有子元素的高度限制，确保完整内容可见
      const allChildren = clonedElement.querySelectorAll("*");
      allChildren.forEach((child) => {
        const el = child as HTMLElement;
        if (el.style.maxHeight || el.style.height) {
          el.style.height = "auto";
          el.style.maxHeight = "none";
        }
        if (
          el.style.overflow === "hidden" ||
          el.style.overflow === "scroll" ||
          el.style.overflow === "auto"
        ) {
          el.style.overflow = "visible";
        }
      });

      // 隐藏滚动条
      const scrollbars = clonedElement.querySelectorAll(
        "[data-radix-scroll-area-viewport]"
      );
      scrollbars.forEach((sb) => {
        (sb as HTMLElement).style.overflow = "visible";
        (sb as HTMLElement).style.height = "auto";
        (sb as HTMLElement).style.maxHeight = "none";
      });

      // 隐藏按钮
      const buttons = clonedElement.querySelectorAll("button");
      buttons.forEach((btn) => {
        (btn as HTMLElement).style.display = "none";
      });

      // 添加到DOM
      document.body.appendChild(wrapper);

      // 等待图表渲染完成
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 获取实际内容尺寸
      let actualHeight = wrapper.scrollHeight;
      let actualWidth = wrapper.scrollWidth;

      if (actualHeight === 0) {
        actualHeight = wrapper.offsetHeight;
      }
      if (actualWidth === 0) {
        actualWidth = wrapper.offsetWidth || 794; // A4宽度约794px
      }

      // 确保最小尺寸
      actualHeight = Math.max(actualHeight, 500);
      actualWidth = Math.max(actualWidth, 794);

      // 配置PDF选项
      const opt = {
        margin: [8, 8, 8, 8],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
          backgroundColor: "#ffffff",
          scrollY: -window.scrollY,
          scrollX: -window.scrollX,
          width: actualWidth,
          height: actualHeight,
          x: 0,
          y: 0,
          windowWidth: actualWidth,
          windowHeight: actualHeight,
        },
        jsPDF: {
          unit: "mm",
          format,
          orientation,
          compress: true,
        },
        pagebreak: {
          mode: ["css", "legacy"],
          before: [".page-break-before"],
          after: [".page-break-after"],
          avoid: [
            ".no-page-break",
            ".recharts-wrapper",
            ".recharts-surface",
            ".recharts-responsive-container",
            "[class*='Card']",
            "table",
            "section",
            "article",
          ],
        },
      };

      // 生成PDF
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await html2pdf()
        .set(opt as any)
        .from(wrapper)
        .save();

      // 清理
      document.body.removeChild(wrapper);
    } catch (error) {
      console.error("❌ PDF导出失败:", error);
      throw new Error("PDF导出失败，请重试");
    }
  }

  /**
   * 导出班级增值报告
   */
  async exportClassReport(
    element: HTMLElement,
    className: string,
    subject: string
  ): Promise<void> {
    return this.exportFromElement(
      element,
      `班级增值报告_${className}_${subject}`,
      {
        orientation: "portrait",
      }
    );
  }

  /**
   * 导出教师增值报告
   */
  async exportTeacherReport(
    element: HTMLElement,
    teacherName: string,
    subject: string
  ): Promise<void> {
    return this.exportFromElement(
      element,
      `教师增值报告_${teacherName}_${subject}`,
      {
        orientation: "portrait",
      }
    );
  }

  /**
   * 导出学生增值报告
   */
  async exportStudentReport(
    element: HTMLElement,
    studentName: string
  ): Promise<void> {
    return this.exportFromElement(element, `学生增值报告_${studentName}`, {
      orientation: "portrait",
    });
  }

  /**
   * 导出学科均衡报告
   */
  async exportSubjectBalanceReport(
    element: HTMLElement,
    className: string
  ): Promise<void> {
    return this.exportFromElement(element, `学科均衡报告_${className}`, {
      orientation: "landscape", // 学科均衡报告使用横向布局
    });
  }
}

// 导出单例
export const valueAddedPdfExporter = new ValueAddedPdfExporter();
