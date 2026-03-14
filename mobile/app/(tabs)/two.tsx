/**
 * FridgeScreen — cyber-wellness aesthetic with neon-green accents,
 * bento-style cards, and spacing-driven layout.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useFridgeStore } from '@/stores/fridgeStore';
import type { ScannedIngredient } from '@/services/fridgeApi';
import { theme } from '@/constants/theme';
import { NeonButton } from '@/components/ui/NeonButton';

function expirationStatus(expiryDate: string | null): 'fresh' | 'soon' | 'expired' | 'none' {
    if (!expiryDate) return 'none';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'expired';
    if (diff <= 2) return 'soon';
    return 'fresh';
}

export default function FridgeScreen() {
    return <FridgeScreenContent />;
}

export function FridgeScreenContent({ embedded = false }: { embedded?: boolean }) {
    const { items, scannedIngredients, isLoading, isScanning, error, fetchItems, addItem, removeItem, scanImage, confirmScan, clearScan } = useFridgeStore();

    const [ingredient, setIngredient] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unit, setUnit] = useState('');
    const [expiresOn, setExpiresOn] = useState('');
    const [category, setCategory] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => { fetchItems(); }, []);

    const onRefresh = useCallback(async () => { setRefreshing(true); await fetchItems(); setRefreshing(false); }, [fetchItems]);

    const totalItems = items.length;
    const expiringSoonCount = useMemo(() => items.filter((item) => item.expiring_soon).length, [items]);

    const handleAddIngredient = async () => {
        if (!ingredient.trim()) { Alert.alert('Missing data', 'Please enter at least an ingredient name.'); return; }
        const qty = parseFloat(quantity) || 1;
        try {
            await addItem({ name: ingredient.trim(), quantity: qty, unit: unit.trim() || 'pcs', expiry_date: expiresOn.trim() || null, category: category.trim() || 'other' });
            setIngredient(''); setQuantity(''); setUnit(''); setExpiresOn(''); setCategory('');
        } catch { /* error handled in store */ }
    };

    const handlePickImage = async () => {
        const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permResult.granted) { Alert.alert('Permission required', 'Please allow access to your photos to scan ingredients.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
        if (!result.canceled && result.assets[0]) await scanImage(result.assets[0].uri);
    };

    const handleTakePhoto = async () => {
        const permResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permResult.granted) { Alert.alert('Permission required', 'Please allow camera access to scan ingredients.'); return; }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
        if (!result.canceled && result.assets[0]) await scanImage(result.assets[0].uri);
    };

    const handleVisionRecognition = () => {
        Alert.alert('Scan Ingredients', 'Choose a source', [
            { text: 'Camera', onPress: handleTakePhoto },
            { text: 'Gallery', onPress: handlePickImage },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const handleConfirmScan = async () => {
        await confirmScan();
        Alert.alert('Added!', `${scannedIngredients.length} ingredient(s) saved to your fridge.`);
    };

    const handleDeleteItem = (id: string, name: string) => {
        Alert.alert('Delete item', `Remove "${name}" from your fridge?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => removeItem(id) },
        ]);
    };

    return (
        <View style={styles.screen}>
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.green.primary} />}
            >
                {!embedded ? (
                    <Animated.View entering={FadeInDown.duration(400)}>
                        <Text style={styles.title}>Fridge</Text>
                        <Text style={styles.subtitle}>Track ingredients, expiry, and AI-assisted recognition.</Text>
                    </Animated.View>
                ) : null}

                {error ? (
                    <View style={styles.errorBanner}><Text style={styles.errorText}>⚠ {error}</Text></View>
                ) : null}

                {/* ── Metrics ── */}
                <View style={styles.metricsRow}>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricValue}>{totalItems}</Text>
                        <Text style={styles.metricLabel}>Total ingredients</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricValue}>{expiringSoonCount}</Text>
                        <Text style={styles.metricLabel}>Expiring soon</Text>
                    </View>
                </View>

                {/* ── Add ingredient ── */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Add ingredient</Text>
                    <TextInput placeholder="Ingredient name *" placeholderTextColor={theme.colors.text.muted} value={ingredient} onChangeText={setIngredient} style={styles.input} />
                    <View style={styles.row2col}>
                        <TextInput placeholder="Qty" placeholderTextColor={theme.colors.text.muted} value={quantity} onChangeText={setQuantity} keyboardType="numeric" style={[styles.input, styles.halfInput]} />
                        <TextInput placeholder="Unit" placeholderTextColor={theme.colors.text.muted} value={unit} onChangeText={setUnit} style={[styles.input, styles.halfInput]} />
                    </View>
                    <TextInput placeholder="Expiry YYYY-MM-DD" placeholderTextColor={theme.colors.text.muted} value={expiresOn} onChangeText={setExpiresOn} style={styles.input} />
                    <TextInput placeholder="Category" placeholderTextColor={theme.colors.text.muted} value={category} onChangeText={setCategory} style={styles.input} />
                    <NeonButton label="Add Ingredient" onPress={handleAddIngredient} disabled={isLoading} loading={isLoading} />
                </View>

                {/* ── AI Vision ── */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>AI Vision</Text>
                    <Text style={styles.cardText}>Scan your fridge image and auto-detect ingredients.</Text>
                    <NeonButton label="Scan from Camera / Gallery" onPress={handleVisionRecognition} disabled={isScanning} loading={isScanning} variant="ghost" />
                </View>

                {/* ── Scanned ingredients ── */}
                {scannedIngredients.length > 0 ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Detected ingredients</Text>
                        {scannedIngredients.map((ing: ScannedIngredient, idx: number) => (
                            <View key={`${ing.name}-${idx}`} style={styles.scanRow}>
                                <Text style={styles.scanName}>{ing.name}</Text>
                                <Text style={styles.scanMeta}>{ing.estimated_quantity} {ing.unit} · {ing.category}</Text>
                            </View>
                        ))}
                        <NeonButton label="Confirm & Add All" onPress={handleConfirmScan} />
                        <NeonButton label="Discard" onPress={clearScan} variant="ghost" />
                    </View>
                ) : null}

                {/* ── Inventory ── */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Inventory</Text>
                    {isLoading && items.length === 0 ? (
                        <ActivityIndicator color={theme.colors.green.primary} style={{ marginVertical: 20 }} />
                    ) : items.length === 0 ? (
                        <Text style={styles.cardText}>No items yet. Add some ingredients.</Text>
                    ) : (
                        <View style={styles.inventoryWrap}>
                            {items.map((item) => {
                                const status = expirationStatus(item.expiry_date);
                                const chipStyle = status === 'expired' ? styles.chipExpired : status === 'soon' ? styles.chipSoon : status === 'fresh' ? styles.chipFresh : styles.chipNeutral;
                                const chipText = status === 'expired' ? 'Expired' : status === 'soon' ? 'Soon' : status === 'fresh' ? 'Fresh' : 'No date';
                                return (
                                    <View key={item.id} style={styles.itemChipRow}>
                                        <View style={styles.itemMain}>
                                            <Text style={styles.rowTitle}>{item.name}</Text>
                                            <Text style={styles.rowMeta}>{item.quantity} {item.unit} · {item.category}</Text>
                                        </View>
                                        <View style={[styles.statusChip, chipStyle]}><Text style={styles.statusChipText}>{chipText}</Text></View>
                                        <Pressable onPress={() => handleDeleteItem(item.id, item.name)} hitSlop={8}>
                                            <Text style={styles.deleteBtn}>✕</Text>
                                        </Pressable>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background.main },
    content: { padding: 18, paddingBottom: 100, gap: 14 },
    title: { color: theme.colors.text.primary, fontSize: 34, fontWeight: '800', letterSpacing: 0.3 },
    subtitle: { color: theme.colors.text.muted, fontSize: 14, marginTop: -4 },
    errorBanner: {
        backgroundColor: 'rgba(255,82,82,0.08)', borderColor: 'rgba(255,82,82,0.25)',
        borderWidth: 1, borderRadius: theme.radius.lg, padding: 12,
    },
    errorText: { color: theme.colors.error, fontSize: 13 },
    metricsRow: { flexDirection: 'row', gap: 10 },
    metricCard: {
        flex: 1, backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.lg, padding: 16,
    },
    metricValue: { color: theme.colors.green.primary, fontSize: 28, fontWeight: '900' },
    metricLabel: { color: theme.colors.text.muted, fontSize: 12, marginTop: 2 },
    card: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.lg, padding: 16, gap: 10,
    },
    cardTitle: { color: theme.colors.text.primary, fontSize: 17, fontWeight: '700' },
    cardText: { color: theme.colors.text.muted, fontSize: 13, lineHeight: 18 },
    input: {
        backgroundColor: theme.colors.background.main, borderWidth: 1.5,
        borderColor: theme.colors.ui.divider, borderRadius: theme.radius.sm,
        color: theme.colors.text.primary, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    },
    row2col: { flexDirection: 'row', gap: 8 },
    halfInput: { flex: 1 },
    scanRow: { backgroundColor: theme.colors.background.main, borderRadius: theme.radius.sm, padding: 12 },
    scanName: { color: theme.colors.text.primary, fontSize: 15, fontWeight: '700' },
    scanMeta: { color: theme.colors.text.muted, fontSize: 12, marginTop: 2 },
    inventoryWrap: { gap: 8 },
    itemChipRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: theme.colors.background.main,
        borderRadius: theme.radius.full, paddingVertical: 10, paddingHorizontal: 14, gap: 8,
    },
    itemMain: { flex: 1 },
    rowTitle: { color: theme.colors.text.primary, fontSize: 14, fontWeight: '700' },
    rowMeta: { color: theme.colors.text.muted, fontSize: 11, marginTop: 1 },
    statusChip: { borderRadius: theme.radius.full, paddingHorizontal: 10, paddingVertical: 4 },
    statusChipText: { fontSize: 11, fontWeight: '700', color: theme.colors.background.main },
    chipFresh: { backgroundColor: theme.colors.chart.medium },
    chipSoon: { backgroundColor: theme.colors.green.primary },
    chipExpired: { backgroundColor: theme.colors.error },
    chipNeutral: { backgroundColor: theme.colors.text.muted },
    deleteBtn: { color: theme.colors.error, fontSize: 18, fontWeight: '700', paddingHorizontal: 2 },
});
