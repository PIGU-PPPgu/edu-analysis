import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  getClassStudents,
  getClassHomeworks,
} from "../classService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// 模拟依赖
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("班级服务测试", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAllClasses", () => {
    it("成功获取所有班级", async () => {
      const mockData = [
        { id: "1", name: "高一(1)班", grade: "高一" },
        { id: "2", name: "高一(2)班", grade: "高一" },
      ];

      // 设置模拟返回
      vi.spyOn(supabase, "from").mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      } as any);

      const result = await getAllClasses();

      expect(supabase.from).toHaveBeenCalledWith("classes");
      expect(result).toEqual(mockData);
    });

    it("获取班级失败时返回空数组并显示错误提示", async () => {
      const mockError = { message: "获取班级失败" };

      // 设置模拟返回
      vi.spyOn(supabase, "from").mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
        }),
      } as any);

      const result = await getAllClasses();

      expect(supabase.from).toHaveBeenCalledWith("classes");
      expect(toast.error).toHaveBeenCalledWith(
        `获取班级列表失败: ${mockError.message}`
      );
      expect(result).toEqual([]);
    });
  });

  describe("getClassById", () => {
    it("成功获取班级详情", async () => {
      const mockData = { id: "1", name: "高一(1)班", grade: "高一" };

      // 设置模拟返回
      vi.spyOn(supabase, "from").mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      } as any);

      const result = await getClassById("1");

      expect(supabase.from).toHaveBeenCalledWith("classes");
      expect(result).toEqual(mockData);
    });

    it("获取班级详情失败时返回null并显示错误提示", async () => {
      const mockError = { message: "获取班级详情失败" };

      // 设置模拟返回
      vi.spyOn(supabase, "from").mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
          }),
        }),
      } as any);

      const result = await getClassById("1");

      expect(supabase.from).toHaveBeenCalledWith("classes");
      expect(toast.error).toHaveBeenCalledWith(
        `获取班级详情失败: ${mockError.message}`
      );
      expect(result).toBeNull();
    });
  });

  describe("createClass", () => {
    it("成功创建班级", async () => {
      const mockData = [{ id: "1", name: "高一(1)班", grade: "高一" }];
      const classData = { name: "高一(1)班", grade: "高一" };

      // 设置模拟返回
      vi.spyOn(supabase, "from").mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      } as any);

      const result = await createClass(classData);

      expect(supabase.from).toHaveBeenCalledWith("classes");
      expect(toast.success).toHaveBeenCalledWith("班级创建成功");
      expect(result).toEqual(mockData[0]);
    });

    it("创建班级失败时返回null并显示错误提示", async () => {
      const mockError = { message: "创建班级失败" };
      const classData = { name: "高一(1)班", grade: "高一" };

      // 设置模拟返回
      vi.spyOn(supabase, "from").mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: null, error: mockError }),
        }),
      } as any);

      const result = await createClass(classData);

      expect(supabase.from).toHaveBeenCalledWith("classes");
      expect(toast.error).toHaveBeenCalledWith(
        `创建班级失败: ${mockError.message}`
      );
      expect(result).toBeNull();
    });
  });

  // 更多测试用例可以按照类似的模式添加...
});
