import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { apiGet } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
};

type OrderDetail = {
  id: string;
  restaurantName: string;
  status: string;
  totalAmount: number;
  deliveryFee: number;
  deliveryAddress: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

const STATUS_STEPS = ['pending', 'confirmed', 'preparing', 'delivering', 'delivered'];

const STATUS_INFO: Record<string, { label: string; color: string; bg: string; icon: string; desc: string }> = {
  pending:    { label: 'Order Placed',   color: '#B45309', bg: '#FEF3C7', icon: 'clock',       desc: 'Waiting for restaurant to confirm' },
  confirmed:  { label: 'Confirmed',      color: '#1D4ED8', bg: '#DBEAFE', icon: 'check-circle', desc: 'Restaurant has confirmed your order' },
  preparing:  { label: 'Preparing',      color: '#7C3AED', bg: '#EDE9FE', icon: 'coffee',       desc: 'Your food is being prepared' },
  delivering: { label: 'On the way',     color: '#0369A1', bg: '#E0F2FE', icon: 'navigation',   desc: 'Your order is out for delivery' },
  delivered:  { label: 'Delivered',      color: '#15803D', bg: '#DCFCE7', icon: 'check-circle', desc: 'Enjoy your meal!' },
  cancelled:  { label: 'Cancelled',      color: '#B91C1C', bg: '#FEE2E2', icon: 'x-circle',     desc: 'This order has been cancelled' },
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!token) return;
      try {
        const data = await apiGet(`/orders/${id}`, { 'x-user-id': token });
        setOrder(data);
      } catch (e) {
        console.log(e);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchOrder();
  }, [id, token]);

  const paddingTop = Math.max(insets.top, Platform.OS === 'web' ? 67 : 0) + 12;

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.container, styles.center]}>
        <Feather name="alert-circle" size={48} color={Colors.muted} />
        <Text style={styles.emptyTitle}>Order not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const info = STATUS_INFO[order.status] ?? STATUS_INFO['pending'];
  const stepIndex = STATUS_STEPS.indexOf(order.status);
  const subtotal = order.totalAmount - order.deliveryFee;

  return (
    <View style={[styles.container, { paddingTop }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/orders')} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Order Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status banner */}
        <View style={[styles.statusBanner, { backgroundColor: info.bg }]}>
          <Feather name={info.icon as any} size={28} color={info.color} />
          <View style={styles.statusText}>
            <Text style={[styles.statusLabel, { color: info.color }]}>{info.label}</Text>
            <Text style={[styles.statusDesc, { color: info.color + 'CC' }]}>{info.desc}</Text>
          </View>
        </View>

        {/* Progress tracker (not for cancelled) */}
        {order.status !== 'cancelled' && (
          <View style={styles.progressSection}>
            <View style={styles.progressTrack}>
              {STATUS_STEPS.map((step, i) => {
                const isCompleted = i <= stepIndex;
                const isLast = i === STATUS_STEPS.length - 1;
                return (
                  <React.Fragment key={step}>
                    <View style={[styles.progressDot, isCompleted && styles.progressDotDone]} />
                    {!isLast && (
                      <View style={[styles.progressLine, i < stepIndex && styles.progressLineDone]} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
            <View style={styles.progressLabels}>
              {STATUS_STEPS.map((step) => (
                <Text key={step} style={styles.progressLabel} numberOfLines={1}>
                  {STATUS_INFO[step]?.label.split(' ')[0]}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Order info */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Order ID</Text>
            <Text style={styles.cardValue}>#{order.id.slice(-8).toUpperCase()}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Restaurant</Text>
            <Text style={styles.cardValue}>{order.restaurantName}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Placed</Text>
            <Text style={styles.cardValue}>
              {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={[styles.cardRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.cardLabel}>Deliver to</Text>
            <Text style={[styles.cardValue, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>{order.deliveryAddress}</Text>
          </View>
        </View>

        {/* Items */}
        <Text style={styles.sectionTitle}>Items Ordered</Text>
        <View style={styles.card}>
          {order.items.map((item, idx) => (
            <View key={item.id} style={[styles.itemRow, idx === order.items.length - 1 && { borderBottomWidth: 0 }]}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.itemImage} contentFit="cover" />
              ) : (
                <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                  <Feather name="image" size={16} color={Colors.muted} />
                </View>
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemQty}>x{item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>${(item.unitPrice * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Price breakdown */}
        <Text style={styles.sectionTitle}>Price Summary</Text>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Subtotal</Text>
            <Text style={styles.cardValue}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Delivery Fee</Text>
            <Text style={styles.cardValue}>${order.deliveryFee.toFixed(2)}</Text>
          </View>
          <View style={[styles.cardRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${order.totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.reorderBtn} onPress={() => router.push(`/`)}>
          <Feather name="refresh-cw" size={16} color={Colors.primary} />
          <Text style={styles.reorderBtnText}>Order Again</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundAlt },
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: Colors.background,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: Colors.text },
  scrollContent: { padding: 16 },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    borderRadius: 16, padding: 20, marginBottom: 16,
  },
  statusText: { flex: 1 },
  statusLabel: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  statusDesc: { fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 2 },
  progressSection: { backgroundColor: Colors.background, borderRadius: 16, padding: 20, marginBottom: 16 },
  progressTrack: { flexDirection: 'row', alignItems: 'center' },
  progressDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.border },
  progressDotDone: { backgroundColor: Colors.primary },
  progressLine: { flex: 1, height: 3, backgroundColor: Colors.border },
  progressLineDone: { backgroundColor: Colors.primary },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.muted, flex: 1, textAlign: 'center' },
  card: {
    backgroundColor: Colors.background, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 16, overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  cardLabel: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.muted },
  cardValue: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.text },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  itemImage: { width: 44, height: 44, borderRadius: 10, marginRight: 12 },
  itemImagePlaceholder: { backgroundColor: Colors.backgroundAlt, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: 'Inter_500Medium', fontSize: 15, color: Colors.text },
  itemQty: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.muted, marginTop: 2 },
  itemPrice: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text },
  totalLabel: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.text },
  totalValue: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.text },
  reorderBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.primary, backgroundColor: '#FFF5F4',
  },
  reorderBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: Colors.primary },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 18, color: Colors.text, marginTop: 16 },
  backLink: { fontFamily: 'Inter_500Medium', fontSize: 15, color: Colors.primary, marginTop: 12 },
});
