import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import {
  AuthBackground,
  AuthField,
  BrandMark,
  Message,
  PrimaryButton,
} from '@/components/ui/auth-parts';
import { useAuth } from '@/contexts/auth';
import { usePalette } from '@/hooks/use-palette';

export default function LoginScreen() {
  const c = usePalette();
  const { signIn, busy, error, notice, clearMessages, requestPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  return (
    <View style={{ flex: 1 }}>
      <AuthBackground />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 26,
            paddingVertical: 32,
            maxWidth: 460,
            width: '100%',
            alignSelf: 'center',
          }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled">
          <BrandMark />

          <View style={{ height: 40 }} />

          {resetting ? (
            <View style={{ gap: 12 }}>
              <Text style={{ fontSize: 15, color: c.textSecondary, textAlign: 'center' }}>
                Vpiši svojo e-pošto in poslali ti bomo povezavo za novo geslo.
              </Text>

              <AuthField
                icon="mail"
                placeholder="E-pošta"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="send"
                onSubmitEditing={() => requestPasswordReset(email)}
              />

              {error ? <Message text={error} kind="error" /> : null}
              {notice ? <Message text={notice} kind="notice" /> : null}

              <PrimaryButton
                title="Pošlji povezavo"
                loading={busy}
                disabled={!email.includes('@')}
                onPress={() => requestPasswordReset(email)}
              />

              <Pressable
                onPress={() => {
                  clearMessages();
                  setResetting(false);
                }}>
                <Text style={{ textAlign: 'center', fontSize: 14, color: c.textSecondary }}>
                  Nazaj na prijavo
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <AuthField
                icon="mail"
                placeholder="E-pošta"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="next"
              />

              <AuthField
                icon="lock"
                placeholder="Geslo"
                value={password}
                onChangeText={setPassword}
                secure
                autoComplete="current-password"
                returnKeyType="go"
                onSubmitEditing={() => canSubmit && signIn(email, password)}
              />

              {error ? <Message text={error} kind="error" /> : null}
              {notice ? <Message text={notice} kind="notice" /> : null}

              <View style={{ height: 10 }} />

              <PrimaryButton
                title="Prijava"
                loading={busy}
                disabled={!canSubmit}
                onPress={() => signIn(email, password)}
              />

              <Pressable
                onPress={() => {
                  clearMessages();
                  setResetting(true);
                }}
                style={{ paddingVertical: 10 }}>
                <Text style={{ textAlign: 'center', fontSize: 13, color: c.textSecondary }}>
                  Pozabljeno geslo?
                </Text>
              </Pressable>

              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
                <Text style={{ fontSize: 12, color: c.textSecondary }}>ali</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
              </View>

              <Pressable
                onPress={() => {
                  clearMessages();
                  router.push('/register');
                }}>
                <Text style={{ textAlign: 'center', fontSize: 14, color: c.textSecondary }}>
                  Nimaš računa?{' '}
                  <Text style={{ color: c.accent, fontWeight: '600' }}>Registracija</Text>
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
