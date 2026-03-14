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

import { useFridgeStore } from '@/stores/fridgeStore';
import type { ScannedIngredient } from '@/services/fridgeApi';

const C = {
    bg: '#0D0D14',
    card: '#13121C',
    border: 'rgba(247,244,239,0.12)',
    text: '#F7F4EF',
    body: '#C8C1B6',
    muted: '#8F8779',
    amber: '#39FF88',
    success: '#7DCEA0',
    warning: '#39FF88',
    danger: '#F08A7C',
} as const;

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
    const {
        items,
        scannedIngredients,
        isLoading,
        isScanning,
        error,
        fetchItems,
        addItem,
        removeItem,
        scanImage,
        confirmScan,
        clearScan,
    } = useFridgeStore();

    const [ingredient, setIngredient] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unit, setUnit] = useState('');
    const [expiresOn, setExpiresOn] = useState('');
    const [category, setCategory] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchItems();
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchItems();
        setRefreshing(false);
    }, [fetchItems]);

    const totalItems = items.length;
    const expiringSoonCount = useMemo(() => items.filter((item) => item.expiring_soon).length, [items]);

    const handleAddIngredient = async () => {
        if (!ingredient.trim()) {
            Alert.alert('Missing data', 'Please enter at least an ingredient name.');
            return;
        }

        const qty = parseFloat(quantity) || 1;

        try {
            await addItem({
                name: ingredient.trim(),
                quantity: qty,
                unit: unit.trim() || 'pcs',
                expiry_date: expiresOn.trim() || null,
                category: category.trim() || 'other',
            });
            setIngredient('');
            setQuantity('');
            setUnit('');
            setExpiresOn('');
            setCategory('');
        } catch {
            // error handled in store
        }
    };

    const handlePickImage = async () => {
        const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permResult.granted) {
            Alert.alert('Permission required', 'Please allow access to your photos to scan ingredients.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
        if (!result.canceled && result.assets[0]) {
            await scanImage(result.assets[0].uri);
        }
    };

    const handleTakePhoto = async () => {
        const permResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permResult.granted) {
            Alert.alert('Permission required', 'Please allow camera access to scan ingredients.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
        if (!result.canceled && result.assets[0]) {
            await scanImage(result.assets[0].uri);
        }
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
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => removeItem(id),
            },
        ]);
    };

    return (
        <View style={styles.screen}>
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.amber} colors={[C.amber]} />}
            >
                {!embedded ? (
                    <>
                        <Text style={styles.title}>Fridge</Text>
                        <Text style={styles.subtitle}>Track ingredients, expiry, and AI-assisted recognition.</Text>
                    </>
                ) : null}

                {error ? (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorText}>⚠ {error}</Text>
                    </View>
                ) : null}

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

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Add ingredient</Text>
                    <TextInput placeholder="Ingredient name *" placeholderTextColor={C.muted} value={ingredient} onChangeText={setIngredient} style={styles.input} />
                    <View style={styles.row2col}>
                        <TextInput
                            placeholder="Qty"
                            placeholderTextColor={C.muted}
                            value={quantity}
                            onChangeText={setQuantity}
                            keyboardType="numeric"
                            style={[styles.input, styles.halfInput]}
                        />
                        <TextInput placeholder="Unit" placeholderTextColor={C.muted} value={unit} onChangeText={setUnit} style={[styles.input, styles.halfInput]} />
                    </View>
                    <TextInput
                        placeholder="Expiry YYYY-MM-DD"
                        placeholderTextColor={C.muted}
                        value={expiresOn}
                        onChangeText={setExpiresOn}
                        style={styles.input}
                    />
                    <TextInput placeholder="Category" placeholderTextColor={C.muted} value={category} onChangeText={setCategory} style={styles.input} />
                    <Pressable style={[styles.primaryButton, isLoading && styles.disabledButton]} onPress={handleAddIngredient} disabled={isLoading}>
                        {isLoading ? <ActivityIndicator color="#0F1412" /> : <Text style={styles.primaryButtonText}>Add Ingredient</Text>}
                    </Pressable>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>AI Vision</Text>
                    <Text style={styles.cardText}>Scan your fridge image and auto-detect ingredients.</Text>
                    <Pressable style={[styles.secondaryButton, isScanning && styles.disabledButton]} onPress={handleVisionRecognition} disabled={isScanning}>
                        {isScanning ? <ActivityIndicator color={C.body} /> : <Text style={styles.secondaryButtonText}>Scan from Camera / Gallery</Text>}
                    </Pressable>
                </View>

                {scannedIngredients.length > 0 ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Detected ingredients</Text>
                        {scannedIngredients.map((ing: ScannedIngredient, idx: number) => (
                            <View key={`${ing.name}-${idx}`} style={styles.scanRow}>
                                <Text style={styles.scanName}>{ing.name}</Text>
                                <Text style={styles.scanMeta}>{ing.estimated_quantity} {ing.unit} · {ing.category}</Text>
                            </View>
                        ))}
                        <Pressable style={styles.primaryButton} onPress={handleConfirmScan}>
                            <Text style={styles.primaryButtonText}>Confirm & Add All</Text>
                        </Pressable>
                        <Pressable style={styles.secondaryButton} onPress={clearScan}>
                            <Text style={styles.secondaryButtonText}>Discard</Text>
                        </Pressable>
                    </View>
                ) : null}

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Inventory</Text>
                    {isLoading && items.length === 0 ? (
                        <ActivityIndicator color={C.amber} style={{ marginVertical: 20 }} />
                    ) : items.length === 0 ? (
                        <Text style={styles.cardText}>No items yet. Add some ingredients.</Text>
                    ) : (
                        <View style={styles.inventoryWrap}>
                            {items.map((item) => {
                                const status = expirationStatus(item.expiry_date);
                                const chipStyle =
                                    status === 'expired'
                                        ? styles.chipExpired
                                        : status === 'soon'
                                            ? styles.chipSoon
                                            : status === 'fresh'
                                                ? styles.chipFresh
                                                : styles.chipNeutral;

                                const chipText = status === 'expired' ? 'Expired' : status === 'soon' ? 'Soon' : status === 'fresh' ? 'Fresh' : 'No date';

                                return (
                                    <View key={item.id} style={styles.itemChipRow}>
                                        <View style={styles.itemMain}>
                                            <Text style={styles.rowTitle}>{item.name}</Text>
                                            <Text style={styles.rowMeta}>{item.quantity} {item.unit} · {item.category}</Text>
                                        </View>
                                        <View style={[styles.statusChip, chipStyle]}>
                                            <Text style={styles.statusChipText}>{chipText}</Text>
                                        </View>
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
    screen: {
        flex: 1,
        backgroundColor: C.bg,
    },
    content: {
        padding: 16,
        paddingBottom: 28,
        gap: 12,
    },
    title: {
        color: C.text,
        fontSize: 30,
        fontWeight: '800',
    },
    subtitle: {
        color: C.muted,
        fontSize: 14,
        marginTop: -4,
    },
    errorBanner: {
        backgroundColor: 'rgba(240,138,124,0.15)',
        borderColor: 'rgba(240,138,124,0.4)',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
    },
    errorText: {
        color: C.danger,
        fontSize: 13,
    },
    metricsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    metricCard: {
        flex: 1,
        backgroundColor: C.card,
        borderColor: C.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
    },
    metricValue: {
        color: C.amber,
        fontSize: 28,
        fontWeight: '900',
    },
    metricLabel: {
        color: C.muted,
        fontSize: 12,
        marginTop: 2,
    },
    card: {
        backgroundColor: C.card,
        borderColor: C.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        gap: 10,
    },
    cardTitle: {
        color: C.text,
        fontSize: 17,
        fontWeight: '700',
    },
    cardText: {
        color: C.muted,
        fontSize: 13,
        lineHeight: 18,
    },
    input: {
        backgroundColor: '#10101A',
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        color: C.text,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
    },
    row2col: {
        flexDirection: 'row',
        gap: 8,
    },
    halfInput: {
        flex: 1,
    },
    primaryButton: {
        backgroundColor: C.amber,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    primaryButtonText: {
        color: '#0F1412',
        fontSize: 14,
        fontWeight: '800',
    },
    secondaryButton: {
        backgroundColor: '#161522',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: C.border,
    },
    secondaryButtonText: {
        color: C.body,
        fontSize: 14,
        fontWeight: '700',
    },
    disabledButton: {
        opacity: 0.6,
    },
    scanRow: {
        backgroundColor: '#10101A',
        borderRadius: 10,
        padding: 10,
    },
    scanName: {
        color: C.text,
        fontSize: 15,
        fontWeight: '700',
    },
    scanMeta: {
        color: C.muted,
        fontSize: 12,
        marginTop: 2,
    },
    inventoryWrap: {
        gap: 8,
    },
    itemChipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10101A',
        borderColor: C.border,
        borderWidth: 1,
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 12,
        gap: 8,
    },
    itemMain: {
        flex: 1,
    },
    rowTitle: {
        color: C.text,
        fontSize: 14,
        fontWeight: '700',
    },
    rowMeta: {
        color: C.muted,
        fontSize: 11,
        marginTop: 1,
    },
    statusChip: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    statusChipText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#0D0D14',
    },
    chipFresh: {
        backgroundColor: C.success,
    },
    chipSoon: {
        backgroundColor: C.warning,
    },
    chipExpired: {
        backgroundColor: C.danger,
    },
    chipNeutral: {
        backgroundColor: '#A39A8B',
    },
    deleteBtn: {
        color: C.danger,
        fontSize: 18,
        fontWeight: '700',
        paddingHorizontal: 2,
    },
});