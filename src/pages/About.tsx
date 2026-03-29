import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { db, auth } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export default function About() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      } else {
        setSettings({});
      }
    });

    return () => {
      unsubSettings();
    };
  }, []);

  if (!settings) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: `${settings.primary_color || '#b91c1c'}10` }}>
      <style>{`
        .theme-text { color: ${settings.primary_color || '#b91c1c'}; }
        .theme-text-light { color: ${settings.primary_color || '#b91c1c'}b3; }
        .theme-bg-light { background-color: ${settings.primary_color || '#b91c1c'}1a; }
        .theme-border-light { border-color: ${settings.primary_color || '#b91c1c'}33; }
      `}</style>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-white bg-gray-900 hover:bg-gray-800 px-4 py-2 rounded-xl transition-colors border border-gray-800">
            <ArrowLeft size={20} />
            {t('about.back')}
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button 
              onClick={() => signOut(auth)}
              className="p-1.5 sm:p-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 hover:text-red-300 rounded-xl transition-colors shadow-sm border border-red-900/30" 
              title="Logout"
            >
              <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-3xl shadow-sm border theme-border-light overflow-hidden">
          {settings.about_us_image_url && (
            <div className="w-full h-64 sm:h-96 theme-bg-light">
              <img 
                src={settings.about_us_image_url} 
                alt="About Us" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
          
          <div className="p-8 sm:p-12">
            <h1 className="text-4xl font-bold theme-text mb-6">{t('about.title')}</h1>
            <div className="prose prose-lg theme-text-light max-w-none whitespace-pre-wrap">
              {settings.about_us_text || "Welcome to our shop! We are dedicated to providing the best products and services to our customers."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
