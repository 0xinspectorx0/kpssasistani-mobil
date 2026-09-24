export interface QuizQuestion {
  id: string;
  category: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  difficulty: 'Kolay' | 'Orta' | 'Zor';
}

export type CategoryId = 'turkce' | 'matematik' | 'tarih' | 'cografya' | 'vatandaslik' | 'guncel' | (string & {});

export interface Category {
  id: string;
  name: string;
  short: string;
  icon: string;
  color: string;
  desc: string;
}

export const CATEGORY_LIST: Category[] = [
  { id: 'turkce', name: 'Türkçe', short: 'TR', icon: 'language', color: '#2563EB', desc: 'Dil bilgisi, paragraf ve anlatım' },
  { id: 'matematik', name: 'Matematik', short: 'MT', icon: 'calculator', color: '#7C3AED', desc: 'Sayılar, problemler ve geometri' },
  { id: 'tarih', name: 'Tarih', short: 'TA', icon: 'library', color: '#B45309', desc: 'Türk tarihi ve inkılaplar' },
  { id: 'cografya', name: 'Coğrafya', short: 'CO', icon: 'earth', color: '#059669', desc: 'Türkiye coğrafyası ve harita' },
  { id: 'vatandaslik', name: 'Vatandaşlık', short: 'VA', icon: 'shield-checkmark', color: '#D7263D', desc: 'Anayasa ve idare hukuku' },
  { id: 'guncel', name: 'Güncel Bilgiler', short: 'GU', icon: 'newspaper', color: '#EA580C', desc: '2025-2026 gündemi ve klasikler' },
];

