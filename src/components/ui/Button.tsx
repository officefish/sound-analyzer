// src/components/ui/Button.tsx

import React from 'react';

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  icon?: string;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  onClick,
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon,
  className = '',
}) => {
  const variantClasses = {
    primary: 'bg-primary hover:bg-primary/80 text-primary-content shadow-lg shadow-primary/20',
    secondary: 'bg-secondary hover:bg-secondary/80 text-secondary-content shadow-lg shadow-secondary/20',
    success: 'bg-success hover:bg-success/80 text-success-content shadow-lg shadow-success/20',
    danger: 'bg-error hover:bg-error/80 text-error-content shadow-lg shadow-error/20',
    warning: 'bg-warning hover:bg-warning/80 text-warning-content shadow-lg shadow-warning/20',
    ghost: 'bg-transparent hover:bg-base-200 text-base-content border border-base-300',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        font-medium rounded-xl transition-all duration-200
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        disabled:opacity-50 disabled:cursor-not-allowed
        hover:transform hover:-translate-y-0.5
        active:transform active:translate-y-0
        ${className}
      `}
    >
      <div className="flex items-center justify-center gap-2">
        {icon && <span>{icon}</span>}
        {children}
      </div>
    </button>
  );
};

export default Button;