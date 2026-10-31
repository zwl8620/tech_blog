// 工具函数：标签/合集 ASCII slug 映射（PRD F4/F17：GitHub Pages 中文 URL 404 坑）

// 简易拼音映射：仅覆盖常用标签场景；未覆盖字符回退 hash 短码
const PINYIN_MAP: Record<string, string> = {
  '生': 'sheng', '物': 'wu', '医': 'yi', '学': 'xue', '习': 'xi',
  '笔': 'bi', '记': 'ji', '技': 'ji', '术': 'shu', '工': 'gong',
  '作': 'zuo', '单': 'dan', '细': 'xi', '胞': 'bao', '空': 'kong',
  '间': 'jian', '转': 'zhuan', '录': 'lu', '组': 'zu', '测': 'ce',
  '序': 'xu', '分': 'fen', '析': 'xi', '数': 'shu', '据': 'ju',
  '人': 'ren', '智': 'zhi', '能': 'neng', '体': 'ti',
  '外': 'wai', '诊': 'zhen', '断': 'duan', '实': 'shi', '验': 'yan',
  '设': 'she', '计': 'ji', '批': 'pi', '次': 'ci', '效': 'xiao',
  '应': 'ying', '讯': 'xun',
  '质': 'zhi', '控': 'kong', '降': 'jiang', '维': 'wei', '聚': 'ju',
  '类': 'lei', '注': 'zhu', '释': 'shi', '差': 'cha', '异': 'yi',
  '信': 'xin', '号': 'hao', '通': 'tong', '路': 'lu', '去': 'qu',
  '卷': 'juan', '积': 'ji', '邻': 'lin', '域': 'yu', '博': 'bo',
  '客': 'ke', '搭': 'da', '建': 'jian', '部': 'bu', '署': 'shu',
  '自': 'zi', '动': 'dong', '化': 'hua', '思': 'si', '考': 'kao',
  'ai': 'ai', 'a': 'a', 'i': 'i',
};

function hashShort(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36).slice(0, 6);
}

/**
 * 中文标签/合集名 → ASCII slug
 * 逐字走拼音映射；无法映射的字符统一回退 hash 短码，保证 URL 全 ASCII
 */
export function toAsciiSlug(name: string): string {
  const cleaned = name.trim().toLowerCase();
  if (!cleaned) return 'untagged';
  // 纯 ASCII 直接返回（连字符归一）
  if (/^[\x20-\x7e]+$/.test(cleaned)) {
    return cleaned.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'n-a';
  }
  const parts: string[] = [];
  let matched = true;
  for (const ch of cleaned) {
    if (PINYIN_MAP[ch]) {
      parts.push(PINYIN_MAP[ch]);
    } else if (/[a-z0-9]/.test(ch)) {
      parts.push(ch);
    } else if (ch === ' ') {
      parts.push('-');
    } else {
      matched = false;
      break;
    }
  }
  if (matched && parts.length) {
    return parts.join('').replace(/-+/g, '-').replace(/^-+|-+$/g, '') || hashShort(cleaned);
  }
  return hashShort(cleaned);
}

/** 阅读时长：中文按 400 字/分钟，英文按 200 词/分钟（PRD F3） */
export function readingTime(text: string): string {
  const cjkCount = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const words = text.length - cjkCount;
  const minutes = Math.max(1, Math.round(cjkCount / 400 + words / 1200));
  return `${minutes} 分钟`;
}

/** 日期统一 YYYY-MM-DD（PRD F2/F5'） */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
