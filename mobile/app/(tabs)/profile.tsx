/**
 * ProfileScreen — cyber-wellness aesthetic with neon-green accents,
 * spacing-driven layout, and animated transitions.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';

import { useAuthStore } from '@/stores/authStore';
import { useHealthStore } from '@/stores/healthStore';
import { useProfileContext } from '@/contexts/ProfileContext';
import {
    type ActivityLevel,
    type Gender,
    type HealthGoal,
} from '@/services/profileApi';
import { type AgentItem } from '@/components/profile/AgentAccessSection';
import { theme } from '@/constants/theme';
import { NeonButton } from '@/components/ui/NeonButton';

const logoSource = require('@/assets/images/vitalos-logo.jpeg');

const activityOptions: ActivityLevel[] = ['sedentary', 'lightly active', 'moderately active', 'very active'];
const goalOptions: HealthGoal[] = ['lose weight', 'maintain', 'build muscle', 'improve endurance'];
const genderOptions: Gender[] = ['male', 'female', 'non-binary', 'prefer not to say', 'other'];
const experienceOptions: Array<'beginner' | 'intermediate' | 'advanced'> = ['beginner', 'intermediate', 'advanced'];

function toLbs(kg: number): number { return kg * 2.20462; }
function toKg(lbs: number): number { return lbs / 2.20462; }
function cmToFeetInches(cm: number): { feet: number; inches: number } {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches - feet * 12);
    return { feet, inches };
}
function feetInchesToCm(feet: number, inches: number): number { return feet * 30.48 + inches * 2.54; }

function getApiErrorMessage(error: any, fallback: string): string {
    const detail = error?.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (typeof error?.response?.data === 'string' && error.response.data.trim()) return error.response.data;
    if (typeof error?.message === 'string' && error.message.trim()) return error.message;
    return fallback;
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
    return (
        <Pressable style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
        </Pressable>
    );
}

function Field({ label, value, onChangeText, placeholder, keyboardType }: {
    label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'default' | 'numeric';
}) {
    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput style={styles.input} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={theme.colors.text.muted} keyboardType={keyboardType} />
        </View>
    );
}

function SectionDivider() {
    return <View style={styles.divider} />;
}

export default function ProfileScreen() {
    const router = useRouter();
    const user = useAuthStore((state) => state.user);
    const healthData = useHealthStore((state) => state.healthData);
    const loadHealthData = useHealthStore((state) => state.loadHealthData);
    const isHealthInitialized = useHealthStore((state) => state.isInitialized);

    const { profile, isLoading, isSaving, profileCompletion, todayCheckinSubmitted, updateProfile, submitTodayCheckin } = useProfileContext();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [age, setAge] = useState('');
    const [weight, setWeight] = useState('');
    const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
    const [heightCm, setHeightCm] = useState('');
    const [heightFeet, setHeightFeet] = useState('');
    const [heightInches, setHeightInches] = useState('');
    const [heightUnit, setHeightUnit] = useState<'cm' | 'ft/in'>('cm');
    const [gender, setGender] = useState<Gender | null>(null);
    const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
    const [goal, setGoal] = useState<HealthGoal | null>(null);
    const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'advanced' | null>(null);
    const [availableDaysPerWeek, setAvailableDaysPerWeek] = useState('');
    const [hasAppleWatch, setHasAppleWatch] = useState(true);
    const [avatarUri, setAvatarUri] = useState<string | null>(null);
    const [weeklyBudget, setWeeklyBudget] = useState('');
    const [isProfilePublic, setIsProfilePublic] = useState(true);

    const [heartRate, setHeartRate] = useState('');
    const [sleepHours, setSleepHours] = useState('');
    const [steps, setSteps] = useState('');
    const [calories, setCalories] = useState('');
    const [mood, setMood] = useState(3);
    const [stress, setStress] = useState(3);
    const [submittingCheckin, setSubmittingCheckin] = useState(false);

    const manualAnim = useRef(new Animated.Value(0)).current;
    const avatarStorageKey = useMemo(() => `profile_avatar:${user?.id ?? 'guest'}`, [user?.id]);

    useEffect(() => {
        if (!profile) return;
        setName(profile.name ?? '');
        setEmail(profile.email ?? user?.email ?? '');
        setAge(profile.age ? String(profile.age) : '');
        setGender((profile.gender as Gender | null) ?? null);
        setActivityLevel((profile.activity_level as ActivityLevel | null) ?? null);
        setGoal((profile.goal as HealthGoal | null) ?? null);
        setExperienceLevel((profile.experience_level as 'beginner' | 'intermediate' | 'advanced' | null) ?? null);
        setAvailableDaysPerWeek(typeof profile.available_days_per_week === 'number' ? String(profile.available_days_per_week) : '');
        setHasAppleWatch(profile.has_apple_watch);
        setIsProfilePublic(profile.is_profile_public ?? true);
        setWeeklyBudget(typeof profile.weekly_budget === 'number' ? String(profile.weekly_budget) : '');
        if (typeof profile.weight === 'number') {
            setWeight(weightUnit === 'kg' ? profile.weight.toFixed(1) : toLbs(profile.weight).toFixed(1));
        } else { setWeight(''); }
        if (typeof profile.height === 'number') {
            setHeightCm(profile.height.toFixed(1));
            const converted = cmToFeetInches(profile.height);
            setHeightFeet(String(converted.feet));
            setHeightInches(String(converted.inches));
        } else { setHeightCm(''); setHeightFeet(''); setHeightInches(''); }
    }, [profile, user?.email, weightUnit]);

    useEffect(() => { if (hasAppleWatch && !isHealthInitialized) void loadHealthData(); }, [hasAppleWatch, isHealthInitialized, loadHealthData]);

    useEffect(() => {
        let mounted = true;
        const loadAvatar = async () => {
            try { const stored = await SecureStore.getItemAsync(avatarStorageKey); if (mounted) setAvatarUri(stored ?? null); }
            catch { if (mounted) setAvatarUri(null); }
        };
        loadAvatar();
        return () => { mounted = false; };
    }, [avatarStorageKey]);

    useEffect(() => {
        Animated.timing(manualAnim, { toValue: hasAppleWatch ? 0 : 1, duration: 220, useNativeDriver: false }).start();
    }, [hasAppleWatch, manualAnim]);

    const manualAnimatedStyle = {
        opacity: manualAnim,
        maxHeight: manualAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 820] }),
        transform: [{ translateY: manualAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
        overflow: 'hidden' as const,
    };

    const saveProfileHandler = async () => {
        const parsedWeight = parseFloat(weight);
        const parsedAge = parseInt(age, 10);
        const parsedAvailableDays = parseInt(availableDaysPerWeek, 10);
        const weightKg = Number.isFinite(parsedWeight) ? (weightUnit === 'kg' ? parsedWeight : toKg(parsedWeight)) : null;
        let heightValueCm: number | null = null;
        if (heightUnit === 'cm') {
            const parsedCm = parseFloat(heightCm);
            heightValueCm = Number.isFinite(parsedCm) ? parsedCm : null;
        } else {
            const ft = parseFloat(heightFeet);
            const inch = parseFloat(heightInches);
            if (Number.isFinite(ft) || Number.isFinite(inch)) heightValueCm = feetInchesToCm(Number.isFinite(ft) ? ft : 0, Number.isFinite(inch) ? inch : 0);
        }
        try {
            await updateProfile({
                name: name.trim() || null, email: email.trim() || user?.email || null,
                weight: weightKg, height: heightValueCm, age: Number.isFinite(parsedAge) ? parsedAge : null,
                gender, activity_level: activityLevel, goal, has_apple_watch: hasAppleWatch,
                is_profile_public: isProfilePublic,
                experience_level: experienceLevel,
                available_days_per_week: Number.isFinite(parsedAvailableDays)
                    ? Math.min(7, Math.max(1, parsedAvailableDays))
                    : null,
                weekly_budget: weeklyBudget.trim() ? parseFloat(weeklyBudget) || null : null,
            });
            Alert.alert('Saved', 'Your profile has been updated.');
        } catch (error: any) { Alert.alert('Save failed', getApiErrorMessage(error, 'Could not save your profile.')); }
    };

    const submitManualDataHandler = async () => {
        const hr = parseFloat(heartRate); const sleep = parseFloat(sleepHours);
        const stepCount = parseInt(steps, 10); const parsedCalories = calories.trim() ? parseFloat(calories) : undefined;
        if (!Number.isFinite(hr) || !Number.isFinite(sleep) || !Number.isFinite(stepCount)) {
            Alert.alert('Missing fields', 'Please enter heart rate, sleep hours, and steps.'); return;
        }
        if (parsedCalories !== undefined && !Number.isFinite(parsedCalories)) {
            Alert.alert('Invalid calories', 'Please enter a valid calories value or leave it empty.'); return;
        }
        try {
            setSubmittingCheckin(true);
            const response = await submitTodayCheckin({ heart_rate: hr, sleep_hours: sleep, steps: stepCount, calories: parsedCalories, mood, stress_level: stress });
            Alert.alert('Check-in submitted', `Physical state score: ${response.physical_state_score}/100`);
        } catch (error: any) { Alert.alert('Submission failed', getApiErrorMessage(error, 'Could not submit daily data.')); }
        finally { setSubmittingCheckin(false); }
    };

    const agentItems = useMemo<AgentItem[]>(() => {
        const hasGoalConfig = Boolean(goal && activityLevel);
        const manualActive = !hasAppleWatch && todayCheckinSubmitted;
        const watchActive = hasAppleWatch && Boolean(healthData);
        const isActiveForState = manualActive || watchActive;
        const base: AgentItem[] = [
            { key: 'nutrition', title: 'Nutrition Agent', description: 'Open nutrition recommendations aligned with your profile and activity.', status: hasGoalConfig ? 'Active' : 'Not configured', onPress: () => router.push('/(tabs)/nutrition') },
            { key: 'mood', title: 'Mood Agent', description: 'View mood analysis and stress-recovery tips based on your check-ins.', status: isActiveForState ? 'Active' : 'Not configured', onPress: () => Alert.alert('Mood Agent', 'Mood analysis screen can be connected next.') },
            { key: 'fitness', title: 'Fitness Agent', description: 'Get workout recommendations from your physical state and activity data.', status: isActiveForState ? 'Active' : 'Not configured', onPress: () => Alert.alert('Fitness Agent', 'Workout recommendations screen can be connected next.') },
        ];
        if (hasAppleWatch) {
            base.push({ key: 'health-system', title: 'Health System', description: 'Upload your Apple Watch export ZIP to sync biometric health data.', status: healthData ? 'Active' : 'Not configured', onPress: () => router.push('/(tabs)/health-upload') });
        }
        return base;
    }, [goal, activityLevel, hasAppleWatch, todayCheckinSubmitted, healthData, router]);

    const setAvatarAndPersist = async (uri: string | null) => {
        setAvatarUri(uri);
        try { if (uri) await SecureStore.setItemAsync(avatarStorageKey, uri); else await SecureStore.deleteItemAsync(avatarStorageKey); }
        catch { Alert.alert('Avatar', 'Could not save avatar image locally.'); }
    };

    const pickAvatarFromGallery = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) { Alert.alert('Permission required', 'Please allow photo access to choose an avatar.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8, aspect: [1, 1] });
        if (!result.canceled && result.assets[0]?.uri) await setAvatarAndPersist(result.assets[0].uri);
    };

    const takeAvatarPhoto = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { Alert.alert('Permission required', 'Please allow camera access to take a profile photo.'); return; }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8, aspect: [1, 1] });
        if (!result.canceled && result.assets[0]?.uri) await setAvatarAndPersist(result.assets[0].uri);
    };

    const handleAvatarPress = () => {
        Alert.alert('Profile photo', 'Choose how you want to set your avatar.', [
            { text: 'Camera', onPress: () => void takeAvatarPhoto() },
            { text: 'Gallery', onPress: () => void pickAvatarFromGallery() },
            ...(avatarUri ? [{ text: 'Remove', style: 'destructive' as const, onPress: () => void setAvatarAndPersist(null) }] : []),
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.topRow}>
                    <Text style={styles.screenTitle}>Profile</Text>
                    <Image source={logoSource} style={styles.cornerLogo} />
                </View>

                {/* ── Avatar + name hero ── */}
                <View style={styles.heroRow}>
                    <Pressable onPress={handleAvatarPress} style={styles.avatarWrap}>
                        <Image source={logoSource} style={styles.avatarImage} />
                    </Pressable>
                    <View style={styles.heroTextCol}>
                        <Text style={styles.heroName}>{name || 'Your Name'}</Text>
                        <Text style={styles.heroEmail}>{email || user?.email || 'email@example.com'}</Text>
                    </View>
                </View>

                {/* ── Quick controls ── */}
                <View style={styles.quickControls}>
                    <Pressable style={styles.smallButton}>
                        <Text style={styles.smallButtonText}>Profile complete: {Math.round(profileCompletion)}%</Text>
                    </Pressable>
                    <View style={styles.visibilityWrap}>
                        <Text style={styles.visibilityLabel}>Profile visibility</Text>
                        <View style={styles.visibilityButtons}>
                            <Pressable
                                style={[styles.visibilityButton, !isProfilePublic && styles.visibilityButtonSelected]}
                                onPress={() => setIsProfilePublic(false)}
                            >
                                <Text style={[styles.visibilityButtonText, !isProfilePublic && styles.visibilityButtonTextSelected]}>Private</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.visibilityButton, isProfilePublic && styles.visibilityButtonSelected]}
                                onPress={() => setIsProfilePublic(true)}
                            >
                                <Text style={[styles.visibilityButtonText, isProfilePublic && styles.visibilityButtonTextSelected]}>Public</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>

                <SectionDivider />

                {/* ── Personal details ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal details</Text>
                    <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" />
                    <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@email.com" />

                    <View style={styles.rowGap}>
                        <Field label={`Weight (${weightUnit})`} value={weight} onChangeText={setWeight} placeholder="0" keyboardType="numeric" />
                        <View style={styles.unitRow}>
                            <Chip label="kg" selected={weightUnit === 'kg'} onPress={() => {
                                if (weight.trim()) { const parsed = parseFloat(weight); if (Number.isFinite(parsed)) setWeight(weightUnit === 'lbs' ? toKg(parsed).toFixed(1) : parsed.toFixed(1)); }
                                setWeightUnit('kg');
                            }} />
                            <Chip label="lbs" selected={weightUnit === 'lbs'} onPress={() => {
                                if (weight.trim()) { const parsed = parseFloat(weight); if (Number.isFinite(parsed)) setWeight(weightUnit === 'kg' ? toLbs(parsed).toFixed(1) : parsed.toFixed(1)); }
                                setWeightUnit('lbs');
                            }} />
                        </View>
                    </View>

                    <View style={styles.rowGap}>
                        {heightUnit === 'cm' ? (
                            <Field label="Height (cm)" value={heightCm} onChangeText={setHeightCm} placeholder="0" keyboardType="numeric" />
                        ) : (
                            <View style={styles.heightRow}>
                                <View style={{ flex: 1 }}><Field label="Height (ft)" value={heightFeet} onChangeText={setHeightFeet} placeholder="ft" keyboardType="numeric" /></View>
                                <View style={{ width: 8 }} />
                                <View style={{ flex: 1 }}><Field label="Height (in)" value={heightInches} onChangeText={setHeightInches} placeholder="in" keyboardType="numeric" /></View>
                            </View>
                        )}
                        <View style={styles.unitRow}>
                            <Chip label="cm" selected={heightUnit === 'cm'} onPress={() => {
                                const ft = parseFloat(heightFeet); const inch = parseFloat(heightInches);
                                if (Number.isFinite(ft) || Number.isFinite(inch)) setHeightCm(feetInchesToCm(Number.isFinite(ft) ? ft : 0, Number.isFinite(inch) ? inch : 0).toFixed(1));
                                setHeightUnit('cm');
                            }} />
                            <Chip label="ft/in" selected={heightUnit === 'ft/in'} onPress={() => {
                                const cm = parseFloat(heightCm);
                                if (Number.isFinite(cm)) { const converted = cmToFeetInches(cm); setHeightFeet(String(converted.feet)); setHeightInches(String(converted.inches)); }
                                setHeightUnit('ft/in');
                            }} />
                        </View>
                    </View>

                    <Field label="Age" value={age} onChangeText={setAge} placeholder="0" keyboardType="numeric" />

                    <View style={styles.field}>
                        <Text style={styles.label}>Gender</Text>
                        <View style={styles.chipWrap}>{genderOptions.map((item) => <Chip key={item} label={item} selected={gender === item} onPress={() => setGender(item)} />)}</View>
                    </View>
                    <View style={styles.field}>
                        <Text style={styles.label}>Activity level</Text>
                        <View style={styles.chipWrap}>{activityOptions.map((item) => <Chip key={item} label={item} selected={activityLevel === item} onPress={() => setActivityLevel(item)} />)}</View>
                    </View>
                    <View style={styles.field}>
                        <Text style={styles.label}>Health goal</Text>
                        <View style={styles.chipWrap}>{goalOptions.map((item) => <Chip key={item} label={item} selected={goal === item} onPress={() => setGoal(item)} />)}</View>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Workout experience</Text>
                        <View style={styles.chipWrap}>
                            {experienceOptions.map((item) => (
                                <Chip
                                    key={item}
                                    label={item}
                                    selected={experienceLevel === item}
                                    onPress={() => setExperienceLevel(item)}
                                />
                            ))}
                        </View>
                    </View>

                    <Field
                        label="Available workout days (1-7)"
                        value={availableDaysPerWeek}
                        onChangeText={setAvailableDaysPerWeek}
                        placeholder="e.g. 4"
                        keyboardType="numeric"
                    />

                    <Field label="Weekly food budget ($)" value={weeklyBudget} onChangeText={setWeeklyBudget} placeholder="e.g. 100" keyboardType="numeric" />

                    <View style={styles.toggleRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.toggleTitle}>I don't have Apple Watch</Text>
                            <Text style={styles.toggleSubtitle}>Enable manual mode to submit daily health data yourself.</Text>
                        </View>
                        <Switch value={!hasAppleWatch} onValueChange={(value) => setHasAppleWatch(!value)} thumbColor={theme.colors.green.primary} trackColor={{ false: theme.colors.ui.divider, true: 'rgba(57,255,136,0.25)' }} />
                    </View>

                    <NeonButton label={isSaving ? 'Saving...' : 'Save profile'} onPress={saveProfileHandler} disabled={isSaving || isLoading} loading={isSaving} />
                </View>

                <SectionDivider />

                {/* ── Manual check-in ── */}
                <Animated.View style={manualAnimatedStyle}>
                    {!hasAppleWatch ? (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Manual check-in</Text>
                            <View style={styles.twoColRow}>
                                <Field label="Heart rate" value={heartRate} onChangeText={setHeartRate} placeholder="bpm" keyboardType="numeric" />
                                <Field label="Sleep hours" value={sleepHours} onChangeText={setSleepHours} placeholder="hours" keyboardType="numeric" />
                            </View>
                            <View style={styles.twoColRow}>
                                <Field label="Steps" value={steps} onChangeText={setSteps} placeholder="steps" keyboardType="numeric" />
                                <Field label="Calories" value={calories} onChangeText={setCalories} placeholder="optional" keyboardType="numeric" />
                            </View>
                            <View style={styles.twoColRow}>
                                <Field label="Mood (1-5)" value={String(mood)} onChangeText={(value) => setMood(Number(value) || 0)} placeholder="1-5" keyboardType="numeric" />
                                <Field label="Stress (1-5)" value={String(stress)} onChangeText={(value) => setStress(Number(value) || 0)} placeholder="1-5" keyboardType="numeric" />
                            </View>
                            <NeonButton label={submittingCheckin ? 'Submitting...' : 'Submit check-in'} onPress={submitManualDataHandler} disabled={submittingCheckin} loading={submittingCheckin} />
                        </View>
                    ) : null}
                </Animated.View>

                {todayCheckinSubmitted && !hasAppleWatch ? <Text style={styles.checkinDone}>Today's check-in has been submitted.</Text> : null}

                <SectionDivider />

                {/* ── Agent access ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Agent access</Text>
                    {agentItems.map((agent) => (
                        <Pressable key={agent.key} style={styles.agentRow} onPress={agent.onPress}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.agentTitle}>{agent.title}</Text>
                                <Text style={styles.agentDescription}>{agent.description}</Text>
                            </View>
                            <Text style={[styles.agentStatus, agent.status === 'Active' ? styles.agentStatusActive : styles.agentStatusMuted]}>{agent.status}</Text>
                        </Pressable>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background.main },
    content: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 100, gap: 14 },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    screenTitle: { color: theme.colors.text.primary, fontSize: 34, fontWeight: '800', letterSpacing: 0.3, marginBottom: 2 },
    cornerLogo: { width: 44, height: 44, borderRadius: 12, ...theme.glow.subtle },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    avatarWrap: {
        width: 74, height: 74, borderRadius: 37,
        borderWidth: 2, borderColor: 'rgba(57,255,136,0.25)',
        backgroundColor: theme.colors.background.secondary,
        justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
        ...theme.glow.subtle,
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarInitial: { color: theme.colors.green.primary, fontSize: 30, fontWeight: '800' },
    heroTextCol: { flex: 1, gap: 2 },
    heroName: { color: theme.colors.text.primary, fontSize: 24, fontWeight: '800' },
    heroEmail: { color: theme.colors.text.muted, fontSize: 13 },
    quickControls: { gap: 10, marginTop: 4 },
    smallButton: {
        alignSelf: 'flex-start',
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.full,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    smallButtonText: { color: theme.colors.text.primary, fontSize: 12, fontWeight: '700' },
    visibilityWrap: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.lg,
        padding: 12,
        gap: 10,
    },
    visibilityLabel: { color: theme.colors.text.secondary, fontSize: 12, fontWeight: '600' },
    visibilityButtons: { flexDirection: 'row', gap: 8 },
    visibilityButton: {
        flex: 1,
        borderRadius: theme.radius.full,
        paddingVertical: 9,
        alignItems: 'center',
        backgroundColor: theme.colors.background.elevated,
    },
    visibilityButtonSelected: { backgroundColor: 'rgba(57,255,136,0.14)' },
    visibilityButtonText: { color: theme.colors.text.secondary, fontSize: 12, fontWeight: '700' },
    visibilityButtonTextSelected: { color: theme.colors.green.primary },
    divider: { height: 1, backgroundColor: theme.colors.ui.divider, marginVertical: 2 },
    section: { gap: 12 },
    sectionTitle: { color: theme.colors.green.primary, fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
    field: { gap: 6, flex: 1 },
    label: { color: theme.colors.text.secondary, fontSize: 12, fontWeight: '600' },
    input: {
        backgroundColor: theme.colors.background.elevated, borderRadius: theme.radius.sm,
        borderWidth: 1.5, borderColor: theme.colors.ui.divider,
        color: theme.colors.text.primary, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    },
    rowGap: { gap: 8 },
    twoColRow: { flexDirection: 'row', gap: 8 },
    unitRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.background.secondary,
        paddingHorizontal: 14, paddingVertical: 8,
    },
    chipSelected: { backgroundColor: 'rgba(57,255,136,0.14)' },
    chipText: { color: theme.colors.text.secondary, fontSize: 12, fontWeight: '600' },
    chipTextSelected: { color: theme.colors.green.primary },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    toggleTitle: { color: theme.colors.text.primary, fontSize: 14, fontWeight: '700' },
    toggleSubtitle: { color: theme.colors.text.muted, fontSize: 12, marginTop: 2 },
    heightRow: { flexDirection: 'row', alignItems: 'center' },
    checkinDone: { color: theme.colors.green.primary, fontSize: 12, fontWeight: '600' },
    agentRow: {
        flexDirection: 'row', gap: 10, alignItems: 'center',
        backgroundColor: theme.colors.background.secondary, borderRadius: theme.radius.lg,
        padding: 14,
    },
    agentTitle: { color: theme.colors.text.primary, fontSize: 15, fontWeight: '700' },
    agentDescription: { color: theme.colors.text.secondary, fontSize: 12, marginTop: 2, lineHeight: 17 },
    agentStatus: { fontSize: 12, fontWeight: '700' },
    agentStatusActive: { color: theme.colors.green.primary },
    agentStatusMuted: { color: theme.colors.text.muted },
});
