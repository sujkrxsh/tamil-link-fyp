import React, { createContext, useState, useContext } from 'react';

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  // start in english
  const [language, setLanguage] = useState('EN');

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'EN' ? 'TA' : 'EN'));
  };

  // custom translation hack
  const t = (enText, taText) => {
    return language === 'EN' ? enText : taText;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// custom hook
export const useLanguage = () => useContext(LanguageContext);