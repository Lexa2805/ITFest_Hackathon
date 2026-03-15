/**
 * NutritionScreen — cyber-wellness aesthetic with bento-box layout,
 * neon-green accents, and spacing-driven content separation.
 */

import React, { useMemo, useState } from 'react';
import {
    Alert,
    ImageBackground,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { CalorieRing } from '@/components/nutrition/CalorieRing';
import { MacroBar } from '@/components/nutrition/MacroBar';
import { PhotoMealCapture } from '@/components/nutrition/PhotoMealCapture';
import { FlowEntryCard } from '@/components/recipe/FlowEntryCard';
import { useRouter } from 'expo-router';
import {
    BarcodeNutritionProduct,
    DailySummaryResponse,
    MealIngredient,
    MealLogRequest,
    MealPlanResponse,
    PlannedMeal,
    generateMealPlan,
    getNutritionDailySummary,
    getLatestMealPlan,
    lookupFoodByBarcode,
    logMeal,
} from '@/services/nutritionApi';
import { useAuthStore } from '@/stores/authStore';
import { FridgeScreenContent } from '@/app/(tabs)/two';
import { theme } from '@/constants/theme';
import { NeonButton } from '@/components/ui/NeonButton';
import { BentoCard } from '@/components/ui/BentoCard';

type NutritionTab = 'main' | 'fridge';
type MealMoment = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface MealFormState {
    meal_name: string;
    ingredients: MealIngredient[];
    kcal: string;
    protein: string;
    fat: string;
    carbs: string;
    time_of_day: MealMoment;
}

const INITIAL_FORM: MealFormState = {
    meal_name: '',
    ingredients: [],
    kcal: '',
    protein: '',
    fat: '',
    carbs: '',
    time_of_day: 'breakfast',
};

function RecipeHeroCard({ meal, index, onPick }: { meal: PlannedMeal; index: number; onPick: () => void }) {
    const sources = [
        'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1543353071-087092ec393a?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&auto=format&fit=crop&q=80',
    ];

    return (
        <Pressable onPress={onPick} style={styles.recipeCardWrap}>
            <ImageBackground source={{ uri: sources[index % sources.length] }} style={styles.recipeCardImage} imageStyle={styles.recipeImageStyle}>
                <LinearGradient
                    colors={['transparent', 'rgba(15,20,18,0.85)']}
                    style={styles.recipeOverlay}
                >
                    <Text style={styles.recipeTitle} numberOfLines={2}>{meal.meal_name}</Text>
                    <Text style={styles.recipeMeta}>{meal.kcal} kcal · P {meal.protein_g} · F {meal.fat_g} · C {meal.carbs_g}</Text>
                </LinearGradient>
            </ImageBackground>
        </Pressable>
    );
}

export default function NutritionScreen() {
    const router = useRouter();
    const user = useAuthStore((state) => state.user);
    const userId = user?.id ?? '';

    const [activeTab, setActiveTab] = useState<NutritionTab>('main');
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [mealPlan, setMealPlan] = useState<MealPlanResponse | null>(null);
    const [dailySummary, setDailySummary] = useState<DailySummaryResponse | null>(null);
    const [showLogMealSheet, setShowLogMealSheet] = useState(false);
    const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
    const [barcodeValue, setBarcodeValue] = useState('');
    const [barcodeLookupLoading, setBarcodeLookupLoading] = useState(false);
    const [scannerLocked, setScannerLocked] = useState(false);
    const [mealForm, setMealForm] = useState<MealFormState>(INITIAL_FORM);
    const [ingredientDraftName, setIngredientDraftName] = useState('');
    const [ingredientDraftGrams, setIngredientDraftGrams] = useState('0');
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();

    const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);

    const plannedMealsFlat = useMemo(() => {
        if (!mealPlan) return [] as PlannedMeal[];
        return [...mealPlan.breakfast, ...mealPlan.lunch, ...mealPlan.dinner, ...mealPlan.snacks];
    }, [mealPlan]);

    const loadAll = React.useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }

        setError(null);
        setLoading(true);
        try {
            const [summaryResult, planResult] = await Promise.allSettled([
                getNutritionDailySummary(),
                getLatestMealPlan(),
            ]);

            if (summaryResult.status === 'fulfilled') {
                setDailySummary(summaryResult.value);
            }

            if (planResult.status === 'fulfilled') {
                setMealPlan(planResult.value);
            }
        } catch (unknownError) {
            setError('Failed to load nutrition data.');
            console.error(unknownError);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    React.useEffect(() => {
        void loadAll();
    }, [loadAll]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadAll();
        setRefreshing(false);
    };

    const handleGeneratePlan = async () => {
        if (!userId) return;

        const kcalTarget = dailySummary?.kcal.target || 2000;
        const proteinTarget = dailySummary?.protein.target || 130;
        const fatTarget = dailySummary?.fat.target || 70;
        const carbsTarget = dailySummary?.carbs.target || 220;

        try {
            const generated = await generateMealPlan({
                daily_kcal_target: kcalTarget,
                macro_targets: {
                    protein_g: proteinTarget,
                    fat_g: fatTarget,
                    carbs_g: carbsTarget,
                },
            });
            setMealPlan(generated);
        } catch (unknownError) {
            setError('Failed to generate meal plan.');
            console.error(unknownError);
        }
    };

    const handleAddDraftIngredient = () => {
        const grams = Number(ingredientDraftGrams);
        if (!ingredientDraftName.trim() || !Number.isFinite(grams) || grams < 0) return;

        setMealForm((current) => ({
            ...current,
            ingredients: [...current.ingredients, { name: ingredientDraftName.trim(), grams }],
        }));
        setIngredientDraftName('');
        setIngredientDraftGrams('0');
    };

    const handlePickFromPlan = (meal: PlannedMeal) => {
        setMealForm({
            meal_name: meal.meal_name,
            ingredients: meal.ingredients,
            kcal: String(meal.kcal),
            protein: String(meal.protein_g),
            fat: String(meal.fat_g),
            carbs: String(meal.carbs_g),
            time_of_day: 'dinner',
        });
        setShowLogMealSheet(true);
    };

    const handleLogMeal = async () => {
        if (!userId || !mealForm.meal_name.trim()) return;

        const payload: MealLogRequest = {
            meal_name: mealForm.meal_name,
            ingredients: mealForm.ingredients,
            kcal: Number(mealForm.kcal || 0),
            protein: Number(mealForm.protein || 0),
            fat: Number(mealForm.fat || 0),
            carbs: Number(mealForm.carbs || 0),
            time_of_day: mealForm.time_of_day,
            date: todayIso,
        };

        try {
            await logMeal(payload);
            setMealForm(INITIAL_FORM);
            setShowLogMealSheet(false);
            setDailySummary(await getNutritionDailySummary());
        } catch (unknownError) {
            setError('Failed to log meal.');
            console.error(unknownError);
        }
    };

    const applyBarcodeProductToMealForm = (product: BarcodeNutritionProduct, grams: number = 100) => {
        const ratio = grams / 100;
        setMealForm((current) => ({
            ...current,
            meal_name: product.productName,
            ingredients: [...current.ingredients, { name: product.productName, grams }],
            kcal: String(Math.round(product.kcalPer100g * ratio)),
            protein: String(Math.round(product.proteinPer100g * ratio)),
            fat: String(Math.round(product.fatPer100g * ratio)),
            carbs: String(Math.round(product.carbsPer100g * ratio)),
        }));
    };

    const handleLookupBarcode = async (inputBarcode?: string) => {
        const targetBarcode = (inputBarcode ?? barcodeValue).trim();
        if (!targetBarcode) {
            setError('Enter or scan a barcode first.');
            return;
        }

        setBarcodeLookupLoading(true);
        setError(null);
        try {
            const product = await lookupFoodByBarcode(targetBarcode);
            applyBarcodeProductToMealForm(product, 100);
            setBarcodeValue(targetBarcode);
            setShowBarcodeScanner(false);
        } catch (lookupError: any) {
            const message = typeof lookupError?.message === 'string' ? lookupError.message : 'Failed to resolve product by barcode.';
            setError(message);
        } finally {
            setBarcodeLookupLoading(false);
            setScannerLocked(false);
        }
    };

    const openScanner = async () => {
        if (Platform.OS === 'web') {
            setError('Camera scanning is not available on web. Enter barcode manually.');
            return;
        }

        if (!cameraPermission?.granted) {
            const permission = await requestCameraPermission();
            if (!permission.granted) {
                Alert.alert('Permission required', 'Camera permission is required to scan barcodes.');
                return;
            }
        }

        setScannerLocked(false);
        setShowBarcodeScanner(true);
    };

    const onBarcodeScanned = ({ data }: BarcodeScanningResult) => {
        if (scannerLocked) return;
        setScannerLocked(true);
        setBarcodeValue(data);
        void handleLookupBarcode(data);
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.safeArea]}>
                <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
                    <View style={styles.headerBlock}>
                        <View style={styles.skeletonSmall} />
                        <View style={styles.skeletonTitle} />
                    </View>
                    <View style={[styles.heroCard, { alignItems: 'center', justifyContent: 'center', minHeight: 160 }]}>
                        <View style={styles.skeletonRing} />
                    </View>
                    <View style={styles.macroWrap}>
                        <View style={styles.skeletonBar} />
                        <View style={styles.skeletonBar} />
                        <View style={styles.skeletonBar} />
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (activeTab === 'fridge') {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.screen}>
                    <View style={styles.headerBlock}>
                        <Text style={styles.title}>Nutrition</Text>
                        <View style={styles.tabRow}>
                            <Pressable style={styles.tabPill} onPress={() => setActiveTab('main')}>
                                <Text style={styles.tabPillText}>Recipes</Text>
                            </Pressable>
                            <Pressable style={[styles.tabPill, styles.tabPillActive]} onPress={() => setActiveTab('fridge')}>
                                <Text style={[styles.tabPillText, styles.tabPillTextActive]}>Fridge</Text>
                            </Pressable>
                        </View>
                    </View>
                    <FridgeScreenContent embedded />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                style={styles.screen}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.green.primary} />}
            >
                {/* ── Header ── */}
                <Animated.View entering={FadeInDown.duration(400)}>
                    <View style={styles.headerBlock}>
                        <Text style={styles.todayLabel}>Today</Text>
                        <Text style={styles.title}>Nutrition</Text>

                        <View style={styles.tabRow}>
                            <Pressable style={[styles.tabPill, styles.tabPillActive]} onPress={() => setActiveTab('main')}>
                                <Text style={[styles.tabPillText, styles.tabPillTextActive]}>Recipes</Text>
                            </Pressable>
                            <Pressable style={styles.tabPill} onPress={() => setActiveTab('fridge')}>
                                <Text style={styles.tabPillText}>Fridge</Text>
                            </Pressable>
                        </View>

                        {error ? <Text style={styles.error}>{error}</Text> : null}
                    </View>
                </Animated.View>

                {/* ── Calorie ring + macro summary ── */}
                <Animated.View entering={FadeInDown.duration(500).delay(100)}>
                    <View style={styles.heroCard}>
                        <View style={styles.heroRow}>
                            <CalorieRing
                                consumed={dailySummary?.kcal.consumed ?? 0}
                                target={dailySummary?.kcal.target ?? 0}
                            />
                            <View style={styles.heroRight}>
                                <View style={styles.kcalRow}>
                                    <Text style={styles.kcalConsumed}>{dailySummary?.kcal.consumed ?? 0}</Text>
                                    <Text style={styles.kcalTarget}> / {dailySummary?.kcal.target ?? 0}</Text>
                                </View>
                                <Text style={styles.kcalLabel}>Calories consumed</Text>
                                <View style={styles.macroSummaryRow}>
                                    <View style={styles.macroSummaryItem}>
                                        <Text style={styles.macroSummaryValue}>{dailySummary?.protein.consumed ?? 0}g</Text>
                                        <Text style={styles.macroSummaryLabel}>Protein</Text>
                                    </View>
                                    <View style={styles.macroSummaryItem}>
                                        <Text style={styles.macroSummaryValue}>{dailySummary?.carbs.consumed ?? 0}g</Text>
                                        <Text style={styles.macroSummaryLabel}>Carbs</Text>
                                    </View>
                                    <View style={styles.macroSummaryItem}>
                                        <Text style={styles.macroSummaryValue}>{dailySummary?.fat.consumed ?? 0}g</Text>
                                        <Text style={styles.macroSummaryLabel}>Fats</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                </Animated.View>

                {/* ── Macro progress bars ── */}
                <Animated.View entering={FadeInDown.duration(500).delay(150)}>
                    <View style={styles.macroWrap}>
                        <MacroBar label="Protein" consumed={dailySummary?.protein.consumed ?? 0} target={dailySummary?.protein.target ?? 0} />
                        <MacroBar label="Carbs" consumed={dailySummary?.carbs.consumed ?? 0} target={dailySummary?.carbs.target ?? 0} />
                        <MacroBar label="Fats" consumed={dailySummary?.fat.consumed ?? 0} target={dailySummary?.fat.target ?? 0} />
                    </View>
                </Animated.View>

                {/* ── Actions ── */}
                <Animated.View entering={FadeInDown.duration(500).delay(200)}>
                    <View style={styles.rowActions}>
                        <View style={{ flex: 1 }}>
                            <NeonButton label="Generate new plan" onPress={handleGeneratePlan} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <NeonButton label="Log a meal" onPress={() => setShowLogMealSheet(true)} variant="ghost" />
                        </View>
                    </View>
                </Animated.View>

                {/* ── Recipe suggestions ── */}
                <Animated.View entering={FadeInDown.duration(500).delay(250)}>
                    <Text style={styles.sectionTitle}>Recipe suggestions</Text>
                    <View style={styles.recipeList}>
                        {(plannedMealsFlat.length > 0 ? plannedMealsFlat : []).slice(0, 6).map((meal, index) => (
                            <RecipeHeroCard key={`${meal.meal_name}-${index}`} meal={meal} index={index} onPick={() => handlePickFromPlan(meal)} />
                        ))}
                        {plannedMealsFlat.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyText}>Generate a meal plan to see recipe cards.</Text>
                            </View>
                        ) : null}
                    </View>
                </Animated.View>

                {/* ── Explore recipes ── */}
                <Animated.View entering={FadeInDown.duration(500).delay(300)}>
                    <Text style={styles.sectionTitle}>Explore recipes</Text>
                    <View style={styles.flowEntrySection}>
                        <FlowEntryCard
                            icon="restaurant-outline"
                            title="What can I cook tonight?"
                            subtitle="Get suggestions matched to your fridge"
                            onPress={() => router.push('/recipe-suggestions')}
                        />
                        <FlowEntryCard
                            icon="calendar-outline"
                            title="Plan my week"
                            subtitle="Generate a 7-day meal plan"
                            onPress={() => router.push('/weekly-plan')}
                        />
                    </View>
                </Animated.View>

                {/* ── Photo meal capture ── */}
                <PhotoMealCapture
                    onComplete={() => {
                        if (userId) {
                            getNutritionDailySummary().then(setDailySummary).catch(() => { });
                        }
                    }}
                />

                {/* ── Logged meals by time of day ── */}
                {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((timeOfDay) => {
                    const meals = (dailySummary?.meals ?? []).filter((meal) => meal.time_of_day === timeOfDay);
                    return (
                        <View style={styles.loggedSection} key={timeOfDay}>
                            <Text style={styles.loggedTitle}>{timeOfDay}</Text>
                            {meals.length === 0 ? (
                                <Text style={styles.emptyText}>No meal logged.</Text>
                            ) : (
                                meals.map((meal) => (
                                    <View key={meal.id} style={styles.loggedMealRow}>
                                        <Text style={styles.loggedMealName}>{meal.meal_name}</Text>
                                        <Text style={styles.loggedMealMeta}>{meal.kcal} kcal · P {meal.protein} · F {meal.fat} · C {meal.carbs}</Text>
                                    </View>
                                ))
                            )}
                        </View>
                    );
                })}
            </ScrollView>

            {/* ── Log Meal Modal ── */}
            <Modal visible={showLogMealSheet} transparent animationType="slide" onRequestClose={() => setShowLogMealSheet(false)}>
                <View style={styles.sheetBackdrop}>
                    <ScrollView style={styles.sheetCard} contentContainerStyle={styles.sheetContent}>
                        <Text style={styles.sheetTitle}>Log a Meal</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Meal name"
                            placeholderTextColor={theme.colors.text.muted}
                            value={mealForm.meal_name}
                            onChangeText={(value) => setMealForm((current) => ({ ...current, meal_name: value }))}
                        />

                        <Text style={styles.fieldLabel}>Scan product barcode or enter manually</Text>
                        <View style={styles.rowInputs}>
                            <TextInput
                                style={[styles.input, styles.rowInput]}
                                placeholder="Barcode"
                                placeholderTextColor={theme.colors.text.muted}
                                value={barcodeValue}
                                onChangeText={setBarcodeValue}
                                keyboardType="numeric"
                            />
                            <Pressable
                                style={[styles.secondaryButton, styles.inlineButton]}
                                onPress={() => { void handleLookupBarcode(); }}
                                disabled={barcodeLookupLoading}
                            >
                                <Text style={styles.secondaryButtonText}>{barcodeLookupLoading ? 'Looking up...' : 'Use barcode'}</Text>
                            </Pressable>
                        </View>
                        <Pressable style={styles.secondaryButton} onPress={() => void openScanner()}>
                            <Text style={styles.secondaryButtonText}>Scan barcode with camera</Text>
                        </Pressable>

                        <Text style={styles.fieldLabel}>Pick from today's plan</Text>
                        <View style={styles.planPickWrap}>
                            {plannedMealsFlat.map((meal, index) => (
                                <Pressable key={`${meal.meal_name}-${index}`} style={styles.planPickChip} onPress={() => handlePickFromPlan(meal)}>
                                    <Text style={styles.planPickText}>{meal.meal_name}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <Text style={styles.fieldLabel}>Add ingredients one by one</Text>
                        <View style={styles.rowInputs}>
                            <TextInput style={[styles.input, styles.rowInput]} placeholder="Name" placeholderTextColor={theme.colors.text.muted} value={ingredientDraftName} onChangeText={setIngredientDraftName} />
                            <TextInput style={[styles.input, styles.rowInput]} placeholder="Grams" placeholderTextColor={theme.colors.text.muted} keyboardType="numeric" value={ingredientDraftGrams} onChangeText={setIngredientDraftGrams} />
                        </View>
                        <Pressable style={styles.secondaryButton} onPress={handleAddDraftIngredient}>
                            <Text style={styles.secondaryButtonText}>Add ingredient</Text>
                        </Pressable>

                        {mealForm.ingredients.map((ingredient, index) => (
                            <Text key={`${ingredient.name}-${index}`} style={styles.ingredientMeta}>• {ingredient.name} — {ingredient.grams}g</Text>
                        ))}

                        <View style={styles.rowInputs}>
                            <TextInput style={[styles.input, styles.rowInput]} placeholder="kcal" placeholderTextColor={theme.colors.text.muted} keyboardType="numeric" value={mealForm.kcal} onChangeText={(value) => setMealForm((current) => ({ ...current, kcal: value }))} />
                            <TextInput style={[styles.input, styles.rowInput]} placeholder="Protein" placeholderTextColor={theme.colors.text.muted} keyboardType="numeric" value={mealForm.protein} onChangeText={(value) => setMealForm((current) => ({ ...current, protein: value }))} />
                            <TextInput style={[styles.input, styles.rowInput]} placeholder="Fat" placeholderTextColor={theme.colors.text.muted} keyboardType="numeric" value={mealForm.fat} onChangeText={(value) => setMealForm((current) => ({ ...current, fat: value }))} />
                            <TextInput style={[styles.input, styles.rowInput]} placeholder="Carbs" placeholderTextColor={theme.colors.text.muted} keyboardType="numeric" value={mealForm.carbs} onChangeText={(value) => setMealForm((current) => ({ ...current, carbs: value }))} />
                        </View>

                        <Text style={styles.fieldLabel}>Time of day</Text>
                        <View style={styles.unitRow}>
                            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((time) => (
                                <Pressable
                                    key={time}
                                    style={[styles.unitChip, mealForm.time_of_day === time && styles.unitChipActive]}
                                    onPress={() => setMealForm((current) => ({ ...current, time_of_day: time }))}
                                >
                                    <Text style={[styles.unitChipText, mealForm.time_of_day === time && styles.unitChipTextActive]}>{time}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <NeonButton label="Save meal log" onPress={handleLogMeal} />
                    </ScrollView>
                </View>
            </Modal>

            {/* ── Barcode Scanner Modal ── */}
            <Modal visible={showBarcodeScanner} transparent animationType="slide" onRequestClose={() => setShowBarcodeScanner(false)}>
                <View style={styles.sheetBackdrop}>
                    <View style={styles.scannerCard}>
                        <Text style={styles.sheetTitle}>Scan barcode</Text>
                        <Text style={styles.summaryText}>Align the product barcode inside the frame.</Text>
                        <View style={styles.scannerFrame}>
                            <CameraView
                                style={styles.scannerCamera}
                                facing="back"
                                onBarcodeScanned={onBarcodeScanned}
                                barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
                            />
                        </View>
                        <NeonButton label="Close scanner" onPress={() => setShowBarcodeScanner(false)} variant="ghost" />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background.main,
    },
    loadingState: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    skeletonSmall: {
        width: 60,
        height: 14,
        borderRadius: 7,
        backgroundColor: theme.colors.background.secondary,
    },
    skeletonTitle: {
        width: 140,
        height: 28,
        borderRadius: 8,
        backgroundColor: theme.colors.background.secondary,
    },
    skeletonRing: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: theme.colors.background.main,
    },
    skeletonBar: {
        height: 24,
        borderRadius: 8,
        backgroundColor: theme.colors.background.main,
    },
    screen: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 18,
        paddingVertical: 12,
        paddingBottom: 100,
        gap: 16,
    },
    headerBlock: {
        gap: 6,
    },
    todayLabel: {
        color: theme.colors.text.muted,
        fontSize: 14,
        fontWeight: '600',
    },
    title: {
        color: theme.colors.text.primary,
        fontSize: 34,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    tabRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    tabPill: {
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.background.secondary,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    tabPillActive: {
        backgroundColor: 'rgba(57,255,136,0.14)',
    },
    tabPillText: {
        color: theme.colors.text.muted,
        fontSize: 13,
        fontWeight: '600',
    },
    tabPillTextActive: {
        color: theme.colors.green.primary,
        fontWeight: '700',
    },
    error: {
        color: theme.colors.error,
        fontSize: 13,
    },
    heroCard: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.lg,
        padding: 20,
    },
    heroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    heroRight: {
        flex: 1,
        gap: 6,
    },
    kcalRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    kcalConsumed: {
        color: theme.colors.text.primary,
        fontSize: 28,
        fontWeight: '900',
    },
    kcalTarget: {
        color: theme.colors.text.secondary,
        fontSize: 16,
        fontWeight: '600',
    },
    kcalLabel: {
        color: theme.colors.text.muted,
        fontSize: 13,
    },
    macroSummaryRow: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 8,
    },
    macroSummaryItem: {
        alignItems: 'flex-start',
    },
    macroSummaryValue: {
        color: theme.colors.green.primary,
        fontSize: 16,
        fontWeight: '800',
    },
    macroSummaryLabel: {
        color: theme.colors.text.muted,
        fontSize: 11,
        fontWeight: '600',
    },
    macroWrap: {
        gap: 10,
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.lg,
        padding: 16,
    },
    rowActions: {
        flexDirection: 'row',
        gap: 10,
    },
    sectionTitle: {
        color: theme.colors.text.primary,
        fontSize: 18,
        fontWeight: '700',
    },
    recipeList: {
        gap: 10,
    },
    flowEntrySection: {
        gap: 10,
    },
    recipeCardWrap: {
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        backgroundColor: theme.colors.background.secondary,
    },
    recipeCardImage: {
        minHeight: 148,
        justifyContent: 'flex-end',
    },
    recipeImageStyle: {
        opacity: 0.9,
        borderRadius: theme.radius.lg,
    },
    recipeOverlay: {
        padding: 14,
        gap: 4,
    },
    recipeTitle: {
        color: theme.colors.text.primary,
        fontSize: 18,
        fontWeight: '800',
        lineHeight: 22,
    },
    recipeMeta: {
        color: theme.colors.text.secondary,
        fontSize: 12,
        fontWeight: '600',
    },
    emptyCard: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.lg,
        padding: 16,
    },
    emptyText: {
        color: theme.colors.text.muted,
        fontSize: 13,
    },
    loggedSection: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.lg,
        padding: 14,
        gap: 8,
    },
    loggedTitle: {
        color: theme.colors.green.primary,
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    loggedMealRow: {
        gap: 2,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.ui.divider,
    },
    loggedMealName: {
        color: theme.colors.text.primary,
        fontSize: 14,
        fontWeight: '700',
    },
    loggedMealMeta: {
        color: theme.colors.text.secondary,
        fontSize: 12,
    },
    sheetBackdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheetCard: {
        backgroundColor: theme.colors.background.elevated,
        borderTopLeftRadius: theme.radius.lg,
        borderTopRightRadius: theme.radius.lg,
        padding: 18,
        maxHeight: '85%',
    },
    sheetContent: {
        gap: 12,
        paddingBottom: 20,
    },
    sheetTitle: {
        color: theme.colors.text.primary,
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    input: {
        backgroundColor: theme.colors.background.main,
        borderWidth: 1.5,
        borderColor: theme.colors.ui.divider,
        borderRadius: theme.radius.sm,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: theme.colors.text.primary,
        fontSize: 14,
    },
    summaryText: {
        color: theme.colors.text.secondary,
        fontSize: 13,
    },
    fieldLabel: {
        color: theme.colors.text.secondary,
        fontSize: 13,
        fontWeight: '600',
        marginTop: 4,
    },
    planPickWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    planPickChip: {
        borderRadius: theme.radius.full,
        backgroundColor: 'rgba(57,255,136,0.08)',
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    planPickText: {
        color: theme.colors.green.primary,
        fontSize: 12,
        fontWeight: '600',
    },
    ingredientMeta: {
        color: theme.colors.text.muted,
        fontSize: 12,
    },
    rowInputs: {
        flexDirection: 'row',
        gap: 8,
    },
    rowInput: {
        flex: 1,
    },
    inlineButton: {
        justifyContent: 'center',
    },
    secondaryButton: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.sm,
        paddingVertical: 12,
        paddingHorizontal: 14,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: theme.colors.text.secondary,
        fontSize: 13,
        fontWeight: '700',
    },
    unitRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    unitChip: {
        borderRadius: theme.radius.full,
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: theme.colors.background.main,
    },
    unitChipActive: {
        backgroundColor: 'rgba(57,255,136,0.14)',
    },
    unitChipText: {
        color: theme.colors.text.muted,
        fontSize: 12,
        fontWeight: '600',
    },
    unitChipTextActive: {
        color: theme.colors.green.primary,
    },
    scannerCard: {
        backgroundColor: theme.colors.background.elevated,
        borderTopLeftRadius: theme.radius.lg,
        borderTopRightRadius: theme.radius.lg,
        padding: 18,
        gap: 12,
    },
    scannerFrame: {
        height: 340,
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    scannerCamera: {
        flex: 1,
    },
});