export const QUESTIONS: QuizQuestion[] = [
  { id: 'tr1', category: 'turkce', difficulty: 'Kolay', question: 'Aşağıdaki sözcüklerden hangisinin yazımı doğrudur?', options: ['Herşey', 'Hiç birşey', 'Her şey', 'Herşeyi'], answer: 2, explanation: '"şey" sözcüğü her zaman ayrı yazılır: her şey, bir şey, hiçbir şey.' },
  { id: 'tr2', category: 'turkce', difficulty: 'Kolay', question: '"Çiçek" sözcüğünün "çiçeği" biçiminde yazılmasının nedeni nedir?', options: ['Ünsüz yumuşaması', 'Ünsüz benzeşmesi', 'Ünlü daralması', 'Kaynaştırma ünsüzü'], answer: 0, explanation: 'Sert ünsüzle (p, ç, t, k) biten sözcüklere ünlüyle başlayan ek gelince yumuşama olur: çiçek → çiçeği.' },
  { id: 'tr3', category: 'turkce', difficulty: 'Orta', question: 'Aşağıdaki cümlelerin hangisinde virgülün kullanım amacı diğerlerinden farklıdır?', options: ['Genç, yaşlı demeden herkes katıldı.', 'Ankara, İstanbul, İzmir büyükşehirlerdendir.', 'Öğrenciler, sınavda çok heyecanlıydı.', 'Elma, armut, kiraz aldık.'], answer: 2, explanation: 'Diğerlerinde eş görevli sözcükleri ayırmak için kullanılırken C seçeneğinde özneyi vurgulamak için kullanılmıştır.' },
  { id: 'tr4', category: 'turkce', difficulty: 'Kolay', question: '"Geliyorum" fiilinin kipi ve zamanı nedir?', options: ['Şimdiki zaman – haber kipi', 'Gelecek zaman – dilek kipi', 'Geniş zaman – haber kipi', 'Geçmiş zaman – dilek kipi'], answer: 0, explanation: '"-yor" eki şimdiki zaman ekidir ve haber (bildirme) kiplerindendir.' },
  { id: 'tr5', category: 'turkce', difficulty: 'Kolay', question: '"Öğrenciler sınavda çok heyecanlandı." cümlesinin öznesi hangisidir?', options: ['Öğrenciler', 'sınavda', 'çok', 'heyecanlandı'], answer: 0, explanation: 'Yükleme sorulan "kim?" sorusunun yanıtı öznedir: Kim heyecanlandı? → Öğrenciler.' },
  { id: 'tr6', category: 'turkce', difficulty: 'Orta', question: '"Güzel" sözcüğü hangi cümlede isim olarak kullanılmıştır?', options: ['Güzel günler göreceğiz.', 'Çok güzel şarkı söylüyor.', 'Güzeli herkes sever.', 'Güzel güzel konuştu.'], answer: 2, explanation: '"Güzeli" sözcüğü adlaşmış sıfattır; cümlede isim göreviyle kullanılmıştır.' },
  { id: 'tr7', category: 'turkce', difficulty: 'Orta', question: '"Bu konuyu mutlaka ve mutlaka öğrenmelisin." cümlesindeki anlatım bozukluğunun nedeni nedir?', options: ['Gereksiz sözcük kullanımı', 'Özne – yüklem uyumsuzluğu', 'Ek yanlışlığı', 'Tamlama yanlışlığı'], answer: 0, explanation: 'Aynı anlama gelen sözcüklerin birlikte kullanılması gereksiz sözcük kullanımından kaynaklanır.' },
  { id: 'tr8', category: 'turkce', difficulty: 'Zor', question: '"Sınava düzenli çalışan öğrenciler başarılı oldu." cümlesinde "düzenli çalışan" grubunun türü nedir?', options: ['Sıfat tamlaması', 'İsim tamlaması', 'Sıfat-fiil grubu', 'Zarf-fiil grubu'], answer: 2, explanation: '"-an" eki sıfat-fiil ekidir; ifade sıfat-fiil grubudur.' },
  { id: 'mt1', category: 'matematik', difficulty: 'Kolay', question: '2³ + 3² işleminin sonucu kaçtır?', options: ['14', '17', '13', '19'], answer: 1, explanation: '2³ = 8 ve 3² = 9 olduğundan 8 + 9 = 17 bulunur.' },
  { id: 'mt2', category: 'matematik', difficulty: 'Kolay', question: 'Bir sayının %25\'i 60 ise bu sayı kaçtır?', options: ['180', '200', '240', '220'], answer: 2, explanation: 'Sayının dörtte biri 60 ise sayı 60 × 4 = 240 olur.' },
  { id: 'mt3', category: 'matematik', difficulty: 'Kolay', question: 'EBOB(12, 18) kaçtır?', options: ['2', '3', '6', '36'], answer: 2, explanation: '12 = 2²×3, 18 = 2×3² olduğundan ortak bölenlerin en büyüğü 2×3 = 6\'dır.' },
  { id: 'mt4', category: 'matematik', difficulty: 'Orta', question: 'x + 7 = 3x − 9 denklemini sağlayan x değeri kaçtır?', options: ['8', '6', '4', '2'], answer: 0, explanation: '7 + 9 = 3x − x → 16 = 2x → x = 8 bulunur.' },
  { id: 'mt5', category: 'matematik', difficulty: 'Orta', question: 'Ardışık üç çift sayının toplamı 48 ise en büyüğü kaçtır?', options: ['14', '16', '18', '20'], answer: 2, explanation: 'Ortanca sayı 48 ÷ 3 = 16\'dır. Sayılar 14, 16, 18 olur; en büyüğü 18\'dir.' },
  { id: 'mt6', category: 'matematik', difficulty: 'Orta', question: 'Bir işçi bir işi 12 günde, diğeri 6 günde bitiriyor. İkisi birlikte kaç günde bitirir?', options: ['2', '3', '4', '8'], answer: 2, explanation: '1/12 + 1/6 = 3/12 = 1/4 olduğundan iş birlikte 4 günde biter.' },
  { id: 'mt7', category: 'matematik', difficulty: 'Orta', question: '5! / 3! işleminin sonucu kaçtır?', options: ['2', '10', '20', '120'], answer: 2, explanation: '5!/3! = 5×4 = 20\'dir (3!\'ler sadeleşir).' },
  { id: 'mt8', category: 'matematik', difficulty: 'Zor', question: 'Alanı 49 cm² olan karenin çevresi kaç cm\'dir?', options: ['14', '21', '28', '35'], answer: 2, explanation: 'Karenin bir kenarı √49 = 7 cm\'dir. Çevre = 4 × 7 = 28 cm olur.' },
  { id: 'ta1', category: 'tarih', difficulty: 'Kolay', question: 'Malazgirt Meydan Muharebesi hangi yılda yapılmıştır?', options: ['1040', '1071', '1176', '1243'], answer: 1, explanation: 'Sultan Alparslan komutasındaki Selçuklu ordusu 1071\'de Bizans\'ı yenerek Anadolu\'nun kapılarını Türklere açtı.' },
  { id: 'ta2', category: 'tarih', difficulty: 'Kolay', question: 'İstanbul hangi Osmanlı padişahı döneminde fethedilmiştir?', options: ['Orhan Bey', 'I. Murat', 'Fatih Sultan Mehmet', 'Yavuz Sultan Selim'], answer: 2, explanation: 'İstanbul, 29 Mayıs 1453\'te II. Mehmet (Fatih Sultan Mehmet) tarafından fethedildi.' },
  { id: 'ta3', category: 'tarih', difficulty: 'Kolay', question: 'TBMM hangi tarihte açılmıştır?', options: ['19 Mayıs 1919', '23 Nisan 1920', '29 Ekim 1923', '30 Ağustos 1922'], answer: 1, explanation: 'Türkiye Büyük Millet Meclisi 23 Nisan 1920\'de Ankara\'da açılmıştır.' },
  { id: 'ta4', category: 'tarih', difficulty: 'Orta', question: 'Miryakefalon Savaşı\'nın (1176) en önemli sonucu nedir?', options: ['Anadolu\'nun kesin Türk yurdu olması', 'İstanbul\'un fethedilmesi', 'Haçlıların Anadolu\'dan atılması', 'Moğol baskısının sona ermesi'], answer: 0, explanation: 'II. Kılıçarslan\'ın Bizans\'ı yenmesiyle Anadolu\'nun Türk yurdu olduğu kesinleşti.' },
  { id: 'ta5', category: 'tarih', difficulty: 'Kolay', question: 'Lozan Barış Antlaşması hangi yılda imzalanmıştır?', options: ['1920', '1921', '1922', '1923'], answer: 3, explanation: 'Lozan Antlaşması 24 Temmuz 1923\'te imzalanmış, yeni Türk devletinin bağımsızlığı tanınmıştır.' },
  { id: 'ta6', category: 'tarih', difficulty: 'Kolay', question: 'Cumhuriyet hangi tarihte ilan edilmiştir?', options: ['23 Nisan 1920', '29 Ekim 1923', '3 Mart 1924', '1 Kasım 1922'], answer: 1, explanation: 'Cumhuriyet 29 Ekim 1923\'te ilan edilmiş, Mustafa Kemal Atatürk ilk cumhurbaşkanı seçilmiştir.' },
  { id: 'ta7', category: 'tarih', difficulty: 'Kolay', question: 'Osmanlı Devleti\'nin kurucusu kimdir?', options: ['Ertuğrul Gazi', 'Osman Bey', 'Orhan Bey', 'I. Murat'], answer: 1, explanation: 'Osmanlı Devleti 1299\'da Osman Bey tarafından Söğüt-Domaniç çevresinde kurulmuştur.' },
  { id: 'ta8', category: 'tarih', difficulty: 'Orta', question: 'Sakarya Meydan Muharebesi\'nde Türk ordusunun başkomutanı kimdir?', options: ['İsmet İnönü', 'Fevzi Çakmak', 'Mustafa Kemal Atatürk', 'Kazım Karabekir'], answer: 2, explanation: 'TBMM\'nin verdiği Başkomutanlık yetkisiyle Sakarya\'da ordunun başında Mustafa Kemal Atatürk vardı.' },
  { id: 'co1', category: 'cografya', difficulty: 'Kolay', question: 'Türkiye\'nin nüfusu en kalabalık ili hangisidir?', options: ['Ankara', 'İzmir', 'İstanbul', 'Bursa'], answer: 2, explanation: 'İstanbul, 15 milyonu aşan nüfusuyla Türkiye\'nin en kalabalık ilidir.' },
  { id: 'co2', category: 'cografya', difficulty: 'Kolay', question: 'Türkiye\'de en fazla yağış alan bölge hangisidir?', options: ['Akdeniz', 'Karadeniz', 'Ege', 'İç Anadolu'], answer: 1, explanation: 'Karadeniz Bölgesi, özellikle Doğu Karadeniz kıyıları her mevsim yağış alır.' },
  { id: 'co3', category: 'cografya', difficulty: 'Kolay', question: 'Van Gölü hangi coğrafi bölgemizde yer alır?', options: ['İç Anadolu', 'Doğu Anadolu', 'Güneydoğu Anadolu', 'Akdeniz'], answer: 1, explanation: 'Türkiye\'nin en büyük gölü olan Van Gölü, Doğu Anadolu Bölgesi\'ndedir.' },
  { id: 'co4', category: 'cografya', difficulty: 'Orta', question: 'Tamamı ülke sınırları içinde kalan en uzun akarsuyumuz hangisidir?', options: ['Fırat', 'Kızılırmak', 'Yeşilırmak', 'Sakarya'], answer: 1, explanation: 'Kızılırmak (1355 km) doğduğu gibi denize de Türkiye\'de dökülen en uzun akarsudur.' },
  { id: 'co5', category: 'cografya', difficulty: 'Orta', question: 'Soma linyit yatakları hangi ilimizdedir?', options: ['Kütahya', 'Manisa', 'Muğla', 'Balıkesir'], answer: 1, explanation: 'Soma, Manisa iline bağlıdır ve önemli linyit havzalarındandır.' },
  { id: 'co6', category: 'cografya', difficulty: 'Kolay', question: 'Fındık üretiminin en yoğun olduğu bölgemiz hangisidir?', options: ['Marmara', 'Karadeniz', 'Ege', 'Akdeniz'], answer: 1, explanation: 'Türkiye dünya fındık üretiminde ilk sıradadır; üretim Karadeniz\'de yoğunlaşmıştır.' },
  { id: 'co7', category: 'cografya', difficulty: 'Zor', question: 'Türkiye\'nin matematik (mutlak) konumu nedir?', options: ['26°–45° doğu boylamları, 36°–42° kuzey enlemleri', '26°–45° batı boylamları, 36°–42° güney enlemleri', '36°–42° doğu boylamları, 26°–45° kuzey enlemleri', '20°–40° doğu boylamları, 30°–40° kuzey enlemleri'], answer: 0, explanation: 'Türkiye 26°–45° doğu meridyenleri ile 36°–42° kuzey paralelleri arasındadır.' },
  { id: 'co8', category: 'cografya', difficulty: 'Kolay', question: 'Pamukkale travertenleri hangi ilimizdedir?', options: ['Muğla', 'Denizli', 'Antalya', 'Burdur'], answer: 1, explanation: 'Pamukkale travertenleri Denizli\'dedir ve UNESCO Dünya Mirası Listesi\'ndedir.' },
  { id: 'va1', category: 'vatandaslik', difficulty: 'Kolay', question: '1982 Anayasası\'na göre yasama yetkisi kime aittir?', options: ['Cumhurbaşkanına', 'TBMM\'ye', 'Anayasa Mahkemesine', 'Danıştaya'], answer: 1, explanation: 'Yasama yetkisi Türk Milleti adına TBMM tarafından kullanılır; devredilemez.' },
  { id: 'va2', category: 'vatandaslik', difficulty: 'Kolay', question: 'Milletvekili seçilebilmek için en az kaç yaşını doldurmak gerekir?', options: ['18', '21', '25', '30'], answer: 0, explanation: '2017 Anayasa değişikliğiyle seçilme yaşı 25\'ten 18\'e indirilmiştir.' },
  { id: 'va3', category: 'vatandaslik', difficulty: 'Kolay', question: 'Cumhurbaşkanı kaç yılda bir seçilir?', options: ['4', '5', '6', '7'], answer: 1, explanation: 'Cumhurbaşkanı ve TBMM seçimleri beş yılda bir, aynı gün yapılır.' },
  { id: 'va4', category: 'vatandaslik', difficulty: 'Kolay', question: 'TBMM kaç milletvekilinden oluşur?', options: ['550', '600', '650', '500'], answer: 1, explanation: '2017 değişikliğiyle milletvekili sayısı 550\'den 600\'e çıkarılmıştır.' },
  { id: 'va5', category: 'vatandaslik', difficulty: 'Orta', question: 'Anayasa\'ya göre "Egemenlik kayıtsız şartsız" kimindir?', options: ['Cumhurbaşkanının', 'TBMM\'nin', 'Milletin', 'Hükümetin'], answer: 2, explanation: 'Anayasa m.6: "Egemenlik, kayıtsız şartsız Milletindir."' },
  { id: 'va6', category: 'vatandaslik', difficulty: 'Kolay', question: 'İl genel yönetiminin başı kimdir?', options: ['Belediye başkanı', 'Vali', 'Kaymakam', 'Muhtar'], answer: 1, explanation: 'Vali, ilde devletin ve hükümetin temsilcisidir.' },
  { id: 'va7', category: 'vatandaslik', difficulty: 'Kolay', question: 'Belediye başkanı ve muhtar kaç yılda bir seçilir?', options: ['4', '5', '6', '7'], answer: 1, explanation: 'Mahalli idareler seçimleri beş yılda bir yapılır.' },
  { id: 'va8', category: 'vatandaslik', difficulty: 'Zor', question: 'Siyasi parti kurmak için en az kaç Türk vatandaşının bir araya gelmesi gerekir?', options: ['20', '25', '30', '50'], answer: 2, explanation: 'En az 30 Türk vatandaşı bir araya gelerek siyasi parti kurabilir.' },
  { id: 'gu1', category: 'guncel', difficulty: 'Orta', question: '2026 FIFA Dünya Kupası hangi ülkelerde düzenlenecektir?', options: ['Brezilya – Arjantin', 'ABD – Kanada – Meksika', 'İspanya – Portekiz', 'Almanya – Fransa'], answer: 1, explanation: '2026 Dünya Kupası ABD, Kanada ve Meksika\'nın ortak ev sahipliğinde düzenlenecektir.' },
  { id: 'gu2', category: 'guncel', difficulty: 'Orta', question: '2026 Kış Olimpiyatları nerede düzenlenecektir?', options: ['Pekin', 'Milano – Cortina (İtalya)', 'Vancouver', 'Seul'], answer: 1, explanation: '2026 Kış Olimpiyatları İtalya\'nın Milano-Cortina bölgesinde yapılacaktır.' },
  { id: 'gu3', category: 'guncel', difficulty: 'Orta', question: 'EURO 2024 Avrupa Futbol Şampiyonası\'nı hangi ülke kazanmıştır?', options: ['İngiltere', 'Fransa', 'İspanya', 'Almanya'], answer: 2, explanation: 'İspanya, finalde İngiltere\'yi yenerek EURO 2024 şampiyonu olmuştur.' },
  { id: 'gu4', category: 'guncel', difficulty: 'Zor', question: '2024 Nobel Ekonomi Ödülü\'nü kazanan Türk bilim insanı kimdir?', options: ['Aziz Sancar', 'Daron Acemoğlu', 'Canan Dağdeviren', 'Gazi Yaşargil'], answer: 1, explanation: 'Daron Acemoğlu; Simon Johnson ve James Robinson ile birlikte 2024 Nobel Ekonomi Ödülü\'nü kazanmıştır.' },
  { id: 'gu5', category: 'guncel', difficulty: 'Kolay', question: 'Türkiye\'nin ilk astronotu kimdir?', options: ['Alper Gezeravcı', 'Cengiz Topel', 'Sabiha Gökçen', 'Vecihi Hürkuş'], answer: 0, explanation: 'Alper Gezeravcı, 2024 yılında Uluslararası Uzay İstasyonu\'na giden ilk Türk astronot olmuştur.' },
  { id: 'gu6', category: 'guncel', difficulty: 'Orta', question: '98. Akademi Ödülleri\'nde (2026) En İyi Film ödülünü hangi yapım kazanmıştır?', options: ['Oppenheimer', 'One Battle After Another', 'Barbie', 'Dune: Part Two'], answer: 1, explanation: '"One Battle After Another" filmi 98. Akademi Ödülleri\'nde En İyi Film seçilmiştir.' },
  { id: 'gu7', category: 'guncel', difficulty: 'Orta', question: '2025\'te Sardes\'in UNESCO listesine alınmasıyla Türkiye\'nin listedeki varlık sayısı kaça yükselmiştir?', options: ['19', '20', '21', '22'], answer: 3, explanation: 'Sardes ve Bin Tepeler\'in eklenmesiyle sayı 22\'ye yükselmiştir.' },
  { id: 'gu8', category: 'guncel', difficulty: 'Zor', question: '2026 Avrupa Şampiyonası\'nda 13. Avrupa şampiyonluğuna ulaşan güreşçimiz kimdir?', options: ['Taha Akgül', 'Rıza Kayaalp', 'Yasemin Adar', 'Süleyman Karadeniz'], answer: 1, explanation: 'Rıza Kayaalp, 2026 Avrupa Şampiyonası\'nda altın madalya kazanarak 13. şampiyonluğuna ulaşmıştır.' },
];

