// src/components/ui/Card.tsx

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
    default: 'bg-base-200 border border-base-300 rounded-2xl',
    active: 'bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-2xl',
    compact: 'bg-base-200 border border-base-300 rounded-xl p-2',
  };
  
  return (
    <div className={`${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
};

export default Card;