import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { apiGet } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type Stats = {
  totalOrders: number;
  totalRevenue: number;
  totalRestaurants: number;
  totalUsers: number;
  pendingOrders: number;
  todayOrders: number;
  todayRevenue: number;
};

function StatCard({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>
        <Feather name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiGet('/admin/stats');
      setStats(data);
    } catch (e) {
      console.log('Failed to fetch stats', e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchStats(); }, [fetchStats]));

  const paddingTop = Math.max(insets.top, Platform.OS === 'web' ? 67 : 0) + 16;

  if (user?.role !== 'admin') {
    return (
      <View style={[styles.container, styles.center, { paddingTop }]}>
        <Feather name="lock" size={56} color={Colors.border} />
        <Text style={styles.emptyTitle}>Admin Access Required</Text>
        <Text style={styles.emptyText}>You don't have permission to view this page.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop }]}>
      <Text style={styles.headerTitle}>Admin Dashboard</Text>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor={Colors.primary} />
        }
      >
        {stats && (
          <>
            <Text style={styles.sectionTitle}>Today's Overview</Text>
            <View style={styles.statsGrid}>
              <StatCard icon="shopping-bag" label="Today's Orders" value={String(stats.todayOrders)} color="#FF3008" />
              <StatCard icon="dollar-sign" label="Today's Revenue" value={`$${stats.todayRevenue.toFixed(2)}`} color="#10B981" />
            </View>

            <Text style={styles.sectionTitle}>All Time</Text>
            <View style={styles.statsGrid}>
              <StatCard icon="file-text" label="Total Orders" value={String(stats.totalOrders)} sub={`${stats.pendingOrders} pending`} color="#6366F1" />
              <StatCard icon="trending-up" label="Total Revenue" value={`$${stats.totalRevenue.toFixed(2)}`} color="#F59E0B" />
              <StatCard icon="map-pin" label="Restaurants" value={String(stats.totalRestaurants)} color="#EC4899" />
              <StatCard icon="users" label="Customers" value={String(stats.totalUsers)} color="#14B8A6" />
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Management</Text>
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/admin/orders')}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#FFF0EE' }]}>
                <Feather name="list" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.menuTitle}>Orders</Text>
                <Text style={styles.menuSub}>View and manage all orders</Text>
              </View>
            </View>
            <View style={styles.menuRight}>
              {stats && stats.pendingOrders > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{stats.pendingOrders}</Text>
                </View>
              )}
              <Feather name="chevron-right" size={20} color={Colors.muted} />
            </View>
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/admin/restaurants')}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#F0FDF4' }]}>
                <Feather name="map-pin" size={20} color="#16A34A" />
              </View>
              <View>
                <Text style={styles.menuTitle}>Restaurants</Text>
                <Text style={styles.menuSub}>Add and manage restaurants</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color={Colors.muted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontFamily: 'Inter_700Bold', fontSize: 28, color: Colors.text,
    paddingHorizontal: 20, paddingBottom: 16,
  },
  scrollContent: { paddingHorizontal: 20 },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8,
  },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: Colors.background,
    borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 22, color: Colors.text },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.muted, marginTop: 2 },
  statSub: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.primary, marginTop: 4 },
  menuSection: {
    backgroundColor: Colors.background, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: Colors.text },
  menuSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.muted, marginTop: 2 },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  separator: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },
  badge: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#fff' },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 20, color: Colors.text, marginTop: 16 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.muted, marginTop: 8, textAlign: 'center' },
});
