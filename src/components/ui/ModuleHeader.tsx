// src/components/ui/ModuleHeader.tsx

import React from 'react';

interface ModuleHeaderProps {
  /** Иконка модуля (JSX элемент) */
  icon: React.ReactNode;
  /** Название модуля */
  title: string;
  /** Описание модуля */
  description: string;
  /** Дополнительные CSS классы */
  className?: string;
}

const ModuleHeader: React.FC<ModuleHeaderProps> = ({ 
  icon, 
  title, 
  description, 
  className = '' 
}) => {
  return (
    <div className={`text-center mb-8 ${className}`}>
      <div className="flex items-center justify-center gap-3 mb-3">
        <div className="relative p-3 rounded-2xl bg-primary border border-primary">
          <div className="w-6 h-6 text-primary">
            {icon}
          </div>
          {/* Эффект свечения для иконки */}
          <div className="absolute inset-0 rounded-2xl bg-primary blur-md -z-10" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {title}
        </h1>
      </div>
      <p className="text-sm text-primary"
      >
        {description}
      </p>
    </div>
  );
};

export default React.memo(ModuleHeader);