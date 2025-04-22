
import React, { createContext, useContext } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { AuthFormData } from './types';

interface AuthContextType {
  form: UseFormReturn<AuthFormData>;
  isSubmitting: boolean;
  otpSent: boolean;
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

export const AuthProvider = AuthContext.Provider;
