import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Pressable, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import HomeScreen from "../screens/HomeScreen";
import ProgressScreen from "../screens/ProgressScreen";
import WalletScreen from "../screens/WalletScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ComingSoonScreen from "../screens/ComingSoonScreen";
import { colors } from "../theme/tokens";
import { apiFetch } from "../lib/api";

const Tab = createBottomTabNavigator();

// Matches the artifact's nav exactly (DECISIONS.md D-011): Home · Track ·
// [raised craving-colored FAB] · Wallet · Profile — not five flat tabs, and
// no Coach tab (Coach is reached contextually from Relapse Flow/Profile).
export function TabsNavigator({ navigation }: { navigation: any }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface0, borderTopColor: colors.line200, height: 76, paddingBottom: 10, paddingTop: 6 },
        tabBarActiveTintColor: colors.redirect600,
        tabBarInactiveTintColor: colors.ink300,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" />
            </Svg>
          ),
        }}
      />
      <Tab.Screen
        name="Track"
        component={ProgressScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M3 3v18h18" />
              <Path d="M7 15l4-6 3 3 5-8" />
            </Svg>
          ),
        }}
      />
      <Tab.Screen
        name="Craving"
        component={ComingSoonScreen}
        options={{
          tabBarLabel: () => null,
          tabBarButton: () => (
            <View style={{ flex: 1, alignItems: "center" }}>
              <Pressable
                onPress={async () => {
                  const res = await apiFetch<{ id: string }>("/craving-sessions", { method: "POST" });
                  if (res.ok) navigation.navigate("CravingHub", { cravingSessionId: res.data.id });
                }}
                style={{
                  marginTop: -28,
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: colors.craving500,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                </Svg>
              </Pressable>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
              <Path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
              <Circle cx={18} cy={12} r={2} />
            </Svg>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx={12} cy={8} r={4} />
              <Path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
            </Svg>
          ),
        }}
      />
    </Tab.Navigator>
  );
}
