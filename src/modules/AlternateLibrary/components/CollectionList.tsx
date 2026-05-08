// src/modules/Library/components/CollectionList.tsx
import React from 'react';
import type { AudioCollection } from '../../../types/audio';

interface CollectionListProps {
  collections: AudioCollection[];
  activeCollectionId: string | null;
  isBufferCollection: (id: string) => boolean;
  onSelectCollection: (id: string) => void;
  onCreateCollection: () => void;
  onEditCollection: (collection: AudioCollection) => void;
  onDeleteCollection: (id: string, name: string) => void;
}

const CollectionList: React.FC<CollectionListProps> = ({
  collections,
  activeCollectionId,
  isBufferCollection,
  onSelectCollection,
  onCreateCollection,
  onEditCollection,
  onDeleteCollection,
}) => {
  return (
    <div className="bg-base-200 rounded-2xl p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-semibold">Коллекции</h3>
          <p className="text-xs text-base-content/50 mt-1">
            Всего: {collections.length}
          </p>
        </div>
        <button onClick={onCreateCollection} className="btn btn-sm btn-primary">
          + Новая
        </button>
      </div>

      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {collections.map(collection => {
          const isBuffer = isBufferCollection(collection.id);
          const trackCount = collection.trackIds.length;
          
          return (
            <div
              key={collection.id}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                activeCollectionId === collection.id
                  ? 'bg-primary/20 border border-primary'
                  : 'hover:bg-base-300'
              }`}
              onClick={() => onSelectCollection(collection.id)}
            >
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    {isBuffer && <span className="text-sm">📦</span>}
                    <span className="truncate">{collection.name}</span>
                    {isBuffer && (
                      <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                        Буфер
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-base-content/50 mt-0.5">
                    {trackCount} {trackCount === 1 ? 'трек' : trackCount >= 2 && trackCount <= 4 ? 'трека' : 'треков'}
                  </div>
                </div>
                
                {!isBuffer && (
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditCollection(collection);
                      }}
                      className="btn btn-xs btn-ghost"
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCollection(collection.id, collection.name);
                      }}
                      className="btn btn-xs btn-ghost text-error"
                      title="Удалить коллекцию"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
              
              {/* Прогресс-бар заполненности (опционально) */}
              {!isBuffer && trackCount > 0 && (
                <div className="mt-2 h-1 bg-base-300 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary/50 rounded-full"
                    style={{ width: `${Math.min(100, trackCount * 5)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CollectionList;