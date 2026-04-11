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
    success: 'bg-green-500/20 text-green-400',
    warning: 'bg-yellow-500/20 text-yellow-400',
    danger: 'bg-red-500/20 text-red-400',
    info: 'bg-indigo-500/20 text-indigo-400',
    default: 'bg-gray-500/20 text-gray-400',
  };
  
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-1 text-xs',
  };
  
  return (
    <span className={`
      rounded-full font-medium
      ${variantClasses[variant]}
      ${sizeClasses[size]}
    `}>
      {children}
    </span>
  );
};

export default Badge;