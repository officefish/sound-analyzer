import React, { useState } from 'react';
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

  const otherCollections = collections.filter(c => c.id !== file.collectionId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-sm btn-circle btn-ghost"
      >
        ⋯
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-base-200 rounded-xl shadow-xl z-20 border border-base-300">
          <button
            onClick={() => {
              setShowMoveMenu(!showMoveMenu);
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-base-300 rounded-t-xl"
          >
            📂 Переместить
          </button>
          {showMoveMenu && (
            <div className="border-t border-base-300">
              {otherCollections.map(col => (
                <button
                  key={col.id}
                  onClick={() => {
                    onMove(col.id);
                    setIsOpen(false);
                    setShowMoveMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-base-300 pl-6"
                >
                  {col.name}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => {
              onDelete();
              setIsOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm text-error hover:bg-base-300 rounded-b-xl"
          >
            🗑️ Удалить
          </button>
        </div>
      )}
    </div>
  );
};

export default FileActionsMenu;