import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/colors';
import { useCart } from './context/CartContext';
import { useAuth } from './context/AuthContext';
import { apiPost } from './lib/api';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { 
    items, 
    updateQuantity, 
    removeItem, 
    restaurantId, 
    restaurantName, 
    deliveryFee, 
    subtotal, 
    clearCart 
  } = useCart();

  const [address, setAddress] = useState(user?.address || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = subtotal + deliveryFee;

  const handlePlaceOrder = async () => {
    if (!address.trim()) {
      setError('Delivery address is required');
      return;
    }
    if (!restaurantId || !user) return;

    setLoading(true);
    setError('');
    
    try {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      const payload = {
        userId: user.id,
        restaurantId,
        deliveryAddress: address,
        deliveryFee,
        items: items.map(i => ({
          menuItemId: i.menuItemId,
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.price,
          imageUrl: i.imageUrl || ''
        }))
      };

      const order = await apiPost('/orders', payload, { 'x-user-id': user.id });
      clearCart();
      router.replace(`/order/${order.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.cartItem}>
      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.itemImage} contentFit="cover" />
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
      </View>
      
      <View style={styles.itemActions}>
        <View style={styles.quantityControl}>
          <TouchableOpacity onPress={() => updateQuantity(item.menuItemId, item.quantity - 1)} style={styles.qtyBtn}>
            <Feather name="minus" size={14} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <TouchableOpacity onPress={() => updateQuantity(item.menuItemId, item.quantity + 1)} style={styles.qtyBtn}>
            <Feather name="plus" size={14} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => removeItem(item.menuItemId)} style={styles.removeBtn}>
          <Feather name="x" size={16} color={Colors.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const Header = () => (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 67 : 0) }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Feather name="arrow-left" size={24} color={Colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Your Cart</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.emptyContainer}>
          <Feather name="shopping-bag" size={64} color={Colors.border} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.replace('/')}>
            <Text style={styles.browseBtnText}>Browse Restaurants</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      <FlatList
        data={items}
        keyExtractor={item => item.menuItemId}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.restaurantHeader}>
            <Text style={styles.restaurantLabel}>Order from</Text>
            <Text style={styles.restaurantName}>{restaurantName}</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footerSection}>
            <View style={styles.addressSection}>
              <Text style={styles.sectionTitle}>Delivery Address</Text>
              <View style={styles.addressInputContainer}>
                <Feather name="map-pin" size={18} color={Colors.muted} style={styles.addressIcon} />
                <TextInput
                  style={styles.addressInput}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter delivery address"
                  placeholderTextColor={Colors.muted}
                />
              </View>
              {!!error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Fee</Text>
                <Text style={styles.summaryValue}>${deliveryFee.toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        }
      />
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 24 }]}>
        <TouchableOpacity 
          style={[styles.checkoutBtn, loading && styles.checkoutBtnDisabled]} 
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.background} />
          ) : (
            <>
              <Text style={styles.checkoutBtnText}>Place Order</Text>
              <Text style={styles.checkoutBtnPrice}>${total.toFixed(2)}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: Colors.text,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    color: Colors.text,
    marginTop: 24,
    marginBottom: 24,
  },
  browseBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
  },
  browseBtnText: {
    fontFamily: 'Inter_600SemiBold',
    color: Colors.background,
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 120,
  },
  restaurantHeader: {
    padding: 20,
    backgroundColor: Colors.backgroundAlt,
    marginBottom: 8,
  },
  restaurantLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.muted,
    marginBottom: 4,
  },
  restaurantName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: Colors.text,
  },
  cartItem: {
    flexDirection: 'row',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
    backgroundColor: Colors.backgroundAlt,
  },
  itemInfo: {
    flex: 1,
    marginRight: 16,
  },
  itemName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: Colors.text,
    marginBottom: 8,
  },
  itemPrice: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  itemActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 60,
  },
  removeBtn: {
    padding: 4,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 16,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  qtyBtn: {
    padding: 6,
  },
  qtyText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    marginHorizontal: 8,
    minWidth: 16,
    textAlign: 'center',
  },
  footerSection: {
    padding: 20,
  },
  addressSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: Colors.text,
    marginBottom: 16,
  },
  addressInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  addressIcon: {
    marginRight: 12,
  },
  addressInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.text,
  },
  errorText: {
    color: Colors.primary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    marginTop: 8,
  },
  summarySection: {
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 16,
    padding: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.text,
  },
  summaryValue: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  totalLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.text,
  },
  totalValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.text,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  checkoutBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
  },
  checkoutBtnDisabled: {
    opacity: 0.7,
    justifyContent: 'center',
  },
  checkoutBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.background,
  },
  checkoutBtnPrice: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.background,
  }
});
