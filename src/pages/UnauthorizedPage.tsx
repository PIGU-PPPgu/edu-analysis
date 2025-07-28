import React from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar showMainNav={false} />
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">访问被拒绝</h1>
          <p className="text-muted-foreground mb-6">
            很抱歉，您没有权限访问此页面。如需获取权限，请联系管理员。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => navigate(-1)}>返回上一页</Button>
            <Button variant="outline" onClick={() => navigate("/")}>
              返回首页
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
