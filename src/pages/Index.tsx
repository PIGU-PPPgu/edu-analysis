
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import { toast } from "sonner";

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
    toast.success("登录成功");
  };

  const handleWechatLogin = () => {
    setIsLoggedIn(true);
    toast.success("微信登录成功");
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <Hero 
        isLoggedIn={isLoggedIn} 
        onLogin={handleLogin} 
        onWechatLogin={handleWechatLogin} 
      />
      <Features />
    </div>
  );
};

// Add default export
export default Index;