export interface TopicLesson {
  id: CategoryId;
  name: string;
  icon: string;
  color: string;
  questions: string;
  topics: { id: string; name: string }[];
}

export const LESSONS: TopicLesson[] = [
  {
    id: 'turkce', name: 'Türkçe', icon: 'language', color: '#2563EB', questions: 'GY: ~30 soru',
    topics: [
      { id: 'tr-s1', name: 'Sözcükte Anlam' }, { id: 'tr-s2', name: 'Cümlede Anlam' },
      { id: 'tr-s3', name: 'Paragraf Bilgisi' }, { id: 'tr-s4', name: 'Ses Bilgisi' },
      { id: 'tr-s5', name: 'Yazım Kuralları' }, { id: 'tr-s6', name: 'Noktalama İşaretleri' },
      { id: 'tr-s7', name: 'Sözcük Türleri' }, { id: 'tr-s8', name: 'Fiiller ve Ek Fiil' },
      { id: 'tr-s9', name: 'Cümlenin Ögeleri' }, { id: 'tr-s10', name: 'Cümle Türleri' },
      { id: 'tr-s11', name: 'Anlatım Bozuklukları' },
    ],
  },
  {
    id: 'matematik', name: 'Matematik', icon: 'calculator', color: '#7C3AED', questions: 'GY: ~30 soru',
    topics: [
      { id: 'mt-s1', name: 'Temel Kavramlar' }, { id: 'mt-s2', name: 'Sayı Basamakları' },
      { id: 'mt-s3', name: 'EBOB – EKOK' }, { id: 'mt-s4', name: 'Rasyonel Sayılar' },
      { id: 'mt-s5', name: 'Üslü ve Köklü Sayılar' }, { id: 'mt-s6', name: 'Çarpanlara Ayırma' },
      { id: 'mt-s7', name: 'Oran – Orantı' }, { id: 'mt-s8', name: 'Sayı ve Kesir Problemleri' },
      { id: 'mt-s9', name: 'Yaş, İşçi ve Hareket Problemleri' }, { id: 'mt-s10', name: 'Yüzde, Kar-Zarar, Karışım' },
      { id: 'mt-s11', name: 'Kümeler ve Fonksiyonlar' }, { id: 'mt-s12', name: 'Permütasyon – Kombinasyon – Olasılık' },
      { id: 'mt-s13', name: 'Geometri' },
    ],
  },
  {
    id: 'tarih', name: 'Tarih', icon: 'library', color: '#B45309', questions: 'GK: ~27 soru',
    topics: [
      { id: 'ta-s1', name: 'İslamiyet Öncesi Türk Tarihi' }, { id: 'ta-s2', name: 'İlk Müslüman Türk Devletleri' },
      { id: 'ta-s3', name: 'Osmanlı Kuruluş ve Yükselme' }, { id: 'ta-s4', name: 'Osmanlı Duraklama ve Gerileme' },
      { id: 'ta-s5', name: 'Osmanlı Dağılma ve Islahatlar' }, { id: 'ta-s6', name: 'Kurtuluş Savaşı Hazırlık Dönemi' },
      { id: 'ta-s7', name: 'Muharebeler Dönemi' }, { id: 'ta-s8', name: 'Atatürk İlkeleri ve İnkılaplar' },
      { id: 'ta-s9', name: 'Atatürk Dönemi Dış Politika' }, { id: 'ta-s10', name: 'Çağdaş Türk ve Dünya Tarihi' },
    ],
  },
  {
    id: 'cografya', name: 'Coğrafya', icon: 'earth', color: '#059669', questions: 'GK: ~18 soru',
    topics: [
      { id: 'co-s1', name: 'Türkiye\'nin Yeri ve Harita Bilgisi' }, { id: 'co-s2', name: 'İklim' },
      { id: 'co-s3', name: 'Yer Şekilleri ve Jeoloji' }, { id: 'co-s4', name: 'Su Kaynakları' },
      { id: 'co-s5', name: 'Nüfus ve Yerleşme' }, { id: 'co-s6', name: 'Tarım ve Hayvancılık' },
      { id: 'co-s7', name: 'Madenler ve Enerji' }, { id: 'co-s8', name: 'Sanayi, Ulaşım ve Turizm' },
      { id: 'co-s9', name: 'Bölgeler Coğrafyası' },
    ],
  },
  {
    id: 'vatandaslik', name: 'Vatandaşlık', icon: 'shield-checkmark', color: '#D7263D', questions: 'GK: ~9 soru',
    topics: [
      { id: 'va-s1', name: 'Temel Hukuk Kavramları' }, { id: 'va-s2', name: 'Anayasa ve Temel Haklar' },
      { id: 'va-s3', name: 'Yasama' }, { id: 'va-s4', name: 'Yürütme' },
      { id: 'va-s5', name: 'Yargı' }, { id: 'va-s6', name: 'İdare Hukuku ve Mahalli İdareler' },
    ],
  },
  {
    id: 'guncel', name: 'Güncel Bilgiler', icon: 'newspaper', color: '#EA580C', questions: 'GK: ~6 soru',
    topics: [
      { id: 'gu-s1', name: '2025–2026 Spor Gündemi' }, { id: 'gu-s2', name: 'Kültür – Sanat ve Ödüller' },
      { id: 'gu-s3', name: 'Bilim ve Teknoloji' }, { id: 'gu-s4', name: 'Uluslararası Kuruluşlar' },
      { id: 'gu-s5', name: 'UNESCO ve Kültürel Miras' }, { id: 'gu-s6', name: 'Klasik Genel Kültür' },
    ],
  },
];

