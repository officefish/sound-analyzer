import React from 'react';

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
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
    primary: 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/30',
    secondary: 'bg-gray-600 hover:bg-gray-500 shadow-lg shadow-gray-900/30',
    success: 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/30',
    danger: 'bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-900/30',
    warning: 'bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-900/30',
    info: 'bg-sky-600 hover:bg-sky-500 shadow-lg shadow-sky-900/30',
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
        font-medium rounded-lg transition-all duration-200
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