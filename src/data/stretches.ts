/** ストレッチ・姿勢改善データ */

export interface Stretch {
  id: number;
  name: string;
  duration: number; // 秒
  description: string;
  steps: string[];
  targetArea: string;
  emoji: string;
}

/** 姿勢チェックメッセージ（ランダム表示） */
export const POSTURE_MESSAGES: string[] = [
  "姿勢が崩れていませんか？背筋を伸ばしましょう！",
  "猫背になっていませんか？シャキッと！",
  "肩が上がっていませんか？力を抜きましょう",
  "画面に近づきすぎていませんか？少し離れましょう",
  "背中が丸まっていませんか？胸を張りましょう",
  "首が前に出ていませんか？顎を引きましょう",
  "そろそろ姿勢チェックの時間です",
  "デスクワーカーの大敵は猫背です",
  "一度立ち上がって伸びをしませんか？",
  "深呼吸して、姿勢をリセットしましょう",
];

/** 姿勢改善メッセージ（姿勢を正した後） */
export const PRAISE_MESSAGES: string[] = [
  "いい姿勢です！その調子！",
  "姿勢を正しました！素晴らしい！",
  "背筋ピーン！かっこいいです！",
  "よくできました！健康に近づきました",
  "いい姿勢をキープしましょう！",
  "体が喜んでいますよ！",
];

/** ストレッチメニュー */
export const STRETCHES: Stretch[] = [
  {
    id: 1,
    name: "首回し",
    duration: 20,
    description: "首をゆっくり回して凝りをほぐしましょう",
    steps: [
      "頭をゆっくり右に倒す（5秒キープ）",
      "そのまま前→左→後ろと1周回す",
      "反対回りも同様に行う",
      "2〜3周ずつ行いましょう",
    ],
    targetArea: "首・肩",
    emoji: "🧘",
  },
  {
    id: 2,
    name: "肩すくめ",
    duration: 15,
    description: "肩の力を抜いてリラックスしましょう",
    steps: [
      "両肩をグッと耳に近づけるように上げる",
      "3秒キープ",
      "ストンと力を抜いて落とす",
      "5回繰り返しましょう",
    ],
    targetArea: "肩",
    emoji: "💪",
  },
  {
    id: 3,
    name: "胸を開くストレッチ",
    duration: 20,
    description: "猫背の逆！胸を大きく開きましょう",
    steps: [
      "両手を後ろで組む",
      "肩甲骨を寄せながら胸を張る",
      "顔は天井に向ける",
      "15〜20秒キープしましょう",
    ],
    targetArea: "胸・背中",
    emoji: "🫁",
  },
  {
    id: 4,
    name: "背中のばし",
    duration: 15,
    description: "丸まった背中を伸ばしましょう",
    steps: [
      "両手を頭の上で組む",
      "手のひらを天井に向ける",
      "身体を真上に伸ばす",
      "10〜15秒キープしましょう",
    ],
    targetArea: "背中・腰",
    emoji: "🙆",
  },
  {
    id: 5,
    name: "手首ストレッチ",
    duration: 15,
    description: "タイピングで疲れた手首をケアしましょう",
    steps: [
      "片手を前に伸ばし、手のひらを上に向ける",
      "もう片方の手で指先をゆっくり下に引く",
      "10秒キープ",
      "反対の手も同様に行いましょう",
    ],
    targetArea: "手首・前腕",
    emoji: "🤲",
  },
  {
    id: 6,
    name: "目の体操",
    duration: 20,
    description: "目も休ませましょう！20-20-20ルール",
    steps: [
      "画面から目を離す",
      "20フィート（約6メートル）先を見る",
      "20秒間ぼーっと眺める",
      "目をギュッと閉じて → パッと開く × 3回",
    ],
    targetArea: "目",
    emoji: "👀",
  },
];

/** タイマーの間隔オプション（分） */
export const INTERVAL_OPTIONS = [
  { value: 10, label: "10分" },
  { value: 15, label: "15分" },
  { value: 20, label: "20分" },
  { value: 30, label: "30分" },
  { value: 45, label: "45分" },
  { value: 60, label: "60分" },
] as const;
