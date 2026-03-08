import { createContext, useContext, useState, ReactNode } from "react";

type Lang = "bn" | "en";

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (bn: string, en?: string | null) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "bn",
  setLang: () => {},
  t: (bn) => bn,
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>("bn");

  const t = (bn: string, en?: string | null) => {
    if (lang === "en" && en) return en;
    return bn;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

// Static translations for UI labels
export const labels = {
  bn: {
    back: "ফিরে যান",
    member: "সদস্য",
    age: "বয়স",
    years: "বছর",
    joinDate: "যোগদান",
    achievements: "অর্জন",
    favorites: "পছন্দের তথ্য",
    favoriteWorks: "প্রিয় কাজসমূহ",
    favActor: "পছন্দের নায়ক",
    favActress: "পছন্দের নায়িকা",
    favColor: "পছন্দের রং",
    favDress: "পছন্দের পোশাক",
    favFood: "পছন্দের খাবার",
    loading: "লোড হচ্ছে...",
    notFound: "সদস্য পাওয়া যায়নি",
    goHome: "হোম পেজে ফিরুন",
    verified: "ভেরিফাইড সদস্য",
    ourTeam: "আমাদের টিম",
    recentProjects: "সাম্প্রতিক প্রজেক্ট",
    contact: "যোগাযোগ",
    socialMedia: "সোশ্যাল মিডিয়া",
    seeWork: "আমাদের কাজ দেখুন",
    seeTeam: "টিম দেখুন",
    teamMembers: "টিম মেম্বার",
    projects: "প্রজেক্ট",
    dashboard: "ড্যাশবোর্ড",
    login: "লগইন",
    description: "প্রফেশনাল মিডিয়া প্রোডাকশন হাউস",
  },
  en: {
    back: "Go Back",
    member: "Member",
    age: "Age",
    years: "Years",
    joinDate: "Joined",
    achievements: "Achievements",
    favorites: "Favorites",
    favoriteWorks: "Favorite Works",
    favActor: "Favorite Actor",
    favActress: "Favorite Actress",
    favColor: "Favorite Color",
    favDress: "Favorite Dress",
    favFood: "Favorite Food",
    loading: "Loading...",
    notFound: "Member not found",
    goHome: "Go to Home",
    verified: "Verified Member",
    ourTeam: "Our Team",
    recentProjects: "Recent Projects",
    contact: "Contact",
    socialMedia: "Social Media",
    seeWork: "See Our Work",
    seeTeam: "See Team",
    teamMembers: "Team Members",
    projects: "Projects",
    dashboard: "Dashboard",
    login: "Login",
    description: "Professional Media Production House",
  },
} as const;
