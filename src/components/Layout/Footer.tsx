import React from 'react';

const Footer: React.FC = () => {
  const currentDate = new Date().toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <footer className="border-t border-white/10 mt-4 pt-4">
      <div className="text-center text-gray-500 text-xs">
        <p>
          © {new Date().getFullYear()} Друид • Создано специально для{' '}
          <a 
            href="https://github.com/officefish" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Techies68
          </a>
        </p>
        <p className="mt-1">
          🗓️ {currentDate} •{' '}
          <a 
            href="https://github.com/officefish/sound-analyzer" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1"
          >
            <span>🔗</span>
            Репозиторий на GitHub
          </a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;