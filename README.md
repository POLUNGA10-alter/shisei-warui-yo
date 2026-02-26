# 🫛 マイクロアプリ共通テンプレート

> ずんだもんのマイクロアプリ量産用テンプレート

## 新しいアプリを作る手順

### 1. テンプレートをコピー

```powershell
Copy-Item -Recurse my-micro-app-template my-new-app-name
cd my-new-app-name
npm install
```

### 2. 設定を変更

`src/config/app.ts` を開いて以下を変更:

```typescript
export const APP_CONFIG = {
  name: "アプリ名",
  description: "アプリの説明",
  url: "https://xxx.vercel.app",
};
```

### 3. メイン機能を実装

`src/app/page.tsx` のプレースホルダー部分を置き換える。

### 4. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 で確認。

### 5. デプロイ

```powershell
npx vercel         # 初回
npx vercel --prod  # 以降の更新
```

---

## プロジェクト構成

```
src/
├── app/
│   ├── globals.css         # 共通デザインテーマ（ずんだカラー）
│   ├── layout.tsx          # 共通レイアウト（Header+Footer自動適用）
│   └── page.tsx            # ★ ここにアプリの機能を実装
├── components/
│   ├── Header.tsx          # 共通ヘッダー（アプリ名 + 他アプリへのリンク）
│   ├── Footer.tsx          # 共通フッター（SNS + クレジット表記）
│   ├── AdBanner.tsx        # 広告バナー（AdSense対応、ON/OFF可）
│   └── ShareButtons.tsx    # SNSシェアボタン（X / LINE / コピー）
├── config/
│   └── app.ts              # ★ アプリ固有の設定（名前・色・URL等）
├── lib/
│   ├── analytics.tsx       # アクセス解析（Umami対応）
│   └── metadata.ts         # OGP/メタデータ自動生成
public/
├── manifest.json           # PWA設定
└── og-image.png            # OGP画像（1200×630px）
```

## 共通機能（自動適用）

- ✅ ずんだグリーン統一テーマ / ダークモード対応
- ✅ Header/Footer自動表示
- ✅ SNSシェアボタン（X / LINE / URLコピー）
- ✅ OGP / Twitterカード自動設定
- ✅ PWA対応
- ✅ アクセス解析（Umami, ON/OFF可）
- ✅ 広告バナー（AdSense, ON/OFF可）
- ✅ クレジット表記（VOICEVOX / 坂本アヒル様）

