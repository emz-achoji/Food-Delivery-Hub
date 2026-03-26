import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, Platform, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '../../constants/colors';
import { apiGet } from '../lib/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  isAvailable: boolean;
};

type RestaurantDetail = {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  rating: number;
  deliveryTime: number;
  deliveryFee: number;
  menuItems: MenuItem[];
};

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { 
    items: cartItems, 
    addItem, 
    updateQuantity, 
    setRestaurant,
    restaurantId: currentCartRestaurantId,
    totalItems,
    subtotal
  } = useCart();

  const [restaurant, setRestaurantData] = useState<RestaurantDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const data = await apiGet(`/restaurants/${id}`);
        setRestaurantData(data);
        // If cart is empty or from same restaurant, implicitly set it to allow adding
        if (!currentCartRestaurantId || currentCartRestaurantId === id) {
          setRestaurant(data.id, data.name, data.deliveryFee);
        }
      } catch (e) {
        console.log(e);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDetail();
  }, [id, currentCartRestaurantId, setRestaurant]);

  const sections = useMemo(() => {
    if (!restaurant) return [];
    const grouped = restaurant.menuItems.reduce((acc, item) => {
      const cat = item.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);

    return Object.keys(grouped).map(key => ({
      title: key,
      data: grouped[key]
    }));
  }, [restaurant]);

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const renderHeader = () => {
    if (!restaurant) return null;
    return (
      <View style={styles.headerContainer}>
        <Image 
          source={{ uri: restaurant.imageUrl }} 
          style={styles.heroImage} 
          contentFit="cover" 
        />
        <TouchableOpacity 
          style={[styles.backButton, { top: Math.max(insets.top, Platform.OS === 'web' ? 67 : 0) + 12 }]} 
          onPress={handleBack}
        >
          <Feather name="arrow-left" size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <View style={styles.infoContainer}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          <View style={styles.metaRow}>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
              <Feather name="star" size={12} color={Colors.text} />
            </View>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{restaurant.category}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Feather name="clock" size={18} color={Colors.muted} style={styles.statIcon} />
              <View>
                <Text style={styles.statValue}>{restaurant.deliveryTime} min</Text>
                <Text style={styles.statLabel}>Delivery</Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Feather name="truck" size={18} color={Colors.muted} style={styles.statIcon} />
              <View>
                <Text style={styles.statValue}>${restaurant.deliveryFee.toFixed(2)}</Text>
                <Text style={styles.statLabel}>Fee</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: MenuItem }) => {
    const cartItem = cartItems.find(i => i.menuItemId === item.id);
    const quantity = cartItem?.quantity || 0;

    const handleAdd = () => {
      if (!user) {
        router.push('/auth');
        return;
      }
      if (currentCartRestaurantId && currentCartRestaurantId !== restaurant?.id) {
        // Here we ideally show an alert "Clear cart to order from this restaurant?"
        // For simplicity, we auto-clear and set new restaurant
        setRestaurant(restaurant!.id, restaurant!.name, restaurant!.deliveryFee);
      }
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      addItem({
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl
      });
    };

    const handleUpdate = (newQ: number) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      updateQuantity(item.id, newQ);
    };

    return (
      <View style={styles.menuItem}>
        <View style={styles.menuItemContent}>
          <Text style={styles.menuItemName}>{item.name}</Text>
          {!!item.description && (
            <Text style={styles.menuItemDesc} numberOfLines={2}>{item.description}</Text>
          )}
          <Text style={styles.menuItemPrice}>${item.price.toFixed(2)}</Text>
        </View>
        
        <View style={styles.menuItemRight}>
          <Image 
            source={{ uri: item.imageUrl }} 
            style={styles.menuItemImage} 
            contentFit="cover"
          />
          {quantity > 0 ? (
            <View style={styles.quantityControl}>
              <TouchableOpacity onPress={() => handleUpdate(quantity - 1)} style={styles.qtyBtn}>
                <Feather name="minus" size={16} color={Colors.background} />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{quantity}</Text>
              <TouchableOpacity onPress={() => handleUpdate(quantity + 1)} style={styles.qtyBtn}>
                <Feather name="plus" size={16} color={Colors.background} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
              <Feather name="plus" size={16} color={Colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading menu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        stickySectionHeadersEnabled={false}
        bounces={false}
      />
      
      {totalItems > 0 && currentCartRestaurantId === id && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 24 }]}>
          <TouchableOpacity 
            style={styles.cartButton}
            onPress={() => router.push('/cart')}
          >
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalItems}</Text>
            </View>
            <Text style={styles.cartBtnText}>View Cart</Text>
            <Text style={styles.cartBtnPrice}>${subtotal.toFixed(2)}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontFamily: 'Inter_500Medium',
    color: Colors.muted,
  },
  headerContainer: {
    backgroundColor: Colors.background,
    paddingBottom: 24,
    borderBottomWidth: 8,
    borderBottomColor: Colors.backgroundAlt,
  },
  heroImage: {
    width: '100%',
    height: 260,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  restaurantName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: Colors.text,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ratingText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.text,
  },
  metaDot: {
    marginHorizontal: 8,
    color: Colors.muted,
    fontSize: 16,
  },
  metaText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.muted,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
  },
  statBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    marginRight: 12,
  },
  statValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.text,
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.muted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  sectionHeader: {
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: Colors.text,
  },
  menuItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemContent: {
    flex: 1,
    paddingRight: 16,
  },
  menuItemName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.text,
    marginBottom: 4,
  },
  menuItemDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.muted,
    marginBottom: 8,
    lineHeight: 20,
  },
  menuItemPrice: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: Colors.text,
  },
  menuItemRight: {
    alignItems: 'center',
  },
  menuItemImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: Colors.backgroundAlt,
  },
  addButton: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: Colors.background,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quantityControl: {
    position: 'absolute',
    bottom: -12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.text,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  qtyBtn: {
    padding: 4,
  },
  qtyText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.background,
    marginHorizontal: 12,
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
  cartButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
  },
  cartBadge: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    color: Colors.background,
    fontSize: 14,
  },
  cartBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.background,
  },
  cartBtnPrice: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.background,
  },
});
