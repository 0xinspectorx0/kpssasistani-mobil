import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../lib/store';
import { useAdminAuth } from '../lib/admin-auth';
import { readableError } from '../lib/content-api';
import { AdminButton, Field, Notice } from './admin/AdminUI';

// Şifre sıfırlama linkinden dönüşte açılan tam ekran form:
// kullanıcı yeni şifresini burada belirler (kurtarma oturumu üzerinden updateUser).
export default function PasswordRecoveryModal() {
  const { theme } = useApp();
  const { isRecovery, changePassword, signOut } = useAdminAuth();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [changed, setChanged] = useState(false);

  // Modal ilk açıldığında/sıfırlandığında alanları temizle.
  React.useEffect(() => {
    if (!isRecovery) {
      setPw('');
      setPw2('');
      setError('');
      setDone(false);
    }
  }, [isRecovery]);

  async function submit() {
    setError('');
    if (pw.length < 6) {
      setError('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (pw !== pw2) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    setBusy(true);
    try {
      await changePassword(pw);
      setDone(true);
    } catch (e) {
      setError(readableError(e));
    } finally {
      setBusy(false);
    }
  }

  const close = () => {
    setPw('');
    setPw2('');
    setError('');
    setDone(false);
    setChanged(false);
    signOut().catch(() => {});
  };

  return (
    <Modal visible={isRecovery} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.card,
            }}
          >
            <Text style={{ color: theme.text, fontSize: 17, fontWeight: '900' }}>Şifre sıfırlama</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Kapat"
              onPress={close}
              style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
            <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
              {done ? (
                <View style={{ alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 76,
                      height: 76,
                      borderRadius: 38,
                      backgroundColor: theme.successSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="checkmark-done" size={36} color={theme.success} />
                  </View>
                  <Text style={{ color: theme.text, fontSize: 20, fontWeight: '900', textAlign: 'center' }}>
                    Şifreniz güncellendi
                  </Text>
                  <Text style={{ color: theme.muted, textAlign: 'center', lineHeight: 21, marginTop: 4 }}>
                    Yeni şifrenizle giriş yapabilirsiniz.
                  </Text>
                  <View style={{ marginTop: 10, width: '100%', maxWidth: 320 }}>
                    <AdminButton label="Tamam" icon="checkmark" onPress={close} />
                  </View>
                </View>
              ) : (
                <>
                  <View style={{ alignItems: 'center', marginBottom: 22 }}>
                    <View
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 36,
                        backgroundColor: theme.accentSoft,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 14,
                      }}
                    >
                      <Ionicons name="key" size={32} color={theme.accent} />
                    </View>
                    <Text style={{ color: theme.text, fontSize: 20, fontWeight: '900', textAlign: 'center' }}>
                      Yeni şifrenizi belirleyin
                    </Text>
                    <Text style={{ color: theme.muted, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
                      Size gönderdiğimiz bağlantı doğrulandı. Hesabınız için yeni bir şifre oluşturun.
                    </Text>
                  </View>

                  <Field
                    label="Yeni şifre"
                    placeholder="En az 6 karakter"
                    value={pw}
                    onChangeText={setPw}
                    secureTextEntry={!showPw}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                  />
                  <Field
                    label="Yeni şifre (tekrar)"
                    placeholder="Yeni şifrenizi doğrulayın"
                    value={pw2}
                    onChangeText={setPw2}
                    secureTextEntry={!showPw}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                  />
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => setShowPw(!showPw)}
                    style={{ alignSelf: 'flex-end', padding: 8, marginBottom: 12 }}
                  >
                    <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 12 }}>
                      {showPw ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    </Text>
                  </TouchableOpacity>

                  {!!error && <Notice text={error} error />}

                  <AdminButton label="Yeni şifreyi kaydet" icon="key" onPress={submit} busy={busy} />
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
