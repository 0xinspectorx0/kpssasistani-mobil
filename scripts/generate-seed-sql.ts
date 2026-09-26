/**
 * Supabase icin icerik aktarim dosyasi uretir.
 * Cikti: supabase/icerik-aktar.sql
 * Calistir: npx tsx scripts/generate-seed-sql.ts
 *
 * Uretimden once seed verileri, DB trigger'larinin (validate_content_entry)
 * ve tablo kisitlarinin birebir kuraliyla yerelde dogrulanir.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedEntries } from '../lib/content-schema';

type Kind = 'questions' | 'lessons' | 'news' | 'events' | 'targets' | 'scores' | 'quotes';

// supabase/migrations/202609220001_admin_content.sql -> validate_content_entry()
const REQUIRED_FIELDS: Record<Kind, string[]> = {
  questions: ['question', 'category', 'difficulty', 'explanation'],
  lessons: ['name', 'icon', 'color', 'questions'],
  news: ['title', 'category', 'detail', 'date'],
  events: ['title', 'date', 'type', 'desc'],
  targets: ['name', 'short', 'scoreType', 'eventId'],
  scores: ['level', 'kadro', 'kurum'],
  quotes: ['text', 'author'],
};
const QUESTION_CATEGORIES = ['turkce', 'matematik', 'tarih', 'cografya', 'vatandaslik', 'guncel'];
const DIFFICULTIES = ['Kolay', 'Orta', 'Zor'];
const ID_RE = /^[a-zA-Z0-9_-]{1,120}$/;

const errors: string[] = [];
const entries = seedEntries();

for (const entry of entries) {
  const p = entry.payload as Record<string, unknown>;
  const tag = `${entry.kind}/${entry.id}`;

  // Tablo DDL: id formati + payload.id = id + boyut
  if (!ID_RE.test(entry.id)) errors.push(`${tag}: id formati gecersiz`);
  if (p.id !== entry.id) errors.push(`${tag}: payload.id satir id'si ile ayni degil`);
  const payloadSize = Buffer.byteLength(JSON.stringify(p), 'utf8');
  if (payloadSize > 200000) errors.push(`${tag}: payload cok buyuk (${payloadSize} bayt)`);

  // Trigger: zorunlu alanlar string ve 1..20000 karakter olmali
  for (const field of REQUIRED_FIELDS[entry.kind as Kind] ?? []) {
    const v = p[field];
    if (typeof v !== 'string' || v.trim().length < 1 || v.trim().length > 20000) {
      errors.push(`${tag}: '${field}' alani gecersiz (string 1..20000 bekleniyor)`);
    }
  }

  // Trigger: soru kurallari
  if (entry.kind === 'questions') {
    if (!QUESTION_CATEGORIES.includes(String(p.category))) errors.push(`${tag}: gecersiz kategori`);
    if (!DIFFICULTIES.includes(String(p.difficulty))) errors.push(`${tag}: gecersiz zorluk`);
    if (!Array.isArray(p.options) || p.options.length !== 5) errors.push(`${tag}: tam 5 secenek gerekli`);
    if (!Array.isArray(p.options)) continue;
    p.options.forEach((o, i) => {
      if (typeof o !== 'string' || o.trim().length < 1 || o.trim().length > 20000) {
        errors.push(`${tag}: secenek ${i} gecersiz`);
      }
    });
    if (typeof p.answer !== 'number' || !Number.isInteger(p.answer) || p.answer < 0 || p.answer > 4) {
      errors.push(`${tag}: answer 0-4 araliginda tam sayi olmali`);
    } else if (p.answer >= p.options.length) {
      errors.push(`${tag}: answer secenek sinirini asiyor`);
    }
  }
}

if (errors.length) {
  console.error(`DOGRLAMA HATASI (${errors.length}):`);
  for (const e of errors.slice(0, 30)) console.error(' -', e);
  process.exit(1);
}

const sqlEscape = (s: string) => s.replace(/'/g, "''");
const values = entries
  .map((e) => `  ('${e.kind}', '${e.id}', '${sqlEscape(JSON.stringify(e.payload))}'::jsonb, 'published')`)
  .join(',\n');

const counts: Record<string, number> = {};
for (const e of entries) counts[e.kind] = (counts[e.kind] ?? 0) + 1;
const summary = Object.entries(counts)
  .map(([k, n]) => `${k}=${n}`)
  .join(', ');

const sql = `-- KPSS Asistanim - icerik aktarimi (GitHub'daki paketlenmis test ve veriler)
-- Olusturucu: npx tsx scripts/generate-seed-sql.ts
-- Kullanim: Supabase Dashboard -> SQL Editor -> bu dosyayi yapistir -> Run.
-- Guvenli: varolan icerik uzerine yazmaz (on conflict do nothing), tekrar calistirilabilir.
-- Kayit sayisi: ${entries.length} (${summary})
begin;

insert into public.content_entries (kind, id, payload, status)
values
${values}
on conflict (kind, id) do nothing;

commit;
`;

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'supabase', 'icerik-aktar.sql');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, sql);
console.log(`OK -> ${out}`);
console.log(`Kayit: ${entries.length} (${summary})`);
