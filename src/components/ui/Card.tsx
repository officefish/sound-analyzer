import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'active' | 'compact';
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  variant = 'default' 
}) => {
  const variantClasses = {
    default: 'bg-white/5 border-white/10',
    active: 'bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border-indigo-500/40',
    compact: 'bg-white/5 border-white/10 p-2',
  };
  
  return (
    <div className={`
      rounded-xl border overflow-hidden transition-all duration-200
      ${variantClasses[variant]}
      ${className}
    `}>
      {children}
    </div>
  );
};

export default Card;