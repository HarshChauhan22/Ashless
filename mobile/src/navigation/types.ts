export type RootStackParamList = {
  Login: undefined;
  UserDetails: undefined;
  Tabs: undefined;
  Home: undefined;
  CravingHub: { cravingSessionId: string };
  Breathing: { cravingSessionId: string };
  Distraction: { cravingSessionId: string };
  SmokingRoom: { cravingSessionId: string };
  Relapse: { cravingSessionId?: string };
  SavingsGoals: undefined;
  Coach: undefined;
};
