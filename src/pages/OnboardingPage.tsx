import React, { useEffect, useState } from 'react';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export function OnboardingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    async function checkSetupStatus() {
      try {
        setIsLoading(true);
        
        // 检查用户是否已登录
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }
        
        // 检查用户是否已完成设置
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('preferences')
          .eq('id', user.id)
          .single();
          
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('获取用户资料失败:', profileError);
        }
        
        // 如果用户已完成设置，重定向到主页
        if (profile && profile.preferences && profile.preferences.setup_completed) {
          navigate('/dashboard');
          return;
        }
        
        // 需要设置
        setNeedsSetup(true);
      } catch (error) {
        console.error('检查设置状态失败:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    checkSetupStatus();
  }, [navigate]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-muted/40">
      {needsSetup && <OnboardingWizard />}
    </div>
  );
}

export default OnboardingPage; 