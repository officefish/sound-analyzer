// src/components/ui/Badge.tsx

import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  size?: 'sm' | 'md';
}

const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default', 
  size = 'sm' 
}) => {
  const variantClasses = {
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    danger: 'bg-error/20 text-error',
    info: 'bg-primary/20 text-primary',
    default: 'bg-base-300 text-base-content/70',
  };
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
  };
  
  return (
    <span className={`
      inline-flex items-center gap-1 rounded-full font-medium
      ${variantClasses[variant]}
      ${sizeClasses[size]}
    `}>
      {children}
    </span>
  );
};

export default Badge;