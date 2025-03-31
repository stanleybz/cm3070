import React from 'react';
import { TeamDashboardScreen } from '../screens/TeamDashboard';
import { useLocalSearchParams } from 'expo-router';

export default function TeamDashboardPage() {
  const params = useLocalSearchParams();
  const teamId = params.teamId as string;
  const teamName = params.teamName as string;
  
  return <TeamDashboardScreen route={{ params: { teamId, teamName } }} />;
} 