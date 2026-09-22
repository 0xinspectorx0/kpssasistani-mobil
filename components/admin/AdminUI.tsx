import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../lib/store';

export function AdminButton({
  label,
  onPress,
  icon,
  secondary = false,
  danger = false,
  disabled = false,
  busy = false,
}: {
  label: string;
  onPress: () => void;
  icon?: string;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  busy?: boolean;
}) {
  const { theme } = useApp();
  const color = danger ? theme.danger : theme.accent;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={{
        minHeight: 44,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 11,
        flexDirection: 'row',
        gap: 7,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: secondary ? theme.card : color,
        borderWidth: 1,
        borderColor: secondary ? theme.border : color,
        opacity: disabled || busy ? 0.5 : 1,
      }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={secondary ? color : '#fff'} />
      ) : icon ? (
        <Ionicons name={icon as any} size={17} color={secondary ? color : '#fff'} />
      ) : null}
      <Text
        style={{
          color: secondary ? (danger ? theme.danger : theme.text) : '#fff',
          fontSize: 13,
          fontWeight: '800',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
export function Field({ label, multiline, ...props }: TextInputProps & { label: string }) {
  const { theme } = useApp();
  return (
    <View style={{ gap: 7, marginBottom: 15, flex: 1 }}>
      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        multiline={multiline}
        placeholderTextColor={theme.muted}
        style={{
          color: theme.text,
          backgroundColor: theme.card2,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 10,
          padding: 12,
          fontSize: 14,
          minHeight: multiline ? 100 : 46,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}
export function Notice({ text, error = false }: { text: string; error?: boolean }) {
  const { theme } = useApp();
  return (
    <View
      accessibilityRole={error ? 'alert' : undefined}
      style={{
        padding: 13,
        borderRadius: 12,
        backgroundColor: error ? theme.danger + '12' : theme.accentSoft,
        flexDirection: 'row',
        gap: 9,
        marginBottom: 14,
      }}
    >
      <Ionicons
        name={error ? 'alert-circle-outline' : 'information-circle-outline'}
        color={error ? theme.danger : theme.accent}
        size={19}
      />
      <Text style={{ color: error ? theme.danger : theme.text, flex: 1, fontSize: 13, lineHeight: 20 }}>
        {text}
      </Text>
    </View>
  );
}
export function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const { theme } = useApp();
  return (
    <View style={{ marginBottom: 16, gap: 8 }}>
      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
        {options.map((o) => (
          <TouchableOpacity
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === o.value }}
            onPress={() => onChange(o.value)}
            style={{
              paddingHorizontal: 13,
              minHeight: 40,
              justifyContent: 'center',
              borderRadius: 10,
              borderWidth: 1,
              borderColor: value === o.value ? theme.accent : theme.border,
              backgroundColor: value === o.value ? theme.accentSoft : theme.card,
            }}
          >
            <Text
              style={{
                color: value === o.value ? theme.accent : theme.muted,
                fontWeight: '700',
                fontSize: 13,
              }}
            >
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
export function ConfirmDialog({
  title,
  description,
  onConfirm,
  onCancel,
  busy = false,
  danger = false,
  label = 'Onayla',
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  danger?: boolean;
  label?: string;
}) {
  const { theme } = useApp();
  return (
    <Modal
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onCancel();
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: '#02061799',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 22,
        }}
      >
        <View
          role="dialog"
          accessibilityLabel={title}
          accessibilityViewIsModal
          style={{ width: '100%', maxWidth: 440, borderRadius: 20, backgroundColor: theme.card, padding: 24 }}
        >
          <ScrollView>
            <Text style={{ color: theme.text, fontWeight: '900', fontSize: 20, marginBottom: 10 }}>
              {title}
            </Text>
            <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 22, marginBottom: 24 }}>
              {description}
            </Text>
          </ScrollView>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
            <AdminButton label="Vazgeç" secondary onPress={onCancel} disabled={busy} />
            <AdminButton label={label} danger={danger} busy={busy} onPress={onConfirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
