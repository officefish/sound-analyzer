// src/modules/Library/components/UploadFileButton.tsx

import React, { useRef } from 'react';

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
      e.target.value = '';
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
      <button
        onClick={handleClick}
        disabled={disabled}
        className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5"
      >
        <span>📂</span>
        <span>Загрузить файлы</span>
      </button>
    </>
  );
};

export default UploadFileButton;