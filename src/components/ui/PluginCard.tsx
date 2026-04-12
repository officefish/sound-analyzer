// src/components/ui/PluginCard.tsx

import React from 'react';
import { IPlugin } from '../../types/plugins';

interface PluginCardProps {
  plugin: IPlugin;
  isActive: boolean;
  children: React.ReactNode;
  className?: string;
}

const PluginCard: React.FC<PluginCardProps> = ({ 
  plugin, 
  isActive, 
  children, 
  className = '' 
}) => {
  return (
    <div 
      className={`
        rounded-2xl border p-5 transition-all duration-500
        ${isActive 
          ? 'bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30' 
          : 'bg-base-200 border-base-300'
        }
        ${className}
      `}
    >
      {/* Заголовок плагина */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`
              w-10 h-10 rounded-xl flex items-center justify-center text-lg
              ${isActive 
                ? 'bg-primary/20 text-primary' 
                : 'bg-base-300 text-base-content/60'
              }
            `}>
              {plugin.icon}
            </div>
            <div>
              <h3 className="text-base font-semibold text-base-content">
                {plugin.name}
              </h3>
              <p className="text-xs text-base-content/50">
                {plugin.version}
              </p>
            </div>
          </div>
          {isActive && (
            <div className="badge badge-success badge-sm gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              active
            </div>
          )}
        </div>
      </div>
      
      {/* Контент плагина */}
      <div>
        {children}
      </div>
    </div>
  );
};

export default React.memo(PluginCard);