export type NewsCategory = 'Spor' | 'Kültür-Sanat' | 'Bilim' | 'Kurumlar' | 'Klasikler';

export interface NewsItem {
  id: string;
  category: NewsCategory;
  title: string;
  detail: string;
  date: string;
}

export const NEWS: NewsItem[] = [
  { id: 'n1', category: 'Spor', title: '2026 Dünya Kupası üç ülkede düzenlenecek', detail: '2026 FIFA Dünya Kupası, ABD, Kanada ve Meksika\'nın ortak ev sahipliğinde düzenlenecek. Tarihte ilk kez 48 takımın katılacağı turnuva, KPSS güncel bilgiler için önemli bir başlıktır.', date: '2026' },
  { id: 'n2', category: 'Spor', title: '2026 Kış Olimpiyatları: Milano – Cortina', detail: '2026 Kış Olimpiyat Oyunları İtalya\'nın Milano-Cortina bölgesinde düzenlenecek. 2028 Yaz Olimpiyatları ise ABD\'nin Los Angeles kentinde yapılacak.', date: '2026' },
  { id: 'n3', category: 'Spor', title: 'Rıza Kayaalp\'ten 13. Avrupa şampiyonluğu', detail: 'Milli güreşçi Rıza Kayaalp, 2026 Avrupa Güreş Şampiyonası\'nda altın madalya kazanarak Avrupa şampiyonluğu sayısını 13\'e çıkardı ve Türk güreş tarihine geçti.', date: '2026' },
  { id: 'n4', category: 'Spor', title: 'EURO 2024 şampiyonu İspanya', detail: 'Almanya\'da düzenlenen EURO 2024\'te İspanya, finalde İngiltere\'yi mağlup ederek Avrupa şampiyonu oldu. A Milli Takımımız ise çeyrek finale yükselme başarısı gösterdi.', date: '2024' },
  { id: 'n5', category: 'Spor', title: 'Filenin Sultanları\'ndan dünya ikinciliği', detail: 'A Milli Kadın Voleybol Takımı, 2025 Dünya Voleybol Şampiyonası\'nda finale yükselerek gümüş madalya kazandı. Filenin Sultanları 2023\'te Avrupa şampiyonu olmuştu.', date: '2025' },
  { id: 'n6', category: 'Spor', title: '2024 Paris Olimpiyatları düzenlendi', detail: '2024 Yaz Olimpiyat Oyunları Fransa\'nın başkenti Paris\'te düzenlendi. Okçulukta Mete Gazoz, boksta Busenaz Sürmeneli ve Buse Naz Çakıroğlu madalya mücadelesi verdi.', date: '2024' },
  { id: 'n7', category: 'Kültür-Sanat', title: 'En İyi Film: One Battle After Another', detail: '98. Akademi Ödülleri\'nde (Oscar 2026) "One Battle After Another" filmi En İyi Film ödülünü kazandı. Akademi Ödülleri her yıl ABD\'nin Los Angeles kentinde dağıtılmaktadır.', date: '2026' },
  { id: 'n8', category: 'Kültür-Sanat', title: 'Osman Hamdi Bey eserine rekor fiyat', detail: 'Ünlü Türk ressam Osman Hamdi Bey\'in "Cami Kapısında" adlı eseri, 2026 yılında Londra\'da düzenlenen müzayedede milyonlarca dolara satılarak Türk resim tarihinde rekor kırdı.', date: '2026' },
  { id: 'n9', category: 'Kültür-Sanat', title: '2024 Nobel Edebiyat: Han Kang', detail: '2024 Nobel Edebiyat Ödülü, Güney Koreli yazar Han Kang\'a verildi. Nobel Edebiyat Ödülü\'nü kazanan ilk Türk yazar ise 2006 yılında Orhan Pamuk olmuştur.', date: '2024' },
  { id: 'n10', category: 'Kültür-Sanat', title: '2024 Nobel Barış: Nihon Hidankyo', detail: '2024 Nobel Barış Ödülü, nükleer silahsızlanma için mücadele eden Japon kuruluş Nihon Hidankyo\'ya verildi. Nobel Barış Ödülü Oslo\'da, diğer Nobel ödülleri Stockholm\'de açıklanır.', date: '2024' },
  { id: 'n11', category: 'Bilim', title: 'Nobel Ekonomi\'de Türk imzası: Daron Acemoğlu', detail: 'Prof. Dr. Daron Acemoğlu; Simon Johnson ve James A. Robinson ile birlikte "kurumların oluşumu ve refaha etkisi" çalışmalarıyla 2024 Nobel Ekonomi Ödülü\'nü kazandı. Aziz Sancar ise 2015\'te Nobel Kimya Ödülü\'nü almıştı.', date: '2024' },
  { id: 'n12', category: 'Bilim', title: 'Sardes UNESCO listesinde; sayı 22 oldu', detail: 'Manisa\'daki Sardes Antik Kenti ve Bin Tepeler Lidya Tümülüsleri 2025\'te UNESCO Dünya Mirası Listesi\'ne alındı. Böylece Türkiye\'nin listedeki varlık sayısı 22\'ye yükseldi.', date: '2025' },
  { id: 'n13', category: 'Bilim', title: 'İlk Türk astronot: Alper Gezeravcı', detail: 'Alper Gezeravcı, Ocak 2024\'te Uluslararası Uzay İstasyonu\'na giderek uzaya çıkan ilk Türk astronot oldu. Türkiye\'nin ikinci astronotu ise Tuva Cihangir Atasever\'dir.', date: '2024' },
  { id: 'n14', category: 'Bilim', title: 'TÜRKSAT 6A uzayda', detail: 'Türkiye\'nin ilk yerli ve milli haberleşme uydusu TÜRKSAT 6A, 2024 yılında uzaya fırlatıldı. Türkiye böylece haberleşme uydusu üretebilen sayılı ülkeler arasına girdi.', date: '2024' },
  { id: 'n15', category: 'Bilim', title: '2024 Nobel Fizik: yapay zeka öncüleri', detail: '2024 Nobel Fizik Ödülü, yapay sinir ağları ve makine öğrenmesi alanındaki temel çalışmalarıyla John Hopfield ve Geoffrey Hinton\'a verildi.', date: '2024' },
  { id: 'n16', category: 'Kurumlar', title: 'NATO\'nun merkezi: Brüksel', detail: 'Kuzey Atlantik Antlaşması Örgütü (NATO) 1949\'da kuruldu; merkezi Belçika\'nın başkenti Brüksel\'dedir. Türkiye, 1952 yılından beri NATO üyesidir.', date: 'Klasik' },
  { id: 'n17', category: 'Kurumlar', title: 'BM, UNESCO ve WHO merkezleri', detail: 'Birleşmiş Milletler\'in (BM) merkezi New York, UNESCO\'nun merkezi Paris, Dünya Sağlık Örgütü\'nün (WHO) merkezi Cenevre\'dedir. Bu merkezler KPSS\'de sık sorulur.', date: 'Klasik' },
  { id: 'n18', category: 'Kurumlar', title: 'Türk Devletleri Teşkilatı: İstanbul', detail: 'Türk Devletleri Teşkilatı\'nın sekretaryası İstanbul\'dadır. Türkiye, Azerbaycan, Kazakistan, Kırgızistan ve Özbekistan örgütün üyeleridir.', date: 'Klasik' },
  { id: 'n19', category: 'Kurumlar', title: 'TOGG: Türkiye\'nin yerli otomobili', detail: 'TOGG, Türkiye\'nin ilk yerli ve milli otomobilidir; üretimi Bursa Gemlik\'te yapılmaktadır. KPSS güncel bilgilerde yerli-milli projeler sıkça sorulur.', date: 'Klasik' },
  { id: 'n20', category: 'Klasikler', title: 'İstiklal Marşı: Akif Ersoy – Üngör', detail: 'İstiklal Marşı\'nın şairi Mehmet Akif Ersoy, bestekarı Osman Zeki Üngör\'dür. Marş, 12 Mart 1921\'de TBMM tarafından milli marş olarak kabul edildi.', date: 'Klasik' },
  { id: 'n21', category: 'Klasikler', title: 'İlk kadın savaş pilotu: Sabiha Gökçen', detail: 'Sabiha Gökçen, dünyanın ilk kadın savaş pilotudur ve Atatürk\'ün manevi kızıdır. İstanbul\'daki havalimanlarından biri onun adını taşır.', date: 'Klasik' },
  { id: 'n22', category: 'Klasikler', title: 'Türkiye\'nin ilk UNESCO mirasları (1985)', detail: 'Türkiye\'den listeye ilk giren varlıklar 1985 yılında: Divriği Ulu Camii, İstanbul\'un Tarihi Alanları ve Göreme Milli Parkı\'dır.', date: 'Klasik' },
  { id: 'n23', category: 'Klasikler', title: 'Mehmet Akif Ersoy\'un eseri: Safahat', detail: 'İstiklal Marşı şairimiz Mehmet Akif Ersoy\'un ünlü eserinin adı Safahat\'tır.', date: 'Klasik' },
  { id: 'n24', category: 'Klasikler', title: 'İlk Türk matbaası: İbrahim Müteferrika', detail: 'İlk Türk matbaası 1727 yılında İbrahim Müteferrika ve Sait Efendi tarafından kurulmuştur. Basılan ilk eser Vankulu Lügati\'dir.', date: 'Klasik' },
];

