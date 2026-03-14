import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  analyzePhoto,
  confirmMeal,
  type PhotoMealEstimate,
  type PhotoMealConfirmRequest,
} from '@/services/photoMealApi';
import { theme } from '@/constants/theme';

type TimeOfDay = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type Props = { onComplete?: () => void };

export function PhotoMealCapture({ onComplete }: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<PhotoMealEstimate | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mealName, setMealName] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() => {
    const h = new Date().getHours();
    if (h < 11) return 'breakfast';
    if (h < 15) return 'lunch';
    if (h < 19) return 'dinner';
    return 'snack';
  });

  const handleCapture = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permission needed', 'Camera access is required to capture meal photos.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const uri = result.assets[0].uri;
    setImageUri(uri); setEstimate(null); setError(null); setAnalyzing(true);
    try {
      const est = await analyzePhoto(uri);
      setEstimate(est);
      setMealName(est.food_items.map((f) => f.name).join(', '));
    } catch (err: any) { setError(err?.response?.data?.detail || err?.message || 'Failed to analyze photo.'); }
    finally { setAnalyzing(false); }
  };

  const handleConfirm = async () => {
    if (!estimate) return;
    setConfirming(true);
    try {
      const req: PhotoMealConfirmRequest = {
        meal_name: mealName || 'Meal', food_items: estimate.food_items,
        total_calories: estimate.total_calories, total_protein_g: estimate.total_protein_g,
        total_carbs_g: estimate.total_carbs_g, total_fat_g: estimate.total_fat_g, time_of_day: timeOfDay,
      };
      await confirmMeal(req);
      Alert.alert('Logged', 'Meal has been saved.');
      setImageUri(null); setEstimate(null); setMealName(''); onComplete?.();
    } catch (err: any) { Alert.alert('Error', err?.message || 'Failed to save meal.'); }
    finally { setConfirming(false); }
  };

  const handleReset = () => { setImageUri(null); setEstimate(null); setError(null); setMealName(''); };

  if (!imageUri) {
    return (
      <TouchableOpacity style={styles.captureBtn} onPress={handleCapture} accessibilityRole="button" accessibilityLabel="Take a photo of your meal">
        <Text style={styles.captureBtnIcon}>📸</Text>
        <Text style={styles.captureBtnText}>Snap a Meal Photo</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.card}>
      <Image source={{ uri: imageUri }} style={styles.preview} />

      {analyzing && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={theme.colors.green.primary} size="small" />
          <Text style={styles.loadingText}>Analyzing your meal…</Text>
        </View>
      )}

      {error && (
        <View>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={handleReset} accessibilityRole="button">
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {estimate && (
        <View style={styles.results}>
          <View style={styles.macroRow}>
            <MacroPill label="Cal" value={estimate.total_calories} />
            <MacroPill label="P" value={estimate.total_protein_g} unit="g" />
            <MacroPill label="C" value={estimate.total_carbs_g} unit="g" />
            <MacroPill label="F" value={estimate.total_fat_g} unit="g" />
          </View>

          <TextInput style={styles.nameInput} value={mealName} onChangeText={setMealName} placeholder="Meal name" placeholderTextColor={theme.colors.text.muted} />

          <View style={styles.timeRow}>
            {(['breakfast', 'lunch', 'dinner', 'snack'] as TimeOfDay[]).map((t) => (
              <TouchableOpacity key={t} style={[styles.timeChip, timeOfDay === t && styles.timeChipActive]} onPress={() => setTimeOfDay(t)} accessibilityRole="button" accessibilityState={{ selected: timeOfDay === t }}>
                <Text style={[styles.timeChipText, timeOfDay === t && styles.timeChipTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleReset} accessibilityRole="button">
              <Text style={styles.cancelBtnText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={confirming} accessibilityRole="button">
              {confirming ? <ActivityIndicator color={theme.colors.background.main} size="small" /> : <Text style={styles.confirmBtnText}>Log Meal</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function MacroPill({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <View style={pillStyles.pill}>
      <Text style={pillStyles.value}>{value}{unit ?? ''}</Text>
      <Text style={pillStyles.label}>{label}</Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  pill: { alignItems: 'center', backgroundColor: 'rgba(57,255,136,0.1)', borderRadius: theme.radius.sm, paddingVertical: 6, paddingHorizontal: 12, minWidth: 60 },
  value: { fontSize: 16, fontWeight: '800', color: theme.colors.green.primary },
  label: { fontSize: 10, fontWeight: '600', color: theme.colors.text.muted },
});

const styles = StyleSheet.create({
  captureBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(57,255,136,0.1)', borderRadius: theme.radius.lg, paddingVertical: 14,
  },
  captureBtnIcon: { fontSize: 20 },
  captureBtnText: { fontSize: 15, fontWeight: '700', color: theme.colors.green.primary },
  card: {
    backgroundColor: theme.colors.background.secondary, borderRadius: theme.radius.lg,
    overflow: 'hidden', gap: 12,
  },
  preview: { width: '100%', height: 200, borderTopLeftRadius: theme.radius.lg, borderTopRightRadius: theme.radius.lg },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
  loadingText: { fontSize: 14, color: theme.colors.text.secondary },
  errorText: { fontSize: 14, color: theme.colors.error, paddingHorizontal: 16 },
  retryText: { fontSize: 14, fontWeight: '600', color: theme.colors.green.primary, paddingHorizontal: 16, paddingBottom: 16 },
  results: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  macroRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  nameInput: {
    backgroundColor: theme.colors.background.main, borderRadius: theme.radius.sm,
    paddingHorizontal: 14, paddingVertical: 12, color: theme.colors.text.primary, fontSize: 14,
  },
  timeRow: { flexDirection: 'row', gap: 6 },
  timeChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: theme.radius.sm, backgroundColor: theme.colors.background.main },
  timeChipActive: { backgroundColor: 'rgba(57,255,136,0.12)' },
  timeChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.text.muted },
  timeChipTextActive: { color: theme.colors.green.primary },
  actionRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.ui.divider },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.text.muted },
  confirmBtn: { flex: 2, alignItems: 'center', paddingVertical: 12, borderRadius: theme.radius.sm, backgroundColor: theme.colors.green.primary },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: theme.colors.background.main },
});
