import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../lib/store';
import { useAdminAuth } from '../lib/admin-auth';
import { supabase } from '../lib/supabase';
import { readableError } from '../lib/content-api';
import { PLAN_META } from '../lib/membership';
import { AdminButton, Field, Notice } from './admin/AdminUI';

export default function AuthScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useApp();
  const { signIn, signUp, session, role, resetPassword, changePassword } = useAdminAuth();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [forgot, setForgot] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');

  async function submitChangePassword() {
    setError('');
    setInfo('');
    if (newPw.length < 6) {
      setError('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (newPw !== newPw2) {
      setError('Yeni şifreler eşleşmiyor.');
      return;
    }
    setBusy(true);
    try {
      await changePassword(newPw);
      setInfo('Şifren güncellendi.');
      setChangingPw(false);
      setNewPw('');
      setNewPw2('');
    } catch (e) {
      setError(readableError(e));
    } finally {
      setBusy(false);
    }
  }

  async function submitReset() {
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('E-posta adresinizi girin.');
      return;
    }
    setBusy(true);
    try {
      await resetPassword(email);
      setInfo('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Gelen kutunuzu kontrol edin.');
      setForgot(false);
    } catch (e) {
      setError(readableError(e));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setError('');
    setInfo('');
    if (!email.trim() || !password) {
      setError('E-posta ve şifrenizi girin.');
      return;
    }
    if (tab === 'signup' && password !== confirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    if (tab === 'signup' && password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }
    setBusy(true);
    try {
      if (tab === 'login') {
        await signIn(email, password);
        setPassword('');
        setConfirm('');
        onClose();
      } else {
        await signUp(email, password);
        setInfo(
          'Hesabın oluşturuldu. E-posta doğrulaması gerekiyorsa gelen kutunu kontrol et; doğruladıktan sonra giriş yapabilirsin.',
        );
        setTab('login');
        setPassword('');
        setConfirm('');
      }
    } catch (e) {
      setError(readableError(e));
    } finally {
      setBusy(false);
    }
  }

  const alreadyAuthed = !!session;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
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
            <Text style={{ color: theme.text, fontSize: 17, fontWeight: '900' }}>Hesabım</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Kapat"
              onPress={onClose}
              style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {alreadyAuthed && tab === 'login' ? (
              <View style={{ alignItems: 'center', marginTop: 20 }}>
                <View
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 38,
                    backgroundColor: theme.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 14,
                  }}
                >
                  <Ionicons name="checkmark-done" size={36} color={theme.accent} />
                </View>
                <Text style={{ color: theme.text, fontSize: 20, fontWeight: '900', textAlign: 'center' }}>
                  Giriş yaptın!
                </Text>
                <Text style={{ color: theme.muted, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
                  Artık günlük test kotan {role === 'vip' ? 'sınırsız' : '3'} olarak etkin.
                </Text>

                {changingPw ? (
                  <View
                    style={{
                      width: '100%',
                      maxWidth: 400,
                      marginTop: 18,
                      backgroundColor: theme.card,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: theme.border,
                      padding: 16,
                    }}
                  >
                    <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15, marginBottom: 6 }}>
                      Şifre değiştir
                    </Text>
                    <Text style={{ color: theme.muted, fontSize: 12.5, lineHeight: 19, marginBottom: 12 }}>
                      Yeni şifreni yaz. E-posta gerekmez; oturumun açık olduğu için doğrudan güncellenir.
                    </Text>
                    <Field
                      label="Yeni şifre"
                      placeholder="En az 6 karakter"
                      value={newPw}
                      onChangeText={setNewPw}
                      secureTextEntry={!showPw}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Field
                      label="Yeni şifre (tekrar)"
                      placeholder="Yeni şifreni doğrula"
                      value={newPw2}
                      onChangeText={setNewPw2}
                      secureTextEntry={!showPw}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() => setShowPw(!showPw)}
                      style={{ alignSelf: 'flex-end', padding: 8, marginBottom: 8 }}
                    >
                      <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 12 }}>
                        {showPw ? 'Şifreyi gizle' : 'Şifreyi göster'}
                      </Text>
                    </TouchableOpacity>
                    {!!error && <Notice text={error} error />}
                    {!!info && <Notice text={info} />}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <AdminButton
                          label="Vazgeç"
                          secondary
                          onPress={() => {
                            setChangingPw(false);
                            setError('');
                            setInfo('');
                            setNewPw('');
                            setNewPw2('');
                          }}
                          disabled={busy}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <AdminButton label="Güncelle" icon="key" onPress={submitChangePassword} busy={busy} />
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={{ marginTop: 20, width: '100%', maxWidth: 320, gap: 10 }}>
                    <AdminButton
                      label="Şifreyi değiştir"
                      icon="key-outline"
                      secondary
                      onPress={() => {
                        setChangingPw(true);
                        setError('');
                        setInfo('');
                      }}
                    />
                    <AdminButton label="Kapat" icon="checkmark" onPress={onClose} />
                  </View>
                )}
              </View>
            ) : supabase ? (
              <>
                <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                  {(
                    [
                      { id: 'login', label: 'Giriş Yap' },
                      { id: 'signup', label: 'Üye Ol' },
                    ] as const
                  ).map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => {
                        setTab(t.id);
                        setError('');
                        setInfo('');
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 11,
                        alignItems: 'center',
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: tab === t.id ? theme.accent : theme.border,
                        backgroundColor: tab === t.id ? theme.accentSoft : theme.card,
                        marginRight: t.id === 'login' ? 8 : 0,
                      }}
                    >
                      <Text style={{ fontWeight: '800', color: tab === t.id ? theme.accent : theme.muted }}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Field
                  label="E-posta adresi"
                  placeholder="ornek@posta.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                />
                <Field
                  label="Şifre"
                  placeholder={tab === 'signup' ? 'En az 6 karakter' : 'Şifreniz'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                />
                {tab === 'signup' && (
                  <Field
                    label="Şifre (tekrar)"
                    placeholder="Şifreni doğrula"
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry={!showPw}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )}
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => setShowPw(!showPw)}
                  style={{ alignSelf: 'flex-end', padding: 8, marginBottom: 14 }}
                >
                  <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 12 }}>
                    {showPw ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  </Text>
                </TouchableOpacity>

                {tab === 'login' && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => {
                      setForgot(true);
                      setError('');
                      setInfo('');
                    }}
                    style={{ alignSelf: 'center', padding: 6, marginBottom: 14 }}
                  >
                    <Text style={{ color: theme.muted, fontWeight: '700', fontSize: 13, textDecorationLine: 'underline' }}>
                      Parolamı unuttum
                    </Text>
                  </TouchableOpacity>
                )}

                {forgot && (
                  <View
                    style={{
                      backgroundColor: theme.card,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: theme.border,
                      padding: 16,
                      marginBottom: 16,
                    }}
                  >
                    <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15, marginBottom: 6 }}>
                      Şifre sıfırlama
                    </Text>
                    <Text style={{ color: theme.muted, fontSize: 12.5, lineHeight: 19, marginBottom: 12 }}>
                      E-posta adresinize şifre sıfırlama bağlantısı göndereceğiz.
                    </Text>
                    <Field
                      label="E-posta adresi"
                      placeholder="ornek@posta.com"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      autoComplete="email"
                    />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <AdminButton label="Vazgeç" secondary onPress={() => setForgot(false)} disabled={busy} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <AdminButton label="Bağlantı gönder" icon="mail-outline" onPress={submitReset} busy={busy} />
                      </View>
                    </View>
                  </View>
                )}

                {!!error && <Notice text={error} error />}
                {!!info && <Notice text={info} />}

                {!forgot && (
                  <AdminButton
                    label={tab === 'login' ? 'Giriş yap' : 'Hesap oluştur'}
                    icon={tab === 'login' ? 'log-in-outline' : 'person-add-outline'}
                    onPress={submit}
                    busy={busy}
                  />
                )}

                <View style={{ marginTop: 22 }}>
                  <Text style={{ color: theme.text, fontWeight: '800', marginBottom: 8 }}>Üyelik planları</Text>
                  {(['guest', 'uye', 'vip'] as const).map((p) => (
                    <View
                      key={p}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: theme.card,
                        borderWidth: 1,
                        borderColor: theme.border,
                        marginBottom: 8,
                      }}
                    >
                      <Ionicons name={PLAN_META[p].icon as any} size={20} color={PLAN_META[p].color} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={{ color: theme.text, fontWeight: '800', fontSize: 14 }}>{PLAN_META[p].label}</Text>
                        <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>{PLAN_META[p].desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <Notice text="Hesap altyapısı (Supabase) bağlanmadığı için şimdilik misafir olarak devam ediyorsun. Yine de günlük 1 test kotasıyla tüm içeriklere erişebilirsin." />
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
