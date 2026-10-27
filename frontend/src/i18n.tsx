import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type Language = 'en' | 'my';

const translations = {
  en: {
    title: 'Micro Skill',
    subtitle: 'Full-stack workspace foundation with a typed API boundary.',
    apiStatus: 'API status',
    checking: 'Checking API status…',
    unreachable: 'API unreachable',
    status: 'Status',
    database: 'Database',
    latency: 'Latency',
    auth: 'Authentication',
    login: 'Login',
    register: 'Register',
    email: 'Email',
    name: 'Name',
    password: 'Password',
    createAccount: 'Create account',
    signIn: 'Sign in',
    checkSession: 'Check session',
    logout: 'Logout',
    language: 'Language',
  },
  my: {
    title: 'Micro Skill',
    subtitle: 'စမ်းသပ် API ချိတ်ဆက်မှုပါသော full-stack workspace အခြေခံ။',
    apiStatus: 'API အခြေအနေ',
    checking: 'API အခြေအနေ စစ်ဆေးနေသည်…',
    unreachable: 'API သို့ မရောက်နိုင်ပါ',
    status: 'အခြေအနေ',
    database: 'ဒေတာဘေ့စ်',
    latency: 'နှောင့်နှေးချိန်',
    auth: 'အကောင့်ဝင်/မှတ်ပုံတင်',
    login: 'ဝင်ရန်',
    register: 'မှတ်ပုံတင်',
    email: 'အီးမေးလ်',
    name: 'အမည်',
    password: 'စကားဝှက်',
    createAccount: 'အကောင့်ဖွင့်ရန်',
    signIn: 'ဝင်ရန်',
    checkSession: 'Session စစ်ရန်',
    logout: 'ထွက်ရန်',
    language: 'ဘာသာစကား',
  },
} as const;

type TranslationKey = keyof (typeof translations)['en'];

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const stored =
      typeof window !== 'undefined' ? window.localStorage.getItem('msv-language') : null;
    return stored === 'my' ? 'my' : 'en';
  });

  function change(next: Language) {
    setLanguage(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('msv-language', next);
    }
  }

  const value: LanguageContextValue = {
    language,
    setLanguage: change,
    t: (key) => translations[language][key],
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