export type ExamEventType = 'sinav' | 'basvuru' | 'sonuc' | 'tercih';

export interface ExamEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  type: ExamEventType;
  desc: string;
}

export const EXAM_EVENTS: ExamEvent[] = [
  { id: 'e1', title: 'KPSS Lisans (GY-GK)', date: '2026-09-06', type: 'sinav', desc: 'Genel Yetenek – Genel Kültür oturumu uygulandı.' },
  { id: 'e2', title: 'KPSS Alan Bilgisi 1. Gün', date: '2026-09-12', type: 'sinav', desc: 'A Grubu alan bilgisi oturumları 1. gün.' },
  { id: 'e3', title: 'KPSS Alan Bilgisi 2. Gün', date: '2026-09-13', type: 'sinav', desc: 'A Grubu alan bilgisi oturumları 2. gün.' },
  { id: 'e4', title: 'DHBT Başvuruları', date: '2026-09-22', endDate: '2026-09-30', type: 'basvuru', desc: 'DHBT başvuruları ÖSYM AİS üzerinden alınacak.' },
  { id: 'e5', title: 'KPSS Ön Lisans', date: '2026-10-04', type: 'sinav', desc: 'İki yılda bir yapılan ön lisans oturumu. 120 soru, 130 dakika.' },
  { id: 'e6', title: 'KPSS Ortaöğretim', date: '2026-10-25', type: 'sinav', desc: 'Lise mezunları için KPSS oturumu. 120 soru, 130 dakika.' },
  { id: 'e7', title: 'DHBT', date: '2026-11-01', type: 'sinav', desc: 'Diyanet\'te görev almak isteyenlerin girdiği alan bilgisi testi.' },
  { id: 'e8', title: 'KPSS-2026/2 Merkezi Yerleştirme', date: '2026-12-15', type: 'tercih', desc: 'Tahmini: Aralık ayında tercihlerin alınması bekleniyor. ÖSYM duyurusunu takip edin.' },
];

