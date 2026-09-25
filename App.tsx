import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons as Icons } from '@expo/vector-icons';
import 'react-native-gesture-handler';

import { AppProvider, useApp } from './lib/store';
import OnboardingModal from './components/Onboarding';
import PasswordRecoveryModal from './components/PasswordRecoveryModal';
import HomeScreen from './screens/HomeScreen';
import QuizSetupScreen from './screens/QuizSetupScreen';
import QuizScreen from './screens/QuizScreen';
import QuizResultScreen from './screens/QuizResultScreen';
import TopicsScreen from './screens/TopicsScreen';
import NewsScreen from './screens/NewsScreen';
import ToolsScreen from './screens/ToolsScreen';
import ProfileScreen from './screens/ProfileScreen';
import AdminScreen from './screens/AdminScreen';
import { AdminAuthProvider } from './lib/admin-auth';
import { ContentProvider, useContent } from './lib/content';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function Tabs() {
  const { theme, mode } = useApp();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.muted,
        // Büyük yazı (font scaling) etiketleri büyütüp taşırıyordu; kapatıyoruz.
        tabBarAllowFontScaling: false,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          // Sabit yükseklik yok: bar, içeriğine göre kendini ölçer, etiketler asla kesilmez.
          minHeight: 58,
        },
        tabBarLabel: ({ color }) => (
          <Text
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={{ color, fontSize: 10.5, fontWeight: '700', textAlign: 'center', lineHeight: 12.5 }}
          >
            {route.name}
          </Text>
        ),
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, string> = {
            'Ana Sayfa': focused ? 'home' : 'home-outline',
            'Testler': focused ? 'help-circle' : 'help-circle-outline',
            'Konular': focused ? 'list' : 'list-outline',
            'Güncel': focused ? 'newspaper' : 'newspaper-outline',
            'Araçlar': focused ? 'construct' : 'construct-outline',
            'Profil': focused ? 'person' : 'person-outline',
          };
          return <Icons name={icons[route.name] as any} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Ana Sayfa" component={HomeScreen} />
      <Tab.Screen name="Testler" component={QuizSetupScreen} />
      <Tab.Screen name="Konular" component={TopicsScreen} />
      <Tab.Screen name="Güncel" component={NewsScreen} />
      <Tab.Screen name="Araçlar" component={ToolsScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function Root() {
  const { theme, mode, loaded } = useApp();
  const { loaded: contentLoaded } = useContent();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem('kpss-onboarding-seen');
        if (!seen) setShowOnboarding(true);
      } catch {}
      setChecked(true);
    })();
  }, []);

  const navTheme = {
    ...(mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.bg,
      card: theme.card,
      text: theme.text,
      border: theme.border,
      primary: theme.accent,
    },
  };

  if (!loaded || !checked || !contentLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={Tabs} />
          <Stack.Screen name="Admin" component={AdminScreen} />
          <Stack.Screen
            name="Quiz"
            component={QuizScreen}
            options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
          />
          <Stack.Screen name="QuizResult" component={QuizResultScreen} options={{ gestureEnabled: false }} />
        </Stack.Navigator>
      </NavigationContainer>
      <OnboardingModal
        visible={showOnboarding}
        onDone={() => {
          setShowOnboarding(false);
          AsyncStorage.setItem('kpss-onboarding-seen', '1').catch(() => {});
        }}
      />
      <PasswordRecoveryModal />
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ ...Ionicons.font });
  if (!fontsLoaded) return null;
  return (
    <AppProvider>
      <AdminAuthProvider>
        <ContentProvider>
          <Root />
        </ContentProvider>
      </AdminAuthProvider>
    </AppProvider>
  );
}
