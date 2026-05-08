import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-daisyui';
import { AudioCollection } from '../../../types/audioLibrary';

interface EditCollectionModalProps {
  isOpen: boolean;
  collection: AudioCollection | null;
  onClose: () => void;
  onRename: (id: string, newName: string) => Promise<void>;
}

const EditCollectionModal: React.FC<EditCollectionModalProps> = ({
  isOpen,
  collection,
  onClose,
  onRename,
}) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (collection) setName(collection.name);
  }, [collection]);

  const handleSubmit = async () => {
    if (!collection || !name.trim()) return;
    setLoading(true);
    await onRename(collection.id, name.trim());
    setLoading(false);
    onClose();
  };

  return (
    <Modal open={isOpen}>
      <Modal.Header>Редактировать коллекцию</Modal.Header>
      <Modal.Body>
        <input
          type="text"
          placeholder="Название коллекции"
          className="input input-bordered w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
      </Modal.Body>
      <Modal.Actions>
        <Button onClick={onClose} color="ghost">Отмена</Button>
        <Button onClick={handleSubmit} color="primary" loading={loading}>
          Сохранить
        </Button>
      </Modal.Actions>
       <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </Modal>
  );
};

export default EditCollectionModal;