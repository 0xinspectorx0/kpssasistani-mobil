// Ders (kategori) kataloğu, yayındaki LESSONS kayıtlarından türetilir.
// Böylece yöneticiler yeni dersler ekleyip mevcut dersleri yeniden adlandırabilir;
// soru çözme, konu takibi ve profil ekranları otomatik olarak güncel kalır.
import { ContentEntry } from './content-schema';
import { CategoryId, CATEGORY_LIST } from './data';
import { useContent } from './content';

export interface CategoryMeta {
  id: string;
  name: string;
  short?: string;
  icon: string;
  color: string;
  desc?: string;
}

function fallbackColor(i: number): string {
  const palette = ['#2563EB', '#7C3AED', '#B45309', '#059669', '#D7263D', '#EA580C', '#0E7490', '#9333EA'];
  return palette[i % palette.length];
}

// Sabit katalogdaki varsayılan görselleri koruyarak bir lesson → kategori meta üretir.
export const lessonMetaById: Record<string, CategoryMeta> = CATEGORY_LIST.reduce((acc, c) => {
  acc[c.id] = { id: c.id, name: c.name, short: c.short, icon: c.icon, color: c.color, desc: c.desc };
  return acc;
}, {} as Record<string, CategoryMeta>);

export function lessonMeta(id: string, index: number, overrides?: { name?: string; icon?: string; color?: string }): CategoryMeta {
  const base = lessonMetaById[id] ?? {
    id,
    name: overrides?.name ?? id,
    short: id.slice(0, 2).toLocaleUpperCase('tr'),
    icon: 'book-outline',
    color: fallbackColor(index),
    desc: '',
  };
  return {
    id,
    name: overrides?.name ?? base.name,
    short: base.short,
    icon: overrides?.icon ?? base.icon,
    color: overrides?.color ?? base.color,
    desc: base.desc,
  };
}

// Yayındaki LESSONS kayıtlarından katalog listesini üretir.
// lessons yoksa (boş veritabanı) soruların kullandığı kategorilere düşer;
// ikisi de yoksa gömülü sabit listeye döner.
export function buildCategories(
  lessons: { id: string; name: string; icon: string; color: string }[],
  questionCategoryIds: string[],
  extraIds: string[] = [],
): CategoryMeta[] {
  const seen = new Set<string>();
  const out: CategoryMeta[] = [];
  lessons.forEach((l, i) => {
    if (seen.has(l.id)) return;
    seen.add(l.id);
    out.push(lessonMeta(l.id, i, l));
  });
  questionCategoryIds.forEach((id, i) => {
    if (seen.has(id)) return;
    seen.add(id);
    out.push(lessonMeta(id, out.length));
  });
  extraIds.forEach((id) => {
    if (seen.has(id)) return;
    seen.add(id);
    out.push(lessonMeta(id, out.length));
  });
  return out;
}

// Eski CategoryId türü sabittir; yeni dersler bunun dışına çıkabilir.
// QuizQuestion.category artık serbest string olduğu için burada tip uyumluluğu sağlanır.
export type AnyCategoryId = CategoryId | (string & {});

export function useCategoryList(): CategoryMeta[] {
  const { lessons, questions } = useContent();
  const questionIds = Array.from(new Set(questions.map((q) => q.category)));
  return buildCategories(
    lessons.map((l) => ({ id: l.id, name: l.name, icon: l.icon, color: l.color })),
    questionIds,
  );
}
