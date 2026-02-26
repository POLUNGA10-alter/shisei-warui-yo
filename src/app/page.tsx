import PostureReminder from "@/components/PostureReminder";
import ShareButtons from "@/components/ShareButtons";
import AdBanner from "@/components/AdBanner";

/**
 * 「姿勢悪いよ」リマインダー メインページ
 */
export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* メイン機能 */}
      <PostureReminder />

      {/* 広告 */}
      <AdBanner />

      {/* シェアボタン */}
      <section className="w-full px-4 py-8">
        <div className="mx-auto max-w-md text-center">
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            姿勢が気になる友達にも教えてあげよう
          </p>
          <ShareButtons
            text="定期的に姿勢をチェックしてくれるアプリ！デスクワーカーにおすすめ"
          />
        </div>
      </section>
    </div>
  );
}
