// src/modules/Library/index.tsx
import React, { useRef, useState } from 'react';
import { useAlternateAudioLibrary } from '../../hooks/useAlternateAudioLibrary';
import ModuleHeader from '../../components/ui/ModuleHeader';

import CollectionList from './components/CollectionList';
import TrackList from './components/TrackList';
import AddCollectionModal from './components/modals/AddCollectionModal';
import DeleteConfirmModal from './components/modals/DeleteConfirmModal';

const AlternateLibrary: React.FC = () => {
  const {
    collections,
    tracks,
    activeCollectionId,
    //isElectron,
    isLoading,
    error,
    setActiveCollectionId,
    addFiles,
    exportTrack,
    createCollection,
    deleteCollection,
    updateCollection,
    moveTrack,
    deleteTrack,
    getTracksByCollection,
    isBufferCollection,
  } = useAlternateAudioLibrary();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'collection' | 'track'; id: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentTracks = activeCollectionId 
    ? getTracksByCollection(activeCollectionId)
    : [];

  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && activeCollectionId) {
      await addFiles(e.target.files, activeCollectionId);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCreateCollection = async (name: string, description?: string) => {
    await createCollection(name, description);
    setShowAddModal(false);
  };

  const handleUpdateCollection = async (id: string, name: string, description?: string) => {
    await updateCollection(id, { name, description });
    setEditingCollection(null);
  };

  const handleDeleteCollection = async () => {
    if (deletingItem && deletingItem.type === 'collection') {
      await deleteCollection(deletingItem.id);
      setDeletingItem(null);
    }
  };

  const handleDeleteTrack = async () => {
    if (deletingItem && deletingItem.type === 'track') {
      await deleteTrack(deletingItem.id);
      setDeletingItem(null);
    }
  };

  const handleExportTrack = async (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      await exportTrack(track);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4">Загрузка библиотеки...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-error">
          <p className="text-lg">Ошибка: {error}</p>
          <button 
            className="btn btn-primary mt-4"
            onClick={() => window.location.reload()}
          >
            Перезагрузить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <ModuleHeader
        icon="📚"
        title="Аудиобиблиотека"
        description="Управление коллекциями и треками"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Левая колонка - коллекции */}
        <div className="lg:col-span-1">
          <CollectionList
            collections={collections}
            activeCollectionId={activeCollectionId}
            isBufferCollection={isBufferCollection}
            onSelectCollection={setActiveCollectionId}
            onCreateCollection={() => setShowAddModal(true)}
            onEditCollection={setEditingCollection}
            onDeleteCollection={(id) => setDeletingItem({ type: 'collection', id })}
          />
        </div>

        {/* Правая колонка - треки */}
        <div className="lg:col-span-2">
          <div className="bg-base-200 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-semibold">
                  {collections.find(c => c.id === activeCollectionId)?.name || 'Треки'}
                </h3>
                <p className="text-sm text-base-content/50">
                  {currentTracks.length} треков
                </p>
              </div>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-primary btn-sm"
                disabled={!activeCollectionId}
              >
                + Добавить треки
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                multiple
                onChange={handleAddFiles}
                className="hidden"
              />
            </div>

            <TrackList
              tracks={currentTracks}
              collections={collections}
              onMoveTrack={moveTrack}
              onDeleteTrack={(id) => setDeletingItem({ type: 'track', id })}
              onExportTrack={handleExportTrack}
              isBufferCollection={isBufferCollection}
            />
          </div>
        </div>
      </div>

      {/* Модальные окна */}
      <AddCollectionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreate={handleCreateCollection}
      />

      {editingCollection && (
        <AddCollectionModal
          isOpen={true}
          collection={editingCollection}
          onClose={() => setEditingCollection(null)}
          onUpdate={handleUpdateCollection}
        />
      )}

      <DeleteConfirmModal
        isOpen={!!deletingItem}
        title={deletingItem?.type === 'collection' ? 'Удалить коллекцию?' : 'Удалить трек?'}
        message={
          deletingItem?.type === 'collection'
            ? 'Все треки из коллекции будут перемещены в Buffer. Вы уверены?'
            : 'Трек будет удален без возможности восстановления. Вы уверены?'
        }
        onConfirm={deletingItem?.type === 'collection' ? handleDeleteCollection : handleDeleteTrack}
        onClose={() => setDeletingItem(null)}
      />
    
    </div>
  );
};

export default AlternateLibrary;