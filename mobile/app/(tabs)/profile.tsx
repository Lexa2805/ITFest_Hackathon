import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Image,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
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

const C = {
    bg: '#0D0D14',
    text: '#F7F4EF',
    body: '#C8C1B6',
    muted: '#8F8779',
    amber: '#F2A65A',
    border: 'rgba(247,244,239,0.14)',
    card: '#13121C',
} as const;

const activityOptions: ActivityLevel[] = ['sedentary', 'lightly active', 'moderately active', 'very active'];
const goalOptions: HealthGoal[] = ['lose weight', 'maintain', 'build muscle', 'improve endurance'];
const genderOptions: Gender[] = ['male', 'female', 'non-binary', 'prefer not to say', 'other'];

function toLbs(kg: number): number {
    return kg * 2.20462;
}

function toKg(lbs: number): number {
    return lbs / 2.20462;
}

function cmToFeetInches(cm: number): { feet: number; inches: number } {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches - feet * 12);
    return { feet, inches };
}

function feetInchesToCm(feet: number, inches: number): number {
    return feet * 30.48 + inches * 2.54;
}

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

function Field({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType,
}: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    placeholder: string;
    keyboardType?: 'default' | 'numeric';
}) {
    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={C.muted}
                keyboardType={keyboardType}
            />
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

    const {
        profile,
        isLoading,
        isSaving,
        profileCompletion,
        todayCheckinSubmitted,
        updateProfile,
        submitTodayCheckin,
    } = useProfileContext();

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
    const [hasAppleWatch, setHasAppleWatch] = useState(true);
    const [avatarUri, setAvatarUri] = useState<string | null>(null);

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
        setHasAppleWatch(profile.has_apple_watch);

        if (typeof profile.weight === 'number') {
            setWeight(weightUnit === 'kg' ? profile.weight.toFixed(1) : toLbs(profile.weight).toFixed(1));
        } else {
            setWeight('');
        }

        if (typeof profile.height === 'number') {
            setHeightCm(profile.height.toFixed(1));
            const converted = cmToFeetInches(profile.height);
            setHeightFeet(String(converted.feet));
            setHeightInches(String(converted.inches));
        } else {
            setHeightCm('');
            setHeightFeet('');
            setHeightInches('');
        }
    }, [profile, user?.email, weightUnit]);

    useEffect(() => {
        if (hasAppleWatch && !isHealthInitialized) {
            void loadHealthData();
        }
    }, [hasAppleWatch, isHealthInitialized, loadHealthData]);

    useEffect(() => {
        let mounted = true;
        const loadAvatar = async () => {
            try {
                const stored = await SecureStore.getItemAsync(avatarStorageKey);
                if (mounted) setAvatarUri(stored ?? null);
            } catch {
                if (mounted) setAvatarUri(null);
            }
        };

        loadAvatar();

        return () => {
            mounted = false;
        };
    }, [avatarStorageKey]);

    useEffect(() => {
        Animated.timing(manualAnim, {
            toValue: hasAppleWatch ? 0 : 1,
            duration: 220,
            useNativeDriver: false,
        }).start();
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

        const weightKg = Number.isFinite(parsedWeight) ? (weightUnit === 'kg' ? parsedWeight : toKg(parsedWeight)) : null;

        let heightValueCm: number | null = null;
        if (heightUnit === 'cm') {
            const parsedCm = parseFloat(heightCm);
            heightValueCm = Number.isFinite(parsedCm) ? parsedCm : null;
        } else {
            const ft = parseFloat(heightFeet);
            const inch = parseFloat(heightInches);
            if (Number.isFinite(ft) || Number.isFinite(inch)) {
                heightValueCm = feetInchesToCm(Number.isFinite(ft) ? ft : 0, Number.isFinite(inch) ? inch : 0);
            }
        }

        try {
            await updateProfile({
                name: name.trim() || null,
                email: email.trim() || user?.email || null,
                weight: weightKg,
                height: heightValueCm,
                age: Number.isFinite(parsedAge) ? parsedAge : null,
                gender,
                activity_level: activityLevel,
                goal,
                has_apple_watch: hasAppleWatch,
            });
            Alert.alert('Saved', 'Your profile has been updated.');
        } catch (error: any) {
            Alert.alert('Save failed', getApiErrorMessage(error, 'Could not save your profile.'));
        }
    };

    const submitManualDataHandler = async () => {
        const hr = parseFloat(heartRate);
        const sleep = parseFloat(sleepHours);
        const stepCount = parseInt(steps, 10);
        const parsedCalories = calories.trim() ? parseFloat(calories) : undefined;

        if (!Number.isFinite(hr) || !Number.isFinite(sleep) || !Number.isFinite(stepCount)) {
            Alert.alert('Missing fields', 'Please enter heart rate, sleep hours, and steps.');
            return;
        }

        if (parsedCalories !== undefined && !Number.isFinite(parsedCalories)) {
            Alert.alert('Invalid calories', 'Please enter a valid calories value or leave it empty.');
            return;
        }

        try {
            setSubmittingCheckin(true);
            const response = await submitTodayCheckin({
                heart_rate: hr,
                sleep_hours: sleep,
                steps: stepCount,
                calories: parsedCalories,
                mood,
                stress_level: stress,
            });

            Alert.alert('Check-in submitted', `Physical state score: ${response.physical_state_score}/100`);
        } catch (error: any) {
            Alert.alert('Submission failed', getApiErrorMessage(error, 'Could not submit daily data.'));
        } finally {
            setSubmittingCheckin(false);
        }
    };

    const agentItems = useMemo<AgentItem[]>(() => {
        const hasGoalConfig = Boolean(goal && activityLevel);
        const manualActive = !hasAppleWatch && todayCheckinSubmitted;
        const watchActive = hasAppleWatch && Boolean(healthData);
        const isActiveForState = manualActive || watchActive;

        const base: AgentItem[] = [
            {
                key: 'nutrition',
                title: 'Nutrition Agent',
                description: 'Open nutrition recommendations aligned with your profile and activity.',
                status: hasGoalConfig ? 'Active' : 'Not configured',
                onPress: () => router.push('/(tabs)/nutrition'),
            },
            {
                key: 'mood',
                title: 'Mood Agent',
                description: 'View mood analysis and stress-recovery tips based on your check-ins.',
                status: isActiveForState ? 'Active' : 'Not configured',
                onPress: () => Alert.alert('Mood Agent', 'Mood analysis screen can be connected next.'),
            },
            {
                key: 'fitness',
                title: 'Fitness Agent',
                description: 'Get workout recommendations from your physical state and activity data.',
                status: isActiveForState ? 'Active' : 'Not configured',
                onPress: () => Alert.alert('Fitness Agent', 'Workout recommendations screen can be connected next.'),
            },
        ];

        if (hasAppleWatch) {
            base.push({
                key: 'health-system',
                title: 'Health System',
                description: 'Upload your Apple Watch export ZIP to sync biometric health data.',
                status: healthData ? 'Active' : 'Not configured',
                onPress: () => router.push('/(tabs)/health-upload'),
            });
        }

        return base;
    }, [goal, activityLevel, hasAppleWatch, todayCheckinSubmitted, healthData, router]);

    const setAvatarAndPersist = async (uri: string | null) => {
        setAvatarUri(uri);
        try {
            if (uri) {
                await SecureStore.setItemAsync(avatarStorageKey, uri);
            } else {
                await SecureStore.deleteItemAsync(avatarStorageKey);
            }
        } catch {
            Alert.alert('Avatar', 'Could not save avatar image locally.');
        }
    };

    const pickAvatarFromGallery = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission required', 'Please allow photo access to choose an avatar.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
            aspect: [1, 1],
        });

        if (!result.canceled && result.assets[0]?.uri) {
            await setAvatarAndPersist(result.assets[0].uri);
        }
    };

    const takeAvatarPhoto = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission required', 'Please allow camera access to take a profile photo.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
            aspect: [1, 1],
        });

        if (!result.canceled && result.assets[0]?.uri) {
            await setAvatarAndPersist(result.assets[0].uri);
        }
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
                <Text style={styles.screenTitle}>Profile</Text>

                <View style={styles.heroRow}>
                    <Pressable onPress={handleAvatarPress} style={styles.avatarWrap}>
                        {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatarImage} /> : <Text style={styles.avatarInitial}>{(name || user?.email || 'U').charAt(0).toUpperCase()}</Text>}
                    </Pressable>
                    <View style={styles.heroTextCol}>
                        <Text style={styles.heroName}>{name || 'Your Name'}</Text>
                        <Text style={styles.heroEmail}>{email || user?.email || 'email@example.com'}</Text>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{Math.round(profileCompletion)}%</Text>
                        <Text style={styles.statLabel}>Profile complete</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{todayCheckinSubmitted ? '1' : '0'}</Text>
                        <Text style={styles.statLabel}>Check-in today</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{hasAppleWatch ? 'Auto' : 'Manual'}</Text>
                        <Text style={styles.statLabel}>Data mode</Text>
                    </View>
                </View>

                <SectionDivider />

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal details</Text>
                    <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" />
                    <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@email.com" />

                    <View style={styles.rowGap}>
                        <Field label={`Weight (${weightUnit})`} value={weight} onChangeText={setWeight} placeholder="0" keyboardType="numeric" />
                        <View style={styles.unitRow}>
                            <Chip
                                label="kg"
                                selected={weightUnit === 'kg'}
                                onPress={() => {
                                    if (weight.trim()) {
                                        const parsed = parseFloat(weight);
                                        if (Number.isFinite(parsed)) {
                                            setWeight(weightUnit === 'lbs' ? toKg(parsed).toFixed(1) : parsed.toFixed(1));
                                        }
                                    }
                                    setWeightUnit('kg');
                                }}
                            />
                            <Chip
                                label="lbs"
                                selected={weightUnit === 'lbs'}
                                onPress={() => {
                                    if (weight.trim()) {
                                        const parsed = parseFloat(weight);
                                        if (Number.isFinite(parsed)) {
                                            setWeight(weightUnit === 'kg' ? toLbs(parsed).toFixed(1) : parsed.toFixed(1));
                                        }
                                    }
                                    setWeightUnit('lbs');
                                }}
                            />
                        </View>
                    </View>

                    <View style={styles.rowGap}>
                        {heightUnit === 'cm' ? (
                            <Field label="Height (cm)" value={heightCm} onChangeText={setHeightCm} placeholder="0" keyboardType="numeric" />
                        ) : (
                            <View style={styles.heightRow}>
                                <View style={{ flex: 1 }}>
                                    <Field label="Height (ft)" value={heightFeet} onChangeText={setHeightFeet} placeholder="ft" keyboardType="numeric" />
                                </View>
                                <View style={{ width: 8 }} />
                                <View style={{ flex: 1 }}>
                                    <Field label="Height (in)" value={heightInches} onChangeText={setHeightInches} placeholder="in" keyboardType="numeric" />
                                </View>
                            </View>
                        )}

                        <View style={styles.unitRow}>
                            <Chip
                                label="cm"
                                selected={heightUnit === 'cm'}
                                onPress={() => {
                                    const ft = parseFloat(heightFeet);
                                    const inch = parseFloat(heightInches);
                                    if (Number.isFinite(ft) || Number.isFinite(inch)) {
                                        setHeightCm(feetInchesToCm(Number.isFinite(ft) ? ft : 0, Number.isFinite(inch) ? inch : 0).toFixed(1));
                                    }
                                    setHeightUnit('cm');
                                }}
                            />
                            <Chip
                                label="ft/in"
                                selected={heightUnit === 'ft/in'}
                                onPress={() => {
                                    const cm = parseFloat(heightCm);
                                    if (Number.isFinite(cm)) {
                                        const converted = cmToFeetInches(cm);
                                        setHeightFeet(String(converted.feet));
                                        setHeightInches(String(converted.inches));
                                    }
                                    setHeightUnit('ft/in');
                                }}
                            />
                        </View>
                    </View>

                    <Field label="Age" value={age} onChangeText={setAge} placeholder="0" keyboardType="numeric" />

                    <View style={styles.field}>
                        <Text style={styles.label}>Gender</Text>
                        <View style={styles.chipWrap}>
                            {genderOptions.map((item) => (
                                <Chip key={item} label={item} selected={gender === item} onPress={() => setGender(item)} />
                            ))}
                        </View>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Activity level</Text>
                        <View style={styles.chipWrap}>
                            {activityOptions.map((item) => (
                                <Chip key={item} label={item} selected={activityLevel === item} onPress={() => setActivityLevel(item)} />
                            ))}
                        </View>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Health goal</Text>
                        <View style={styles.chipWrap}>
                            {goalOptions.map((item) => (
                                <Chip key={item} label={item} selected={goal === item} onPress={() => setGoal(item)} />
                            ))}
                        </View>
                    </View>

                    <View style={styles.toggleRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.toggleTitle}>I don’t have Apple Watch</Text>
                            <Text style={styles.toggleSubtitle}>Enable manual mode to submit daily health data yourself.</Text>
                        </View>
                        <Switch
                            value={!hasAppleWatch}
                            onValueChange={(value) => setHasAppleWatch(!value)}
                            thumbColor={C.amber}
                            trackColor={{ false: '#2D2D2D', true: '#4F3A1F' }}
                        />
                    </View>

                    <Pressable style={styles.saveButton} onPress={saveProfileHandler} disabled={isSaving || isLoading}>
                        <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save profile'}</Text>
                    </Pressable>
                </View>

                <SectionDivider />

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
                            <Pressable style={styles.saveButton} onPress={submitManualDataHandler} disabled={submittingCheckin}>
                                <Text style={styles.saveButtonText}>{submittingCheckin ? 'Submitting...' : 'Submit check-in'}</Text>
                            </Pressable>
                        </View>
                    ) : null}
                </Animated.View>

                {todayCheckinSubmitted && !hasAppleWatch ? <Text style={styles.checkinDone}>Today’s check-in has been submitted.</Text> : null}

                <SectionDivider />

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
    safeArea: {
        flex: 1,
        backgroundColor: C.bg,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 30,
        gap: 12,
    },
    screenTitle: {
        color: C.text,
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 2,
    },
    heroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarWrap: {
        width: 74,
        height: 74,
        borderRadius: 37,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.card,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarInitial: {
        color: C.amber,
        fontSize: 30,
        fontWeight: '800',
    },
    heroTextCol: {
        flex: 1,
        gap: 2,
    },
    heroName: {
        color: C.text,
        fontSize: 24,
        fontWeight: '800',
    },
    heroEmail: {
        color: C.body,
        fontSize: 13,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 2,
    },
    statItem: {
        flex: 1,
        paddingVertical: 6,
    },
    statValue: {
        color: C.text,
        fontSize: 30,
        fontWeight: '900',
        lineHeight: 34,
    },
    statLabel: {
        color: C.muted,
        fontSize: 11,
        fontWeight: '600',
        marginTop: 1,
    },
    divider: {
        height: 1,
        backgroundColor: C.border,
        marginVertical: 2,
    },
    section: {
        gap: 10,
    },
    sectionTitle: {
        color: C.amber,
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 1,
    },
    field: {
        gap: 6,
        flex: 1,
    },
    label: {
        color: C.body,
        fontSize: 12,
        fontWeight: '600',
    },
    input: {
        backgroundColor: C.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.border,
        color: C.text,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
    },
    rowGap: {
        gap: 8,
    },
    twoColRow: {
        flexDirection: 'row',
        gap: 8,
    },
    unitRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    chipWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.card,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    chipSelected: {
        borderColor: 'rgba(242,166,90,0.5)',
        backgroundColor: 'rgba(242,166,90,0.14)',
    },
    chipText: {
        color: C.body,
        fontSize: 12,
        fontWeight: '600',
    },
    chipTextSelected: {
        color: C.amber,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    toggleTitle: {
        color: C.text,
        fontSize: 14,
        fontWeight: '700',
    },
    toggleSubtitle: {
        color: C.muted,
        fontSize: 12,
        marginTop: 2,
    },
    saveButton: {
        marginTop: 4,
        backgroundColor: C.amber,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 42,
    },
    saveButtonText: {
        color: '#2E1B06',
        fontSize: 14,
        fontWeight: '800',
    },
    heightRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkinDone: {
        color: C.amber,
        fontSize: 12,
        fontWeight: '600',
    },
    agentRow: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: C.border,
        paddingBottom: 12,
        marginBottom: 2,
    },
    agentTitle: {
        color: C.text,
        fontSize: 15,
        fontWeight: '700',
    },
    agentDescription: {
        color: C.body,
        fontSize: 12,
        marginTop: 2,
        lineHeight: 17,
    },
    agentStatus: {
        fontSize: 12,
        fontWeight: '700',
    },
    agentStatusActive: {
        color: C.amber,
    },
    agentStatusMuted: {
        color: C.muted,
    },
});