export interface TargetExam {
  id: string;
  name: string;
  short: string;
  scoreType: string;
  eventId: string;
}

export const TARGET_EXAMS: TargetExam[] = [
  { id: 'onlisans', name: 'KPSS Ön Lisans', short: 'Ön Lisans', scoreType: 'P93', eventId: 'e5' },
  { id: 'ortaogretim', name: 'KPSS Ortaöğretim', short: 'Ortaöğretim', scoreType: 'P94', eventId: 'e6' },
  { id: 'dhbt', name: 'DHBT', short: 'DHBT', scoreType: 'DHBT', eventId: 'e7' },
  { id: 'lisans', name: 'KPSS Lisans', short: 'Lisans', scoreType: 'P3', eventId: 'e1' },
];

export interface TabanPuan {
  id: string;
  level: 'lisans' | 'onlisans' | 'ortaogretim';
  kadro: string;
  kurum: string;
  min: number;
  max: number;
}

export const TABAN_PUANLAR: TabanPuan[] = [
  { id: 't1', level: 'lisans', kadro: 'Memur (4001)', kurum: 'Çeşitli Kurumlar', min: 78.5, max: 88.2 },
  { id: 't2', level: 'lisans', kadro: 'Mühendis', kurum: 'Çeşitli Kurumlar', min: 82.1, max: 91.4 },
  { id: 't3', level: 'lisans', kadro: 'Hemşire', kurum: 'Sağlık Bakanlığı', min: 66.3, max: 78.9 },
  { id: 't4', level: 'lisans', kadro: 'Öğretmenlik (Sözleşmeli)', kurum: 'MEB', min: 65.0, max: 85.6 },
  { id: 't5', level: 'lisans', kadro: 'Polis Memuru (POMEM)', kurum: 'Emniyet', min: 70.0, max: 80.3 },
  { id: 't6', level: 'lisans', kadro: 'Uzman Yardımcısı', kurum: 'Çeşitli Kurumlar', min: 80.4, max: 90.1 },
  { id: 't7', level: 'lisans', kadro: 'Sosyolog / Psikolog', kurum: 'Çeşitli Kurumlar', min: 76.8, max: 86.5 },
  { id: 't8', level: 'lisans', kadro: 'Avukat', kurum: 'Çeşitli Kurumlar', min: 74.2, max: 84.7 },
  { id: 't9', level: 'onlisans', kadro: 'Memur (3001)', kurum: 'Çeşitli Kurumlar', min: 72.4, max: 84.6 },
  { id: 't10', level: 'onlisans', kadro: 'Sağlık Teknikeri', kurum: 'Sağlık Bakanlığı', min: 68.5, max: 80.2 },
  { id: 't11', level: 'onlisans', kadro: 'Hemşire', kurum: 'Sağlık Bakanlığı', min: 69.1, max: 81.5 },
  { id: 't12', level: 'onlisans', kadro: 'Bilgisayar Teknikeri', kurum: 'Çeşitli Kurumlar', min: 75.6, max: 86.3 },
  { id: 't13', level: 'onlisans', kadro: 'Zabıt Katibi', kurum: 'Adalet Bakanlığı', min: 73.8, max: 85.1 },
  { id: 't14', level: 'onlisans', kadro: 'Muhasebeci', kurum: 'Çeşitli Kurumlar', min: 71.2, max: 82.8 },
  { id: 't15', level: 'ortaogretim', kadro: 'Memur (2001)', kurum: 'Çeşitli Kurumlar', min: 76.5, max: 87.9 },
  { id: 't16', level: 'ortaogretim', kadro: 'Hizmetli', kurum: 'Çeşitli Kurumlar', min: 74.3, max: 85.4 },
  { id: 't17', level: 'ortaogretim', kadro: 'Şoför', kurum: 'Çeşitli Kurumlar', min: 75.1, max: 86.0 },
  { id: 't18', level: 'ortaogretim', kadro: 'Sağlık Memuru', kurum: 'Sağlık Bakanlığı', min: 78.2, max: 88.5 },
  { id: 't19', level: 'ortaogretim', kadro: 'Teknisyen', kurum: 'Çeşitli Kurumlar', min: 77.0, max: 87.1 },
];

