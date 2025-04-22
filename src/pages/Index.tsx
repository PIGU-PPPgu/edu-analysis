import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import AnimatedBackground from "@/components/home/AnimatedBackground";
import { toast } from "sonner";
import { supabase, signInWithWechat } from "@/utils/auth";

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserSession = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
    };
    
    checkUserSession();
    
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });
    
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithWechat();
    } catch (error) {
      console.error('登录失败:', error);
      toast.error("登录失败，请重试");
    }
  };

  const handleFreeLogin = () => {
    navigate('/grade-analysis');
  };

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="container mx-auto px-4 py-12 relative">
        <Hero 
          isLoggedIn={isLoggedIn} 
          onLogin={handleLogin} 
          onWechatLogin={handleLogin}
          onFreeLogin={handleFreeLogin}
        />
        <Features />
      </div>
    </div>
  );
};

export default Index;
