/**
 * Switch 开关组件
 * 提供开关切换功能
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface SwitchProps {
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const Switch: React.FC<SwitchProps> = ({
  id,
  checked = false,
  onCheckedChange,
  disabled = false,
      className
}) => {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange?.(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full border-2 border-black transition-colors focus:outline-none focus:ring-2 focus:ring-[#B9FF66] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-[#B9FF66]" : "bg-gray-200",
        className
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white border-2 border-black transition-transform shadow-[1px_1px_0px_0px_#191A23]",
          checked ? "translate-x-5" : "translate-x-0"
      )}
    />
    </button>
  );
};

export { Switch };
