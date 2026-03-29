import React from 'react';
import { useLanguage } from '../LanguageContext';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 bg-gray-900 hover:bg-gray-800 px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl shadow-sm border border-gray-800 transition-colors">
      <Globe size={16} className="text-gray-300 w-3.5 h-3.5 sm:w-4 sm:h-4" />
      <select 
        value={language} 
        onChange={(e) => setLanguage(e.target.value as 'en' | 'ru')}
        className="bg-transparent text-xs sm:text-sm font-medium text-white outline-none cursor-pointer"
      >
        <option value="en">EN</option>
        <option value="ru">RU</option>
      </select>
    </div>
  );
}
