import { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useSession } from "./src/store/session";
import { TabsNavigator } from "./src/navigation/TabsNavigator";
import SplashScreen from "./src/screens/SplashScreen";
import LoginScreen from "./src/screens/LoginScreen";
import UserDetailsScreen from "./src/screens/UserDetailsScreen";
import CravingHubScreen from "./src/screens/CravingHubScreen";
import BreathingScreen from "./src/screens/BreathingScreen";
import DistractionScreen from "./src/screens/DistractionScreen";
import RelapseScreen from "./src/screens/RelapseScreen";
import SavingsGoalsScreen from "./src/screens/SavingsGoalsScreen";
import CoachScreen from "./src/screens/CoachScreen";
import SmokingRoomScreen from "./src/screens/smoking-room/SmokingRoomScreen";
import type { RootStackParamList } from "./src/navigation/types";
import { colors } from "./src/theme/tokens";

const Stack = createNativeStackNavigator<RootStackParamList>();

const SPLASH_DURATION_MS = 1400;

// Root navigator: a brief intro/splash on cold open (requested addition),
// then: unauthenticated -> Login; authenticated but onboarding not yet
// completed -> User Details (requested addition); fully set up -> the
// bottom-tab shell plus the craving-flow screens presented as full-screen
// takeovers outside the tab chrome, matching webapp's (tabs) route-group
// vs. full-bleed craving/* pattern.
export default function App() {
  const userId = useSession((s) => s.userId);
  const onboardingComplete = useSession((s) => s.onboardingComplete);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface50 } }}>
        {!userId ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : !onboardingComplete ? (
          <Stack.Screen name="UserDetails" component={UserDetailsScreen} />
        ) : (
          <>
            <Stack.Screen name="Tabs" component={TabsNavigator as never} />
            <Stack.Screen name="CravingHub" component={CravingHubScreen} />
            <Stack.Screen name="Breathing" component={BreathingScreen} />
            <Stack.Screen name="Distraction" component={DistractionScreen} />
            <Stack.Screen name="SmokingRoom" component={SmokingRoomScreen} />
            <Stack.Screen name="Relapse" component={RelapseScreen} />
            <Stack.Screen name="SavingsGoals" component={SavingsGoalsScreen} />
            <Stack.Screen name="Coach" component={CoachScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