export const QUOTES: { text: string; author: string }[] = [
  { text: 'Hiçbir şeye ihtiyacımız yok, yalnız bir şeye ihtiyacımız vardır: çalışkan olmak!', author: 'Mustafa Kemal Atatürk' },
  { text: 'Başarı, hazırlık ile fırsatın buluştuğu yerdir.', author: 'Bobby Unser' },
  { text: 'Damlaya damlaya göl olur; her gün çözülen 20 soru, sınav günü özgüvendir.', author: 'KPSS Asistanı' },
  { text: 'Zorluklar, başarının değerini artıran süslerdir.', author: 'Molière' },
  { text: 'Düzenli tekrar, bilgiyi kalıcı hafızaya taşır. Bugün dünden bir soru fazla çöz.', author: 'KPSS Asistanı' },
  { text: 'Hayallerine giden yol, masanın başından geçer.', author: 'KPSS Asistanı' },
  { text: 'Azim, başarının anahtarıdır; vazgeçenler asla kazanamaz.', author: 'Anonim' },
  { text: 'Yarın yorulmak istemiyorsan, bugün terlemelisin.', author: 'Anonim' },
];

export function daysUntil(dateStr: string, now: Date = new Date()): number {
  const target = new Date(dateStr + 'T10:00:00');
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

export function formatDateTR(dateStr: string): string {
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const d = new Date(dateStr + 'T10:00:00');
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

export function dayKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}

export function questionOfDay(pool: QuizQuestion[] = QUESTIONS): QuizQuestion | undefined {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return pool.length ? pool[dayOfYear % pool.length] : undefined;
}
