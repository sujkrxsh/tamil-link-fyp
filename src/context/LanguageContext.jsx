// src/context/LanguageContext.jsx
import React, { createContext, useState, useContext } from 'react';

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('EN'); // Default to English

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'EN' ? 'TA' : 'EN'));
  };

  // Translation helper function: pass it the English word and Tamil word
  const t = (enText, taText) => {
    return language === 'EN' ? enText : taText;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use language easily
export const useLanguage = () => useContext(LanguageContext);