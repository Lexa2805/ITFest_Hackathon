/**
 * SquadsScreen — "My Squads" + "Discover" tabs.
 * My Squads shows squads the user belongs to.
 * Discover shows all squads with a Join button for ones the user isn't in.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { useSquadStore } from '@/stores/squadStore';
import { theme } from '@/constants/theme';
import type { Squad } from '@/services/squadApi';

type Tab = 'mine' | 'discover';

export default function SquadsScreen() {
  const {
    squads,
    discoverSquads,
    isLoading,
    error,
    fetchSquads,
    fetchDiscoverSquads,
    createSquad,
    joinSquad,
  } = useSquadStore();

  const [tab, setTab] = useState<Tab>('mine');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    fetchSquads();
    fetchDiscoverSquads();
  }, []);

  const handleCreate = useCallback(async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      await createSquad(trimmed);
      setNewName('');
      setShowCreate(false);
      fetchDiscoverSquads();
    } catch {
      // error is set in store
    } finally {
      setCreating(false);
    }
  }, [newName, createSquad, fetchDiscoverSquads]);

  const handleJoin = useCallback(async (roomId: string) => {
    setJoiningId(roomId);
    try {
      await joinSquad(roomId);
      Alert.alert('Joined', 'You are now a member of this squad.');
    } catch {
      // error is set in store
    } finally {
      setJoiningId(null);
    }
  }, [joinSquad]);

  // IDs of squads the user already belongs to
  const mySquadIds = new Set(squads.map((s) => s.id));

  const renderMySquad = useCallback(
    ({ item, index }: { item: Squad; index: number }) => (
      <Animated.View entering={FadeInDown.duration(400).delay(index * 60)}>
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => router.push(`/squad/${item.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`Open squad ${item.name}`}
        >
          <View style={styles.cardTop}>
            <Text style={styles.squadName} numberOfLines={1}>{item.name}</Text>
            {item.avg_life_score_grade && (
              <View style={styles.gradeBadge}>
                <Text style={styles.gradeText}>{item.avg_life_score_grade}</Text>
              </View>
            )}
          </View>
          <View style={styles.cardBottom}>
            <Ionicons name="people" size={14} color={theme.colors.text.muted} />
            <Text style={styles.memberCount}>
              {item.member_count} {item.member_count === 1 ? 'member' : 'members'}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    ),
    [],
  );

  const renderDiscoverSquad = useCallback(
    ({ item, index }: { item: Squad; index: number }) => {
      const isMember = mySquadIds.has(item.id);
      const isJoining = joiningId === item.id;
      return (
        <Animated.View entering={FadeInDown.duration(400).delay(index * 60)}>
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.squadName} numberOfLines={1}>{item.name}</Text>
              {item.avg_life_score_grade && (
                <View style={styles.gradeBadge}>
                  <Text style={styles.gradeText}>{item.avg_life_score_grade}</Text>
                </View>
              )}
            </View>
            <View style={styles.cardBottom}>
              <Ionicons name="people" size={14} color={theme.colors.text.muted} />
              <Text style={styles.memberCount}>
                {item.member_count} {item.member_count === 1 ? 'member' : 'members'}
              </Text>
              <View style={{ flex: 1 }} />
              {isMember ? (
                <Pressable
                  style={styles.joinedBtn}
                  onPress={() => router.push(`/squad/${item.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel="Open squad"
                >
                  <Text style={styles.joinedText}>Open</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.joinBtn, isJoining && styles.joinBtnDisabled]}
                  onPress={() => handleJoin(item.id)}
                  disabled={isJoining}
                  accessibilityRole="button"
                  accessibilityLabel={`Join squad ${item.name}`}
                >
                  {isJoining ? (
                    <ActivityIndicator size="small" color={theme.colors.background.main} />
                  ) : (
                    <Text style={styles.joinText}>Join</Text>
                  )}
                </Pressable>
              )}
            </View>
          </View>
        </Animated.View>
      );
    },
    [mySquadIds, joiningId, handleJoin],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Tab toggle */}
      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabBtn, tab === 'mine' && styles.tabBtnActive]}
          onPress={() => setTab('mine')}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'mine' }}
        >
          <Text style={[styles.tabLabel, tab === 'mine' && styles.tabLabelActive]}>My Squads</Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, tab === 'discover' && styles.tabBtnActive]}
          onPress={() => setTab('discover')}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'discover' }}
        >
          <Text style={[styles.tabLabel, tab === 'discover' && styles.tabLabelActive]}>Discover</Text>
        </Pressable>
      </View>

      {tab === 'mine' ? (
        <FlatList
          data={squads}
          keyExtractor={(s) => s.id}
          renderItem={renderMySquad}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            showCreate ? (
              <View style={styles.createRow}>
                <TextInput
                  style={styles.createInput}
                  placeholder="Squad name…"
                  placeholderTextColor={theme.colors.text.muted}
                  value={newName}
                  onChangeText={setNewName}
                  maxLength={100}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleCreate}
                  accessibilityLabel="Squad name input"
                />
                <Pressable
                  style={[styles.createBtn, (!newName.trim() || creating) && styles.createBtnDisabled]}
                  onPress={handleCreate}
                  disabled={!newName.trim() || creating}
                  accessibilityRole="button"
                  accessibilityLabel="Create squad"
                >
                  {creating ? (
                    <ActivityIndicator size="small" color={theme.colors.background.main} />
                  ) : (
                    <Ionicons name="checkmark" size={20} color={theme.colors.background.main} />
                  )}
                </Pressable>
                <Pressable
                  onPress={() => { setShowCreate(false); setNewName(''); }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel create squad"
                >
                  <Ionicons name="close" size={20} color={theme.colors.text.muted} />
                </Pressable>
              </View>
            ) : null
          }
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator size="large" color={theme.colors.green.primary} style={styles.loader} />
            ) : (
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={48} color={theme.colors.text.muted} />
                <Text style={styles.emptyText}>No squads yet</Text>
                <Text style={styles.emptyHint}>Create one or discover existing squads</Text>
              </View>
            )
          }
        />
      ) : (
        <FlatList
          data={discoverSquads}
          keyExtractor={(s) => s.id}
          renderItem={renderDiscoverSquad}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator size="large" color={theme.colors.green.primary} style={styles.loader} />
            ) : (
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={48} color={theme.colors.text.muted} />
                <Text style={styles.emptyText}>No squads found</Text>
                <Text style={styles.emptyHint}>Be the first to create one</Text>
              </View>
            )
          }
        />
      )}

      {!showCreate && tab === 'mine' && (
        <Pressable
          style={styles.fab}
          onPress={() => setShowCreate(true)}
          accessibilityRole="button"
          accessibilityLabel="Create a new squad"
        >
          <Ionicons name="add" size={28} color={theme.colors.background.main} />
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background.main },
  list: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 100, gap: 12 },
  loader: { marginTop: 60 },

  /* Tabs */
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 18,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.md,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
  },
  tabBtnActive: { backgroundColor: theme.colors.green.primary },
  tabLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.text.muted },
  tabLabelActive: { color: theme.colors.background.main },

  /* Error */
  errorBanner: { backgroundColor: 'rgba(255,82,82,0.15)', paddingHorizontal: 18, paddingVertical: 10 },
  errorText: { color: theme.colors.error, fontSize: 13, fontWeight: '600' },

  /* Card */
  card: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: 10,
  },
  cardPressed: { opacity: 0.8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  squadName: { fontSize: 17, fontWeight: '700', color: theme.colors.text.primary, flex: 1, marginRight: 8 },
  gradeBadge: {
    backgroundColor: 'rgba(57,255,136,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  gradeText: { fontSize: 13, fontWeight: '800', color: theme.colors.green.primary },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberCount: { fontSize: 13, fontWeight: '500', color: theme.colors.text.muted },

  /* Join / Open buttons */
  joinBtn: {
    backgroundColor: theme.colors.green.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
  },
  joinBtnDisabled: { opacity: 0.4 },
  joinText: { fontSize: 13, fontWeight: '700', color: theme.colors.background.main },
  joinedBtn: {
    borderWidth: 1,
    borderColor: theme.colors.green.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
  },
  joinedText: { fontSize: 13, fontWeight: '700', color: theme.colors.green.primary },

  /* Create row */
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.lg,
    padding: 12,
  },
  createInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background.elevated,
    borderRadius: theme.radius.sm,
  },
  createBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.green.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  createBtnDisabled: { opacity: 0.4 },

  /* Empty */
  empty: { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyText: { fontSize: 17, fontWeight: '700', color: theme.colors.text.secondary },
  emptyHint: { fontSize: 13, color: theme.colors.text.muted },

  /* FAB */
  fab: {
    position: 'absolute', right: 20, bottom: 88,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.colors.green.primary,
    alignItems: 'center', justifyContent: 'center',
    ...theme.glow.primary,
  },
});
