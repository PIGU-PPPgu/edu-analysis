import React, { useState, useEffect, useCallback } from 'react';
import { UseFormReturn, FieldPath, FieldValues } from 'react-hook-form';
import { CheckCircle, AlertCircle, Info, Eye, EyeOff, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

// 表单字段强度指示器
interface FieldStrengthProps {
  value: string;
  rules: {
    minLength?: number;
    hasUppercase?: boolean;
    hasLowercase?: boolean;
    hasNumber?: boolean;
    hasSpecialChar?: boolean;
  };
}

const FieldStrength: React.FC<FieldStrengthProps> = ({ value, rules }) => {
  const checks = [
    { 
      key: 'length', 
      test: () => value.length >= (rules.minLength || 8), 
      label: `至少${rules.minLength || 8}个字符` 
    },
    { 
      key: 'uppercase', 
      test: () => !rules.hasUppercase || /[A-Z]/.test(value), 
      label: '包含大写字母' 
    },
    { 
      key: 'lowercase', 
      test: () => !rules.hasLowercase || /[a-z]/.test(value), 
      label: '包含小写字母' 
    },
    { 
      key: 'number', 
      test: () => !rules.hasNumber || /\d/.test(value), 
      label: '包含数字' 
    },
    { 
      key: 'special', 
      test: () => !rules.hasSpecialChar || /[!@#$%^&*(),.?":{}|<>]/.test(value), 
      label: '包含特殊字符' 
    }
  ].filter(check => {
    // 只显示启用的规则
    if (check.key === 'length') return true;
    if (check.key === 'uppercase') return rules.hasUppercase;
    if (check.key === 'lowercase') return rules.hasLowercase;
    if (check.key === 'number') return rules.hasNumber;
    if (check.key === 'special') return rules.hasSpecialChar;
    return false;
  });

  const passedChecks = checks.filter(check => check.test()).length;
  const strength = (passedChecks / checks.length) * 100;

  const getStrengthColor = () => {
    if (strength < 40) return 'bg-red-500';
    if (strength < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (strength < 40) return '弱';
    if (strength < 70) return '中等';
    return '强';
  };

  if (!value) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center space-x-2">
        <div className="flex-1">
          <Progress value={strength} className="h-2" />
        </div>
        <span className="text-xs font-medium text-gray-600">
          强度: {getStrengthText()}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-1">
        {checks.map((check) => (
          <div key={check.key} className="flex items-center space-x-2">
            {check.test() ? (
              <CheckCircle className="w-3 h-3 text-green-500" />
            ) : (
              <AlertCircle className="w-3 h-3 text-gray-400" />
            )}
            <span className={cn(
              'text-xs',
              check.test() ? 'text-green-600' : 'text-gray-500'
            )}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 增强的密码输入框
interface EnhancedPasswordInputProps {
  form: UseFormReturn<any>;
  name: string;
  label: string;
  placeholder?: string;
  description?: string;
  showStrength?: boolean;
  strengthRules?: FieldStrengthProps['rules'];
  required?: boolean;
}

export const EnhancedPasswordInput: React.FC<EnhancedPasswordInputProps> = ({
  form,
  name,
  label,
  placeholder = '请输入密码',
  description,
  showStrength = false,
  strengthRules = { minLength: 8 },
  required = false
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const watchedValue = form.watch(name) || '';

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel className="flex items-center space-x-1">
            <span>{label}</span>
            {required && <span className="text-red-500">*</span>}
          </FormLabel>
          <FormControl>
            <div className="relative">
              <Input
                {...field}
                type={showPassword ? 'text' : 'password'}
                placeholder={placeholder}
                className={cn(
                  'pr-10',
                  fieldState.error && 'border-red-500 focus:border-red-500',
                  !fieldState.error && field.value && 'border-green-500 focus:border-green-500'
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </FormControl>
          {description && (
            <FormDescription>{description}</FormDescription>
          )}
          {showStrength && (
            <FieldStrength value={watchedValue} rules={strengthRules} />
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

// 实时验证输入框
interface RealTimeValidationInputProps {
  form: UseFormReturn<any>;
  name: string;
  label: string;
  placeholder?: string;
  description?: string;
  type?: 'text' | 'email' | 'number';
  required?: boolean;
  validationFn?: (value: string) => Promise<string | null>;
  debounceMs?: number;
}

export const RealTimeValidationInput: React.FC<RealTimeValidationInputProps> = ({
  form,
  name,
  label,
  placeholder,
  description,
  type = 'text',
  required = false,
  validationFn,
  debounceMs = 500
}) => {
  const [validationState, setValidationState] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [validationMessage, setValidationMessage] = useState<string>('');
  const watchedValue = form.watch(name) || '';

  const validateValue = useCallback(async (value: string) => {
    if (!validationFn || !value) {
      setValidationState('idle');
      return;
    }

    setValidationState('validating');
    
    try {
      const result = await validationFn(value);
      if (result) {
        setValidationState('invalid');
        setValidationMessage(result);
      } else {
        setValidationState('valid');
        setValidationMessage('');
      }
    } catch (error) {
      setValidationState('invalid');
      setValidationMessage('验证失败，请重试');
    }
  }, [validationFn]);

  useEffect(() => {
    const timer = setTimeout(() => {
      validateValue(watchedValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [watchedValue, validateValue, debounceMs]);

  const getValidationIcon = () => {
    switch (validationState) {
      case 'validating':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'invalid':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel className="flex items-center space-x-1">
            <span>{label}</span>
            {required && <span className="text-red-500">*</span>}
          </FormLabel>
          <FormControl>
            <div className="relative">
              <Input
                {...field}
                type={type}
                placeholder={placeholder}
                className={cn(
                  'pr-10',
                  fieldState.error && 'border-red-500 focus:border-red-500',
                  validationState === 'valid' && 'border-green-500 focus:border-green-500',
                  validationState === 'invalid' && 'border-red-500 focus:border-red-500'
                )}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {getValidationIcon()}
              </div>
            </div>
          </FormControl>
          {description && (
            <FormDescription>{description}</FormDescription>
          )}
          {validationState === 'invalid' && validationMessage && (
            <p className="text-sm text-red-600 mt-1">{validationMessage}</p>
          )}
          {validationState === 'valid' && (
            <p className="text-sm text-green-600 mt-1">✓ 验证通过</p>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

// 自动保存表单包装器
interface AutoSaveFormProps {
  children: React.ReactNode;
  onSave: (data: any) => Promise<void>;
  form: UseFormReturn<any>;
  saveInterval?: number;
  className?: string;
}

export const AutoSaveForm: React.FC<AutoSaveFormProps> = ({
  children,
  onSave,
  form,
  saveInterval = 30000, // 30秒
  className
}) => {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const saveData = useCallback(async () => {
    const formData = form.getValues();
    
    // 检查表单是否有变化
    if (!form.formState.isDirty) return;

    setIsSaving(true);
    try {
      await onSave(formData);
      setLastSaved(new Date());
      form.reset(formData); // 重置dirty状态
      
      toast({
        title: '自动保存成功',
        description: '您的更改已自动保存',
        duration: 2000,
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
      toast({
        title: '自动保存失败',
        description: '请手动保存您的更改',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setIsSaving(false);
    }
  }, [form, onSave, toast]);

  useEffect(() => {
    const interval = setInterval(saveData, saveInterval);
    return () => clearInterval(interval);
  }, [saveData, saveInterval]);

  // 页面卸载前保存
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (form.formState.isDirty) {
        e.preventDefault();
        e.returnValue = '您有未保存的更改，确定要离开吗？';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [form.formState.isDirty]);

  return (
    <div className={className}>
      {/* 自动保存状态指示器 */}
      <div className="flex items-center justify-between mb-4 p-2 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          {isSaving ? (
            <>
              <Save className="w-4 h-4 text-blue-500 animate-pulse" />
              <span className="text-sm text-blue-600">正在保存...</span>
            </>
          ) : lastSaved ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600">
                上次保存: {lastSaved.toLocaleTimeString()}
              </span>
            </>
          ) : (
            <>
              <Info className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">自动保存已启用</span>
            </>
          )}
        </div>
        
        {form.formState.isDirty && (
          <Badge variant="outline" className="text-orange-600 border-orange-300">
            有未保存的更改
          </Badge>
        )}
      </div>

      {children}
    </div>
  );
};

// 表单进度指示器
interface FormProgressProps {
  form: UseFormReturn<any>;
  requiredFields: string[];
  className?: string;
}

export const FormProgress: React.FC<FormProgressProps> = ({
  form,
  requiredFields,
  className
}) => {
  const watchedValues = form.watch();
  
  const completedFields = requiredFields.filter(field => {
    const value = watchedValues[field];
    return value && value.toString().trim() !== '';
  });

  const progress = (completedFields.length / requiredFields.length) * 100;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">表单完成度</span>
        <span className="text-sm text-gray-600">
          {completedFields.length}/{requiredFields.length}
        </span>
      </div>
      <Progress value={progress} className="h-2" />
      <p className="text-xs text-gray-500">
        {progress === 100 ? '表单已完成，可以提交' : `还需要填写 ${requiredFields.length - completedFields.length} 个必填字段`}
      </p>
    </div>
  );
}; 