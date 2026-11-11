import s01 from "@/assets/s01.jpg";
import s02 from "@/assets/s02.jpg";
import s03 from "@/assets/s03.jpg";
import s04 from "@/assets/s04.jpg";
import s05 from "@/assets/s05.jpg";
import s06 from "@/assets/s06.jpg";
import s07 from "@/assets/s07.jpg";
import s08 from "@/assets/s08.jpg";

export type ShotId = "S01" | "S02" | "S03" | "S04" | "S05" | "S06" | "S07" | "S08";
export type ComboId = "A" | "B";

export interface Asset {
  id: ShotId;
  title: string;
  duration: number;
  summary: string;
  description: string;
  tags: string[];
  thumb: string;
}

export const ASSETS: Asset[] = [
  { id: "S01", title: "咖啡店门头", duration: 4, summary: "店铺外观", description: "木质门面与悬挂招牌，门口有绿植和小黑板，清晨侧光。", tags: ["店铺外观", "地点信息", "开场"], thumb: s01 },
  { id: "S02", title: "咖啡馆环境", duration: 5, summary: "阳光与座位", description: "大面落地窗，阳光洒在木桌上，座位宽松安静。", tags: ["空间", "自然光", "座位"], thumb: s02 },
  { id: "S03", title: "菜单价格", duration: 4, summary: "饮品价格与优惠", description: "黑板菜单清晰列出各类饮品价格。", tags: ["价格", "消费信息", "文字信息"], thumb: s03 },
  { id: "S04", title: "咖啡制作", duration: 6, summary: "咖啡师制作饮品", description: "咖啡师操作意式咖啡机萃取，蒸汽升起。", tags: ["制作过程", "人物", "声音感"], thumb: s04 },
  { id: "S05", title: "咖啡拉花", duration: 5, summary: "拿铁特写", description: "俯拍心形拉花拿铁，陶瓷杯与木桌。", tags: ["产品特写", "拿铁", "细节"], thumb: s05 },
  { id: "S06", title: "甜点展示", duration: 4, summary: "甜品与咖啡组合", description: "蛋糕、可颂与拿铁组合摆盘，大理石桌面。", tags: ["甜点", "套餐组合", "产品"], thumb: s06 },
  { id: "S07", title: "靠窗阅读", duration: 5, summary: "安静的阅读场景", description: "窗边的人物低头阅读，桌上放着一杯拿铁。", tags: ["氛围", "人物", "慢生活"], thumb: s07 },
  { id: "S08", title: "朋友聊天", duration: 5, summary: "轻松愉快的社交场景", description: "两位朋友相对而坐，边喝咖啡边聊天。", tags: ["社交", "情绪", "人物"], thumb: s08 },
];

export const assetById = (id: ShotId) => ASSETS.find((a) => a.id === id)!;

export interface ComboDef {
  id: ComboId;
  audience: string;
  audienceDesc: string;
  goal: string;
  goalDesc: string;
  title: string;
  focus: string[];
  summary: string;
  reasons: Record<ShotId, string>;
}

