import React, { createContext, useContext, useMemo } from 'react';
import { Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../lib/store';
import { useContent } from '../lib/content';
import { Card } from './ui';
import { radius } from '../lib/theme';

const FALLBACK_QUOTE = { text: 'Her gün bir adım daha ileri.', author: 'KPSS Asistanım' };

/**
 * Sol menüde altı sekme 520px'te bitiyor; günün sözü balonu Profil'in 24px altına,
 * menü öğeleriyle aynı yatay ritimde (27px kenar boşluğu) oturur.
 */
export const SIDEBAR_QUOTE_TOP = 544;

/** Balonun altında menü dibine kalması gereken en az boşluk; bundan az yer varsa balon ana sayfada kalır. */
export const SIDEBAR_QUOTE_GAP = 16;

/**
 * Yönetici paneli girişi sol menüde söz balonunun üstünde yer alır (yalnızca admin
 * oturumunda). Yüksekliği sabit olduğundan balonun konumu bu kadar aşağı kayar.
 */
export const SIDEBAR_ADMIN_HEIGHT = 44;
/** Yönetici girişi ile söz balonu arasındaki boşluk. */
export const SIDEBAR_ADMIN_GAP = 12;

const QuoteInSidebarContext = createContext(false);

/** Balonun sol menüde gösterildiği bilgisi; ana sayfa yalnızca menüde yer yoksa balonu gösterir. */
export const QuoteInSidebarProvider = QuoteInSidebarContext.Provider;
export const useQuoteInSidebar = () => useContext(QuoteInSidebarContext);

/** Günün sözü: günün tarihine göre sabit seçilen motivasyon cümlesi. */
export function useDailyQuote() {
  const { quotes } = useContent();
  return useMemo(() => {
    const list = quotes.length ? quotes : [{ id: 'fallback', ...FALLBACK_QUOTE }];
    const day = Math.floor(Date.now() / 86400000);
    return list[day % list.length];
  }, [quotes]);
}

/**
 * Günün sözü balonu.
 * `compact` varyantı masaüstü web'de sol menüde (Profil'in hemen altında) kullanılır;
 * normal varyantta balon ana sayfa gövdesinde yer alır.
 */
export function QuoteOfTheDay({ compact = false, style }: { compact?: boolean; style?: ViewStyle }) {
  const { theme } = useApp();
  const quote = useDailyQuote();

  if (compact) {
    return (
      <View style={style}>
        <View
          accessible
          accessibilityLabel={`Günün sözü: ${quote.text} — ${quote.author}`}
          style={{
            backgroundColor: theme.gold + '14',
            borderColor: theme.gold + '33',
            borderWidth: 1,
            borderRadius: radius.md,
            padding: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Ionicons name="chatbubble-ellipses" size={14} color={theme.gold} />
            <Text
              style={{
                color: theme.gold,
                fontSize: 10,
                fontWeight: '900',
                letterSpacing: 0.9,
                marginLeft: 5,
              }}
            >
              GÜNÜN SÖZÜ
            </Text>
          </View>
          <Text
            numberOfLines={4}
            style={{ color: theme.text, fontSize: 12, lineHeight: 18, fontStyle: 'italic' }}
          >
            &quot;{quote.text}&quot;
          </Text>
          <Text
            numberOfLines={1}
            style={{ color: theme.muted, fontSize: 11, fontWeight: '700', marginTop: 6 }}
          >
            — {quote.author}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={style}
      accessible
      accessibilityLabel={`Günün sözü: ${quote.text} — ${quote.author}`}
    >
      <Card>
        <View style={{ flexDirection: 'row' }}>
          <Ionicons name="chatbubble-ellipses" size={22} color={theme.gold} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14.5, color: theme.text, lineHeight: 22, fontStyle: 'italic' }}>
              &quot;{quote.text}&quot;
            </Text>
            <Text style={{ fontSize: 12.5, color: theme.muted, marginTop: 6, fontWeight: '600' }}>
              — {quote.author}
            </Text>
          </View>
        </View>
      </Card>
    </View>
  );
}
