// ===================================
// アプリ固有の設定
// 新しいアプリを作る時はここだけ変更する
// ===================================

export const APP_CONFIG = {
  // --- 基本情報 ---
  name: "姿勢悪いよ",
  description: "定期的に姿勢をチェックして、猫背・肩こりを予防するアプリ",
  url: "https://shisei-warui-yo.vercel.app",

  // --- ブランド ---
  brand: {
    author: "@zunda_katte_app",
    twitter: "@zunda_katte_app",
    portfolioUrl: "",
  },

  // --- テーマカラー ---
  theme: {
    primary: "#6366F1",      // インディゴ
    primaryLight: "#818CF8",
    primaryDark: "#4338CA",
    accent: "#F59E0B",
  },

  // --- SNSシェア ---
  ogImage: "/og-image.png",

  // --- 広告 ---
  adsense: {
    enabled: false,
    clientId: "",
    slotId: "",
  },

  // --- アナリティクス ---
  analytics: {
    enabled: false,
    umamiSiteId: "",
    umamiUrl: "",
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
