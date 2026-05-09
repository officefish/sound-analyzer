import React, { useState, useEffect } from 'react';
import type { AudioCollection } from '../../../../types/audio';

interface AddCollectionModalProps {
  isOpen: boolean;
  collection?: AudioCollection | null;
  onClose: () => void;
  onCreate?: (name: string, description?: string) => Promise<void>;
  onUpdate?: (id: string, name: string, description?: string) => Promise<void>;
}

const AddCollectionModal: React.FC<AddCollectionModalProps> = ({
  isOpen,
  collection,
  onClose,
  onCreate,
  onUpdate,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!collection;

  useEffect(() => {
    if (isOpen) {
      if (collection) {
        setName(collection.name);
        setDescription(collection.description || '');
      } else {
        setName('');
        setDescription('');
      }
      setError(null);
    }
  }, [isOpen, collection]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Название коллекции обязательно');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isEditing && onUpdate && collection) {
        await onUpdate(collection.id, name.trim(), description.trim() || undefined);
      } else if (onCreate) {
        await onCreate(name.trim(), description.trim() || undefined);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении коллекции');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-base-100 rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">
            {isEditing ? 'Редактировать коллекцию' : 'Создать коллекцию'}
          </h3>
          <button
            onClick={onClose}
            className="btn btn-sm btn-ghost btn-circle"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Название коллекции</span>
              <span className="label-text-alt text-error">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Рок, Джаз, Подкасты..."
              className="input input-bordered w-full"
              autoFocus
              disabled={isLoading}
            />
          </div>

          <div className="form-control mb-6">
            <label className="label">
              <span className="label-text">Описание (необязательно)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание коллекции..."
              className="textarea textarea-bordered w-full h-24 resize-none"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="alert alert-error mb-4 py-2 text-sm">
              <span>⚠️ {error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              disabled={isLoading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  {isEditing ? 'Сохраняем...' : 'Создаём...'}
                </>
              ) : (
                isEditing ? 'Сохранить' : 'Создать'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCollectionModal;
