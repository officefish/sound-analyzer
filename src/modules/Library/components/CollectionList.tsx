import React from 'react';
import { AudioCollection } from '../../../types/audioLibrary';

interface CollectionListProps {
  collections: AudioCollection[];
  activeCollectionId: string | null;
  onSelectCollection: (id: string) => void;
  onEditCollection: (collection: AudioCollection) => void;
  onDeleteCollection: (collection: AudioCollection) => void;
  onAddCollection: () => void;
}

const CollectionList: React.FC<CollectionListProps> = ({
  collections,
  activeCollectionId,
  onSelectCollection,
  onEditCollection,
  onDeleteCollection,
  onAddCollection,
}) => {
  return (
    <div className="bg-base-200 rounded-2xl p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-base-content/70 uppercase tracking-wider">
          📁 Коллекции
        </h3>
        <button
          onClick={onAddCollection}
          className="btn btn-xs btn-primary gap-1"
        >
          + Новая
        </button>
      </div>
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {collections.map((col) => (
          <div
            key={col.id}
            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
              activeCollectionId === col.id
                ? 'bg-primary/20 border border-primary/30'
                : 'hover:bg-base-300'
            }`}
            onClick={() => onSelectCollection(col.id)}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">📀</span>
              <span className="text-sm font-medium truncate max-w-[150px]">
                {col.name}
              </span>
              <span className="text-xs text-base-content/50">
                ({col.fileIds.length})
              </span>
            </div>
            {col.id !== 'buffer' && (
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditCollection(col);
                  }}
                  className="btn btn-xs btn-ghost"
                >
                  ✏️
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCollection(col);
                  }}
                  className="btn btn-xs btn-ghost text-error"
                >
                  🗑️
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CollectionList;