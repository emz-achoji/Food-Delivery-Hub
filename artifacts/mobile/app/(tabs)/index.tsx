import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import Colors from '../../constants/colors';
import { apiGet } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['All', 'Burgers', 'Pizza', 'Sushi', 'Mexican', 'Thai', 'Chinese', 'Healthy'];

type Restaurant = {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  rating: number;
  deliveryTime: number;
  deliveryFee: number;
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  
  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch (e) {
    // default
    tabBarHeight = 84;
  }

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const fetchRestaurants = useCallback(async () => {
    try {
      let query = '';
      if (search) query += `?search=${encodeURIComponent(search)}`;
      if (selectedCategory && selectedCategory !== 'All') {
        query += query ? `&category=${encodeURIComponent(selectedCategory)}` : `?category=${encodeURIComponent(selectedCategory)}`;
      }
      const res = await apiGet(`/restaurants${query}`);
      setRestaurants(res);
    } catch (e) {
      console.log('Failed to fetch restaurants', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedCategory]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRestaurants();
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.headerTop}>
        <View style={styles.locationContainer}>
          <Feather name="map-pin" size={16} color={Colors.primary} />
          <Text style={styles.locationText}>
            {user?.address || 'Enter location'}
          </Text>
          <Feather name="chevron-down" size={16} color={Colors.text} />
        </View>
        {!user && (
          <TouchableOpacity onPress={() => router.push('/auth')} style={styles.loginBtn}>
            <Text style={styles.loginBtnText}>Log in</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color={Colors.muted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Restaurants, groceries, dishes"
          placeholderTextColor={Colors.muted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={fetchRestaurants}
        />
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={CATEGORIES}
        keyExtractor={item => item}
        contentContainerStyle={styles.categoriesContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === item && styles.categoryChipSelected
            ]}
            onPress={() => setSelectedCategory(item)}
          >
            <Text style={[
              styles.categoryText,
              selectedCategory === item && styles.categoryTextSelected
            ]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {!search && selectedCategory === 'All' && (
        <View style={styles.promoCard}>
          <View style={styles.promoContent}>
            <Text style={styles.promoTitle}>Free Delivery</Text>
            <Text style={styles.promoSubtitle}>On your first order over $15</Text>
          </View>
          <Feather name="gift" size={48} color="rgba(255,255,255,0.2)" style={styles.promoIcon} />
        </View>
      )}
      
      <Text style={styles.sectionTitle}>
        {search ? 'Search Results' : 'Featured Restaurants'}
      </Text>
    </View>
  );

  const renderRestaurant = ({ item }: { item: Restaurant }) => (
    <TouchableOpacity 
      style={styles.restaurantCard}
      onPress={() => router.push(`/restaurant/${item.id}`)}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: item.imageUrl }}
        style={styles.restaurantImage}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.restaurantInfo}>
        <View style={styles.restaurantHeader}>
          <Text style={styles.restaurantName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            <Feather name="star" size={12} color={Colors.background} />
          </View>
        </View>
        <Text style={styles.restaurantCategory}>{item.category}</Text>
        <View style={styles.restaurantMeta}>
          <View style={styles.metaItem}>
            <Feather name="clock" size={14} color={Colors.muted} />
            <Text style={styles.metaText}>{item.deliveryTime} min</Text>
          </View>
          <View style={styles.metaDot} />
          <View style={styles.metaItem}>
            <Feather name="truck" size={14} color={Colors.muted} />
            <Text style={styles.metaText}>${item.deliveryFee.toFixed(2)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map(i => (
        <View key={i} style={styles.restaurantCard}>
          <View style={[styles.restaurantImage, { backgroundColor: Colors.border }]} />
          <View style={styles.restaurantInfo}>
            <View style={{ height: 20, backgroundColor: Colors.border, width: '60%', borderRadius: 4, marginBottom: 8 }} />
            <View style={{ height: 14, backgroundColor: Colors.border, width: '40%', borderRadius: 4, marginBottom: 12 }} />
            <View style={{ height: 14, backgroundColor: Colors.border, width: '30%', borderRadius: 4 }} />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={loading ? [] : restaurants}
        keyExtractor={item => item.id}
        renderItem={renderRestaurant}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={loading ? renderSkeleton : (
          <View style={styles.emptyState}>
            <Feather name="search" size={48} color={Colors.border} />
            <Text style={styles.emptyTitle}>No restaurants found</Text>
            <Text style={styles.emptyText}>Try changing your search or category</Text>
          </View>
        )}
        contentContainerStyle={[
          styles.listContent,
          { 
            paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 67 : 0),
            paddingBottom: tabBarHeight + 20 
          }
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundAlt,
  },
  listContent: {
    flexGrow: 1,
  },
  headerContainer: {
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.text,
  },
  loginBtn: {
    backgroundColor: Colors.backgroundAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  loginBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: Colors.text,
  },
  categoriesContainer: {
    paddingBottom: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.backgroundAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipSelected: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  categoryText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.text,
  },
  categoryTextSelected: {
    color: Colors.background,
  },
  promoCard: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
  },
  promoContent: {
    flex: 1,
    zIndex: 1,
  },
  promoTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: Colors.background,
    marginBottom: 4,
  },
  promoSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
  },
  promoIcon: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    transform: [{ scale: 2 }],
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: Colors.text,
    marginTop: 8,
  },
  restaurantCard: {
    backgroundColor: Colors.background,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  restaurantImage: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.backgroundAlt,
  },
  restaurantInfo: {
    padding: 16,
  },
  restaurantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  restaurantName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.text,
    flex: 1,
    marginRight: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.text,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ratingText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.background,
  },
  restaurantCategory: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.muted,
    marginBottom: 12,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.text,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  skeletonContainer: {
    paddingTop: 16,
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.muted,
    textAlign: 'center',
  }
});
