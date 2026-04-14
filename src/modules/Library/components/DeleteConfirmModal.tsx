import React from 'react';
import { Modal, Button } from 'react-daisyui';
import { AudioCollection, AudioFile } from '../../../types/audioLibrary';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  type: 'collection' | 'file';
  item: AudioCollection | AudioFile | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  type,
  item,
  onClose,
  onConfirm,
}) => {
  const [loading, setLoading] = React.useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    onClose();
  };

  const title = type === 'collection' ? 'Удаление коллекции' : 'Удаление файла';
  const message = type === 'collection'
    ? `Вы уверены, что хотите удалить коллекцию "${(item as AudioCollection)?.name}" и все файлы внутри?`
    : `Вы уверены, что хотите удалить файл "${(item as AudioFile)?.name}"?`;

  return (
    <Modal open={isOpen}>
      <Modal.Header>{title}</Modal.Header>
      <Modal.Body>
        <p>{message}</p>
      </Modal.Body>
      <Modal.Actions>
        <Button onClick={onClose} color="ghost">Отмена</Button>
        <Button onClick={handleConfirm} color="error" loading={loading}>
          Удалить
        </Button>
      </Modal.Actions>
       <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </Modal>
  );
};

export default DeleteConfirmModal;