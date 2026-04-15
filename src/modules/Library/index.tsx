import React, { useState, useEffect } from 'react';
import { useAudioLibrary } from '../../hooks/useAudioLibrary';
import ModuleHeader from '../../components/ui/ModuleHeader';
import CollectionList from './components/CollectionList';
import FileList from './components/FileList';
import AudioPlayerWithHistogram from './components/AudioPlayerWithHistogram';
import AddCollectionModal from './components/AddCollectionModal';
import EditCollectionModal from './components/EditCollectionModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import UploadFileButton from './components/UploadFileButton';
import { AudioFile, AudioCollection } from '../../types/audioLibrary';

const Library: React.FC = () => {
  const {
    collections,
    files,
    activeCollectionId,
    setActiveCollectionId,
    init,
    createCollection,
    updateCollection,
    deleteCollection,
    deleteFile,
    moveFileToCollection,
    saveAudioFile,
    isElectron,
  } = useAudioLibrary();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editCollection, setEditCollection] = useState<AudioCollection | null>(null);
  const [deleteItem, setDeleteItem] = useState<{ type: 'collection' | 'file'; item: AudioCollection | AudioFile | null }>({ type: 'file', item: null });
  const [currentPlayingFile, setCurrentPlayingFile] = useState<AudioFile | null>(null);

  useEffect(() => {
    init();
  }, []);

  const handleSelectCollection = (id: string) => {
    setActiveCollectionId(id);
  };

  const handleAddCollection = async (name: string) => {
    await createCollection(name);
  };

  const handleRenameCollection = async (id: string, newName: string) => {
    await updateCollection(id, newName);
  };

  const handleDeleteCollection = async () => {
    if (deleteItem.item && deleteItem.type === 'collection') {
      await deleteCollection(deleteItem.item.id);
    }
    setDeleteItem({ type: 'file', item: null });
  };

  const handleDeleteFile = async () => {
    if (deleteItem.item && deleteItem.type === 'file') {
      await deleteFile(deleteItem.item.id);
      if (currentPlayingFile?.id === deleteItem.item.id) {
        setCurrentPlayingFile(null);
      }
    }
    setDeleteItem({ type: 'file', item: null });
  };

  const handleMoveFile = async (fileId: string, targetCollectionId: string) => {
    await moveFileToCollection(fileId, targetCollectionId);
  };

  const handleUploadFiles = async (fileList: FileList) => {
    const collectionId = activeCollectionId || 'buffer';
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      
      // Проверяем по расширению, а не только по MIME-типу
      const isAudio = file.type.startsWith('audio/') || 
                      file.name.endsWith('.webm') ||
                      file.name.endsWith('.wav') ||
                      file.name.endsWith('.mp3') ||
                      file.name.endsWith('.ogg') ||
                      file.name.endsWith('.m4a');
      
      if (isAudio) {
        const blob = new Blob([await file.arrayBuffer()], { type: file.type || 'audio/webm' });
        await saveAudioFile(blob, file.name, collectionId);
      } else {
        console.warn('Not an audio file:', file.name);
      }
    }
  };

  const handlePlayFile = (file: AudioFile) => {
    setCurrentPlayingFile(file);
  };

  const handleStopPlayback = () => {
    setCurrentPlayingFile(null);
  };

  const currentFiles = activeCollectionId
    ? files.filter(f => f.collectionId === activeCollectionId)
    : [];

  const otherCollectionsForMove = collections.filter(c => c.id !== activeCollectionId);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <ModuleHeader
        icon="📚"
        title="Аудиобиблиотека"
        description="Управление записями, коллекциями и файлами"
      />

      {/* Плеер с гистограммой */}
      <AudioPlayerWithHistogram
        currentFile={currentPlayingFile}
        onPlay={handlePlayFile}
        onStop={handleStopPlayback}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Левая колонка: коллекции */}
        <div className="lg:col-span-1">
          <CollectionList
            collections={collections}
            activeCollectionId={activeCollectionId}
            onSelectCollection={handleSelectCollection}
            onEditCollection={setEditCollection}
            onDeleteCollection={(col) => setDeleteItem({ type: 'collection', item: col })}
            onAddCollection={() => setShowAddModal(true)}
          />
        </div>

        {/* Правая колонка: файлы */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-base-content/70">
              {activeCollectionId
                ? `Коллекция: ${collections.find(c => c.id === activeCollectionId)?.name}`
                : 'Выберите коллекцию'}
            </div>
            <UploadFileButton onUpload={handleUploadFiles} disabled={!activeCollectionId} />
          </div>
          
          <FileList
            files={currentFiles}
            collections={otherCollectionsForMove}
            onDeleteFile={handleDeleteFile}
            onMoveFile={handleMoveFile}
            onPlayFile={handlePlayFile}
            currentPlayingFileId={currentPlayingFile?.id || null}
          />
        </div>
      </div>

      {/* Модальные окна */}
      <AddCollectionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddCollection}
      />
      <EditCollectionModal
        isOpen={!!editCollection}
        collection={editCollection}
        onClose={() => setEditCollection(null)}
        onRename={handleRenameCollection}
      />
      <DeleteConfirmModal
        isOpen={deleteItem.item !== null}
        type={deleteItem.type}
        item={deleteItem.item}
        onClose={() => setDeleteItem({ type: 'file', item: null })}
        onConfirm={deleteItem.type === 'collection' ? handleDeleteCollection : handleDeleteFile}
      />
    </div>
  );
};

export default Library;