import React, { useEffect, useRef } from 'react';
import { IPluginContext } from '../types/plugins';

interface ModuleWrapperProps {
  moduleId: string;
  onContextReady?: (context: IPluginContext) => void;
  children: React.ReactNode;
}

export const ModuleWrapper: React.FC<ModuleWrapperProps> = ({ 
  //moduleId, 
  onContextReady, 
  children 
}) => {
  const contextRef = useRef<IPluginContext | null>(null);
  const isRegistered = useRef(false);
  
  // Регистрируем контекст в глобальном провайдере
  useEffect(() => {
    if (onContextReady && contextRef.current && !isRegistered.current) {
      isRegistered.current = true;
      onContextReady(contextRef.current);
    }
  }, [onContextReady]);
  
  // Функция для регистрации контекста из дочернего компонента
  const registerContext = (context: IPluginContext) => {
    contextRef.current = context;
    if (onContextReady && !isRegistered.current) {
      isRegistered.current = true;
      onContextReady(context);
    }
  };
  
  // Клонируем дочерний элемент с дополнительным пропом
  const child = React.Children.only(children);
  const childWithProps = React.cloneElement(child as React.ReactElement, {
    onContextReady: registerContext,
  });
  
  return <>{childWithProps}</>;
};