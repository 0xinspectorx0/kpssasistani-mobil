import React from 'react';
import { Platform, Text, TouchableOpacity, useWindowDimensions, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../lib/store';
import { radius } from '../lib/theme';

/** Responsive breakpoint shared by web screens; native layouts retain the compact mobile spacing. */
export function useResponsiveLayout() {
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 1024;
  return {
    isDesktopWeb,
    pageMaxWidth: isDesktopWeb ? 1360 : undefined,
    pagePadding: isDesktopWeb ? 32 : 16,
  };
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { theme } = useApp();
  return (
    <View
      style={[
        {
          backgroundColor: theme.card,
          borderRadius: radius.lg,
          padding: 16,
          borderWidth: 1,
          borderColor: theme.border,
          shadowColor: theme.shadow,
          shadowOpacity: 0.06,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const { theme } = useApp();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        marginTop: 6,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: theme.text }}>{title}</Text>
        {subtitle ? (
          <Text style={{ fontSize: 12.5, color: theme.muted, marginTop: 2 }}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function ProgressBar({
  progress,
  color,
  height = 8,
  bg,
}: {
  progress: number;
  color?: string;
  height?: number;
  bg?: string;
}) {
  const { theme } = useApp();
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View
      style={{ height, borderRadius: height / 2, backgroundColor: bg ?? theme.border, overflow: 'hidden' }}
    >
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color ?? theme.accent,
        }}
      />
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: string;
}) {
  const { theme } = useApp();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        marginRight: 8,
        backgroundColor: active ? theme.text : theme.card,
        borderWidth: 1,
        borderColor: active ? theme.text : theme.border,
      }}
    >
      {icon ? (
        <Ionicons
          name={icon as any}
          size={14}
          color={active ? theme.card : theme.muted}
          style={{ marginRight: 6 }}
        />
      ) : null}
      <Text style={{ fontSize: 13, fontWeight: '700', color: active ? theme.card : theme.text }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function StatTile({
  icon,
  iconColor,
  value,
  label,
  style,
}: {
  icon: string;
  iconColor: string;
  value: string;
  label: string;
  style?: ViewStyle;
}) {
  const { theme } = useApp();
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: theme.card,
          borderRadius: radius.md,
          padding: 12,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.border,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: iconColor + '1A',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 6,
        }}
      >
        <Ionicons name={icon as any} size={17} color={iconColor} />
      </View>
      <Text style={{ fontSize: 16, fontWeight: '800', color: theme.text }}>{value}</Text>
      <Text style={{ fontSize: 11, color: theme.muted, marginTop: 2, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, desc }: { icon: string; title: string; desc?: string }) {
  const { theme } = useApp();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: theme.card2,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <Ionicons name={icon as any} size={30} color={theme.muted} />
      </View>
      <Text style={{ fontSize: 15, fontWeight: '800', color: theme.text, textAlign: 'center' }}>{title}</Text>
      {desc ? (
        <Text style={{ fontSize: 13, color: theme.muted, textAlign: 'center', marginTop: 6, lineHeight: 19 }}>
          {desc}
        </Text>
      ) : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  color,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  icon?: string;
  color?: string;
  disabled?: boolean;
}) {
  const { theme } = useApp();
  const bg = color ?? theme.accent;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled }}
      activeOpacity={0.85}
      style={{
        backgroundColor: bg,
        opacity: disabled ? 0.5 : 1,
        borderRadius: radius.md,
        paddingVertical: 14,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon ? <Ionicons name={icon as any} size={18} color="#fff" style={{ marginRight: 8 }} /> : null}
      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>{label}</Text>
    </TouchableOpacity>
  );
}