export const COMBOS: Record<ComboId, ComboDef> = {
  A: {
    id: "A",
    audience: "留学生 / 预算敏感人群",
    audienceDesc: "关注价格、位置和性价比，希望快速判断是否值得去。",
    goal: "实用攻略",
    goalDesc: "信息密度高、结论明确，帮助观众做消费决策。",
    title: "留学生探店：这家咖啡馆到底值不值？",
    focus: ["位置与价格", "产品内容", "性价比"],
    summary: "以“值不值”为主线：先交代地点和价格，再展示产品和出品过程，最后给出产品表现，便于观众做决定。",
    reasons: {
      S01: "门头镜头交代店铺位置，方便观众收藏和找到这家店。",
      S02: "座位与环境信息能回答“适不适合久坐、自习”的实际问题。",
      S03: "预算敏感用户更关心消费信息，价格镜头需前置。",
      S04: "制作过程让观众判断出品是否用心，支撑“值不值”的结论。",
      S05: "拿铁特写是最终产品表现，适合作为结论收尾。",
      S06: "甜点组合直接对应“怎么点更划算”的问题。",
      S07: "阅读场景偏氛围，对实用攻略的信息价值较低。",
      S08: "社交场景偏情绪表达，对消费决策帮助有限。",
    },
  },
  B: {
    id: "B",
    audience: "都市白领 / 生活方式爱好者",
    audienceDesc: "关注空间氛围和情绪体验，希望找到能放松的周末去处。",
    goal: "情绪氛围",
    goalDesc: "节奏舒缓、画面优先，传递感受而非信息。",
    title: "把周末交给阳光和一杯咖啡",
    focus: ["空间氛围", "情绪体验", "周末放松"],
    summary: "以“慢下来”为情绪线：从空间光线进入，到个人阅读、咖啡细节，最后落在朋友相聚的温暖感。",
    reasons: {
      S01: "门头可作为情绪开场，但信息感较强，需配合柔和字幕。",
      S02: "阳光与座位最能建立放松的空间氛围，适合开场。",
      S03: "价格信息会打断情绪节奏，与氛围目标不符。",
      S04: "制作过程的声音与动作带来沉浸感，承接情绪。",
      S05: "拉花特写细腻柔和，是情绪的视觉落点。",
      S06: "甜点能补充“犒劳自己”的感受，可作为过渡。",
      S07: "生活方式受众更关注放松氛围，阅读场景直接对应。",
      S08: "朋友聊天带来温暖收尾，呼应“最好的周末”。",
    },
  },
};

export type Pair = [ShotId, string];

/** Initial AI plans (fixed). */
export const INITIAL: Record<ComboId, Pair[]> = {
  A: [
    ["S01", "周末发现一家值得收藏的咖啡馆"],
    ["S03", "先看看菜单和价格"],
    ["S06", "咖啡搭配甜点，值不值得点？"],
    ["S04", "现场制作，看看出品过程"],
    ["S05", "最后看看这杯拿铁的表现"],
  ],
  B: [
    ["S02", "终于找到一个可以慢下来的地方"],
    ["S07", "在阳光下读几页喜欢的书"],
    ["S04", "听咖啡机慢慢工作的声音"],
    ["S05", "一杯拿铁，让时间变得柔软"],
    ["S08", "和朋友聊天，就是最好的周末"],
  ],
};

/** Preset alternative plans used by local regeneration. Only shots relevant to the audience. */
export const ALTERNATIVES: Record<ComboId, Pair[][]> = {
  A: [
    [
      ["S03", "进店前先算算预算：人均30元左右"],
      ["S02", "座位宽敞，适合久坐自习"],
      ["S06", "甜点套餐比单点更划算"],
      ["S05", "这杯拿铁对得起价格吗？"],
      ["S01", "地址先收藏，周末再来"],
    ],
    [
      ["S01", "地铁站步行几分钟就能到"],
      ["S06", "推荐点法：拿铁加一块蛋糕"],
      ["S03", "价格表一览，学生党放心点"],
      ["S04", "出品过程干净利落"],
      ["S02", "环境也不错，可以坐一下午"],
    ],
  ],
  B: [
    [
      ["S01", "推开街角的木门，周末就开始了"],
      ["S02", "午后的光铺满了整个空间"],
      ["S05", "奶泡慢慢化开的样子"],
      ["S06", "再给自己一点甜"],
      ["S07", "一页一页，不必赶时间"],
    ],
    [
      ["S07", "窗边的位置刚刚好"],
      ["S06", "一块蛋糕，配一杯热咖啡"],
      ["S04", "蒸汽升起的那一刻很安静"],
      ["S08", "朋友的笑声最治愈"],
      ["S02", "把这束阳光留给下一个周末"],
    ],
  ],
};
