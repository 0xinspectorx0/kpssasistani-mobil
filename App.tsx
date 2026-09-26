import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Platform, Text, useWindowDimensions, View } from 'react-native';
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
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 1024;
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {isDesktopWeb && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            zIndex: 20,
            top: 22,
            left: 22,
            width: 210,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              backgroundColor: theme.accent,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}
          >
            <Icons name="school" size={23} color="#fff" />
          </View>
          <View>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '900' }}>KPSS Asistanım</Text>
            <Text style={{ color: theme.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.1, marginTop: 2 }}>
              SINAVA HAZIRLIK
            </Text>
          </View>
        </View>
      )}
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          // Web masaüstünde site tipi yan menü; mobilde sabit alt sekme çubuğu.
          tabBarPosition: isDesktopWeb ? 'left' : 'bottom',
          tabBarVariant: 'uikit',
          tabBarLabelPosition: isDesktopWeb ? 'beside-icon' : 'below-icon',
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: theme.muted,
          tabBarActiveBackgroundColor: isDesktopWeb ? theme.accentSoft : 'transparent',
          tabBarInactiveBackgroundColor: 'transparent',
          tabBarAllowFontScaling: false,
          tabBarStyle: {
            backgroundColor: theme.tabBar,
            borderColor: theme.border,
            ...(isDesktopWeb
              ? {
                  width: 252,
                  paddingTop: 92,
                  paddingBottom: 24,
                  borderTopWidth: 0,
                  borderRightWidth: 1,
                }
              : {
                  borderTopWidth: 1,
                  height: 66,
                  paddingTop: 2,
                  paddingBottom: 8,
                }),
          },
          tabBarItemStyle: isDesktopWeb
            ? {
                paddingHorizontal: 12,
                paddingVertical: 12,
                marginHorizontal: 12,
                marginVertical: 4,
                borderRadius: 12,
                alignItems: 'flex-start',
              }
            : { padding: 0 },
          tabBarLabel: ({ color }) => (
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit={!isDesktopWeb}
              minimumFontScale={0.8}
              style={{
                color,
                fontSize: isDesktopWeb ? 14 : 9.5,
                fontWeight: '700',
                lineHeight: isDesktopWeb ? 20 : 12,
                width: isDesktopWeb ? undefined : '100%',
                flex: isDesktopWeb ? 1 : undefined,
                marginLeft: isDesktopWeb ? 8 : 0,
                textAlign: isDesktopWeb ? 'left' : 'center',
              }}
            >
              {route.name}
            </Text>
          ),
          tabBarIcon: ({ color, focused }) => {
            const icons: Record<string, string> = {
              'Ana Sayfa': focused ? 'home' : 'home-outline',
              'Testler': focused ? 'help-circle' : 'help-circle-outline',
              'Konular': focused ? 'list' : 'list-outline',
              'Güncel': focused ? 'newspaper' : 'newspaper-outline',
              'Araçlar': focused ? 'construct' : 'construct-outline',
              'Profil': focused ? 'person' : 'person-outline',
            };
            return <Icons name={icons[route.name] as any} size={isDesktopWeb ? 20 : 23} color={color} />;
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
    </View>
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
