import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { apiGet, apiPatch } from '../lib/api';

type OrderItem = { name: string; quantity: number; unitPrice: number };
type AdminOrder = {
  id: string;
  restaurantName: string;
  userName: string;
  userEmail: string;
  status: string;
  totalAmount: number;
  deliveryFee: number;
  deliveryAddress: string;
  createdAt: string;
  items: OrderItem[];
};

const STATUSES = ['all', 'pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled'];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Pending',    color: '#B45309', bg: '#FEF3C7' },
  confirmed:  { label: 'Confirmed',  color: '#1D4ED8', bg: '#DBEAFE' },
  preparing:  { label: 'Preparing',  color: '#7C3AED', bg: '#EDE9FE' },
  delivering: { label: 'On the way', color: '#0369A1', bg: '#E0F2FE' },
  delivered:  { label: 'Delivered',  color: '#15803D', bg: '#DCFCE7' },
  cancelled:  { label: 'Cancelled',  color: '#B91C1C', bg: '#FEE2E2' },
};

const NEXT_STATUS: Record<string, string | null> = {
  pending:    'confirmed',
  confirmed:  'preparing',
  preparing:  'delivering',
  delivering: 'delivered',
  delivered:  null,
  cancelled:  null,
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: Colors.muted, bg: Colors.border };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

export default function AdminOrdersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const query = filter !== 'all' ? `?status=${filter}` : '';
      const data = await apiGet(`/admin/orders${query}`);
      setOrders(data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchOrders();
  }, [fetchOrders]));

  const handleAdvanceStatus = async (order: AdminOrder) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    Alert.alert(
      'Update Order Status',
      `Mark order as "${STATUS_CONFIG[next]?.label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setUpdating(order.id);
            try {
              await apiPatch(`/orders/${order.id}/status`, { status: next });
              await fetchOrders();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setUpdating(null);
            }
          },
        },
      ]
    );
  };

  const handleCancel = async (order: AdminOrder) => {
    if (order.status === 'cancelled' || order.status === 'delivered') return;
    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Order', style: 'destructive',
        onPress: async () => {
          setUpdating(order.id);
          try {
            await apiPatch(`/orders/${order.id}/status`, { status: 'cancelled' });
            await fetchOrders();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          } finally {
            setUpdating(null);
          }
        },
      },
    ]);
  };

  const paddingTop = Math.max(insets.top, Platform.OS === 'web' ? 67 : 0) + 12;

  const renderOrder = ({ item }: { item: AdminOrder }) => {
    const next = NEXT_STATUS[item.status];
    const isUpdating = updating === item.id;
    const date = new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const time = new Date(item.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.orderIdText}>#{item.id.slice(-8).toUpperCase()}</Text>
            <Text style={styles.dateText}>{date} {time}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={14} color={Colors.muted} />
            <Text style={styles.infoText} numberOfLines={1}>{item.restaurantName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="user" size={14} color={Colors.muted} />
            <Text style={styles.infoText}>{item.userName} · {item.userEmail}</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="home" size={14} color={Colors.muted} />
            <Text style={styles.infoText} numberOfLines={1}>{item.deliveryAddress}</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="shopping-bag" size={14} color={Colors.muted} />
            <Text style={styles.infoText}>
              {item.items.map(i => `${i.name} x${i.quantity}`).join(', ')}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.totalText}>${item.totalAmount.toFixed(2)}</Text>
          <View style={styles.actionRow}>
            {next && (
              <TouchableOpacity
                style={[styles.advanceBtn, isUpdating && styles.btnDisabled]}
                onPress={() => handleAdvanceStatus(item)}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="arrow-right" size={14} color="#fff" />
                    <Text style={styles.advanceBtnText}>{STATUS_CONFIG[next]?.label}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {item.status !== 'cancelled' && item.status !== 'delivered' && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => handleCancel(item)}
                disabled={isUpdating}
              >
                <Feather name="x" size={14} color="#B91C1C" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>All Orders</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        ListHeaderComponent={() => (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={STATUSES}
            keyExtractor={s => s}
            contentContainerStyle={styles.filterBar}
            renderItem={({ item: s }) => (
              <TouchableOpacity
                style={[styles.filterChip, filter === s && styles.filterChipActive]}
                onPress={() => setFilter(s)}
              >
                <Text style={[styles.filterText, filter === s && styles.filterTextActive]}>
                  {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label ?? s}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
        data={orders}
        keyExtractor={o => o.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} tintColor={Colors.primary} />
        }
        ListEmptyComponent={() => (
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <View style={styles.center}>
              <Feather name="inbox" size={48} color={Colors.border} />
              <Text style={styles.emptyText}>No orders found</Text>
            </View>
          )
        )}
        renderItem={renderOrder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundAlt },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: Colors.background,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: Colors.text },
  filterBar: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  card: {
    backgroundColor: Colors.background, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 12, overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  cardHeaderLeft: {},
  orderIdText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text },
  dateText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.muted, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  cardBody: { padding: 16, gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.text, flex: 1 },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  totalText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.text },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  advanceBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    minWidth: 90,
  },
  btnDisabled: { opacity: 0.6 },
  advanceBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#fff' },
  cancelBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48 },
  emptyText: { fontFamily: 'Inter_500Medium', fontSize: 15, color: Colors.muted, marginTop: 12 },
});
