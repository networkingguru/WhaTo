import { Redirect, useLocalSearchParams } from 'expo-router';

export default function JoinWithCode() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <Redirect href={{ pathname: '/join', params: { code } }} />;
}
