
import React, { createContext, useContext, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { AuthFormData } from './types';

interface AuthContextType {
  form: UseFormReturn<AuthFormData>;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  otpSent: boolean;
  setOtpSent: (value: boolean) => void;
  onSendOTP: () => void;
  onSwitchMethod: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  value: Omit<AuthContextType, 'setIsSubmitting' | 'setOtpSent'> & {
    isSubmitting: boolean;
    otpSent: boolean;
  };
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ value, children }) => {
  const [isSubmitting, setIsSubmitting] = useState(value.isSubmitting);
  const [otpSent, setOtpSent] = useState(value.otpSent);

  const contextValue: AuthContextType = {
    ...value,
    isSubmitting,
    setIsSubmitting,
    otpSent,
    setOtpSent,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
