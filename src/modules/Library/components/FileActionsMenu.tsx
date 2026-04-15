// src/modules/Library/components/FileActionsMenu.tsx

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AudioFile } from '../../../types/audioLibrary';

interface FileActionsMenuProps {
  file: AudioFile;
  collections: { id: string; name: string }[];
  onDelete: () => void;
  onMove: (targetCollectionId: string) => void;
}

const FileActionsMenu: React.FC<FileActionsMenuProps> = ({
  file,
  collections,
  onDelete,
  onMove,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const otherCollections = collections.filter(c => c.id !== file.collectionId);

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
  };

  const handleOpen = () => {
    updatePosition();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setShowMoveMenu(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        // Проверяем, что клик не внутри меню
        const menuElement = document.getElementById('file-actions-menu');
        if (menuElement && !menuElement.contains(event.target as Node)) {
          handleClose();
        }
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleClose);
      window.addEventListener('resize', handleClose);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleClose);
      window.removeEventListener('resize', handleClose);
    };
  }, [isOpen]);

  const theme = document.documentElement.getAttribute('data-theme') || 'dark';

  const menuContent = isOpen && (
    <div
      id="file-actions-menu"
      className="fixed z-[9999] w-48 bg-base-200 rounded-xl shadow-xl border border-base-300 overflow-hidden"
      data-theme={theme}
      style={{
        top: position.top - 10,
        left: position.left - 180,
      }}
    >
      {/* Переместить */}
      <div className="relative">
        <button
          onClick={() => setShowMoveMenu(!showMoveMenu)}
          className="w-full text-left px-3 py-2 text-sm hover:bg-base-300 flex items-center justify-between"
        >
          <span>📂 Переместить</span>
        </button>
        
        {showMoveMenu && (
          <div 
            className="fixed w-48 bg-base-200 rounded-xl shadow-xl border border-base-300 overflow-hidden z-[10000]"
            style={{
              top: position.top - 10,
              left: position.left - 370,
            }}
          >
            {otherCollections.map(col => (
              <button
                key={col.id}
                onClick={() => {
                  onMove(col.id);
                  handleClose();
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-base-300"
              >
                {col.name}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Удалить */}
      <button
        onClick={() => {
          onDelete();
          handleClose();
        }}
        className="w-full text-left px-3 py-2 text-sm text-error hover:bg-base-300"
      >
        🗑️ Удалить
      </button>
    </div>
  );

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className="btn btn-sm btn-circle btn-ghost"
        title="Действия"
      >
        ⋯
      </button>
      {createPortal(menuContent, document.body)}
    </div>
  );
};

export default FileActionsMenu;