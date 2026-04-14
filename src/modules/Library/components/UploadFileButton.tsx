import React, { useRef } from 'react';
import { Button } from 'react-daisyui';

interface UploadFileButtonProps {
  onUpload: (files: FileList) => Promise<void>;
  disabled?: boolean;
}

const UploadFileButton: React.FC<UploadFileButtonProps> = ({ onUpload, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await onUpload(e.target.files);
      e.target.value = ''; // reset
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="audio/*"
        multiple
        onChange={handleChange}
      />
      <Button
        onClick={handleClick}
        disabled={disabled}
        color="primary"
        size="sm"
        startIcon="📂"
      >
        Загрузить файлы
      </Button>
    </>
  );
};

export default UploadFileButton;