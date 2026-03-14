import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>About</Text>
      <View style={styles.separator} />
      <Text style={styles.body}>Health OS — your personal wellness engine.</Text>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background.main, paddingHorizontal: 24 },
  title: { fontSize: 22, fontWeight: '700', color: theme.colors.text.primary },
  separator: { marginVertical: 20, height: 1, width: '80%', backgroundColor: theme.colors.ui.divider },
  body: { fontSize: 14, color: theme.colors.text.secondary, textAlign: 'center', lineHeight: 20 },
});
