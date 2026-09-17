import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
    const { i18n } = useTranslation();
    const [language, setLanguage] = useState(i18n.language || 'en');

    const toggleLanguage = () => {
        const newLang = language === 'en' ? 'ta' : 'en';
        setLanguage(newLang);
        i18n.changeLanguage(newLang);
        localStorage.setItem('language', newLang);
    };

    useEffect(() => {
        const savedLang = localStorage.getItem('language');
        if (savedLang && savedLang !== language) {
            setLanguage(savedLang);
            i18n.changeLanguage(savedLang);
        }
    }, []);

    return (
        <LanguageContext.Provider value={{ language, toggleLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
};