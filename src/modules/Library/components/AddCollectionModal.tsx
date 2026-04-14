import React, { useState } from 'react';
import { Modal, Button } from 'react-daisyui';

interface AddCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string) => Promise<void>;
}

const AddCollectionModal: React.FC<AddCollectionModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await onAdd(name.trim());
    setLoading(false);
    setName('');
    onClose();
  };

  return (
    <Modal open={isOpen}>
      <Modal.Header>Новая коллекция</Modal.Header>
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
          Создать
        </Button>
      </Modal.Actions>
      {/* <Modal.Backdrop onClick={onClickOutside} /> */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </Modal>
  );
};

export default AddCollectionModal;