import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { apiGet } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type Order = {
  id: string;
  restaurantName: string;
  status: string;
  totalAmount: number;
  deliveryFee: number;
  deliveryAddress: string;
  createdAt: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:    { label: 'Pending',    color: '#B45309', bg: '#FEF3C7', icon: 'clock' },
  confirmed:  { label: 'Confirmed',  color: '#1D4ED8', bg: '#DBEAFE', icon: 'check-circle' },
  preparing:  { label: 'Preparing',  color: '#7C3AED', bg: '#EDE9FE', icon: 'coffee' },
  delivering: { label: 'On the way', color: '#0369A1', bg: '#E0F2FE', icon: 'navigation' },
  delivered:  { label: 'Delivered',  color: '#15803D', bg: '#DCFCE7', icon: 'check-circle' },
  cancelled:  { label: 'Cancelled',  color: '#B91C1C', bg: '#FEE2E2', icon: 'x-circle' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: Colors.muted, bg: Colors.border, icon: 'circle' };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Feather name={cfg.icon as any} size={12} color={cfg.color} />
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function OrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  const date = new Date(order.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const time = new Date(order.createdAt).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.restaurantRow}>
          <View style={styles.restaurantIcon}>
            <Feather name="shopping-bag" size={18} color={Colors.primary} />
          </View>
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName} numberOfLines={1}>{order.restaurantName}</Text>
            <Text style={styles.orderDate}>{date} at {time}</Text>
          </View>
        </View>
        <StatusBadge status={order.status} />
      </View>
      <View style={styles.divider} />
      <View style={styles.cardFooter}>
        <Text style={styles.orderId}>#{order.id.slice(-8).toUpperCase()}</Text>
        <Text style={styles.total}>${order.totalAmount.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiGet('/orders', { 'x-user-id': token });
      setOrders(data);
    } catch (e) {
      console.log('Failed to fetch orders', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchOrders();
  }, [fetchOrders]));

  const paddingTop = Math.max(insets.top, Platform.OS === 'web' ? 67 : 0) + 16;

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop }]}>
        <Text style={styles.headerTitle}>Orders</Text>
        <View style={styles.emptyState}>
          <Feather name="log-in" size={56} color={Colors.border} />
          <Text style={styles.emptyTitle}>Sign in to view orders</Text>
          <Text style={styles.emptyText}>Track your current and past orders</Text>
          <TouchableOpacity style={styles.authBtn} onPress={() => router.push('/auth')}>
            <Text style={styles.authBtnText}>Sign in / Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop }]}>
        <Text style={styles.headerTitle}>Orders</Text>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop }]}>
      <Text style={styles.headerTitle}>My Orders</Text>
      <FlatList
        data={orders}
        keyExtractor={o => o.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} tintColor={Colors.primary} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Feather name="shopping-bag" size={56} color={Colors.border} />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptyText}>Your order history will appear here</Text>
            <TouchableOpacity style={styles.authBtn} onPress={() => router.replace('/(tabs)')}>
              <Text style={styles.authBtnText}>Browse Restaurants</Text>
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }) => (
          <OrderCard order={item} onPress={() => router.push(`/order/${item.id}`)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: Colors.text,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  restaurantRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  restaurantIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#FFF0EE',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  restaurantInfo: { flex: 1 },
  restaurantName: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text },
  orderDate: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.muted, marginTop: 2 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  badgeText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.muted },
  total: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 20, color: Colors.text, marginTop: 16 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.muted, marginTop: 8, textAlign: 'center' },
  authBtn: {
    marginTop: 24, backgroundColor: Colors.primary,
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14,
  },
  authBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#fff' },
});
