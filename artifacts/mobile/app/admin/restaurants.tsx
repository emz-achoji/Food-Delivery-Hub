import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, ActivityIndicator, RefreshControl, Modal,
  TextInput, ScrollView, Alert, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';

type Restaurant = {
  id: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  rating: number;
  deliveryTime: number;
  deliveryFee: number;
  minOrder: number;
  isActive: boolean;
};

const CATEGORIES = ['American', 'Italian', 'Mexican', 'Chinese', 'Japanese', 'Thai', 'Indian', 'Mediterranean', 'Pizza', 'Burgers', 'Sushi', 'Healthy'];

type FormData = {
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  deliveryTime: string;
  deliveryFee: string;
  minOrder: string;
  isActive: boolean;
};

const emptyForm: FormData = {
  name: '', description: '', category: 'American',
  imageUrl: '', deliveryTime: '30', deliveryFee: '2.99', minOrder: '10', isActive: true,
};

function RestaurantForm({
  visible, onClose, onSave, initial, saving,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: FormData) => void;
  initial: FormData;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormData>(initial);
  const set = (key: keyof FormData, val: any) => setForm(f => ({ ...f, [key]: val }));

  React.useEffect(() => { setForm(initial); }, [initial]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose} style={modalStyles.headerBtn}>
            <Text style={modalStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={modalStyles.headerTitle}>{initial.name ? 'Edit Restaurant' : 'Add Restaurant'}</Text>
          <TouchableOpacity
            onPress={() => onSave(form)}
            style={[modalStyles.headerBtn, saving && { opacity: 0.6 }]}
            disabled={saving}
          >
            {saving ? <ActivityIndicator size="small" color={Colors.primary} /> : <Text style={modalStyles.saveText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={modalStyles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={modalStyles.label}>Name *</Text>
          <TextInput style={modalStyles.input} value={form.name} onChangeText={v => set('name', v)} placeholder="Restaurant name" placeholderTextColor={Colors.muted} />

          <Text style={modalStyles.label}>Description</Text>
          <TextInput style={[modalStyles.input, { height: 80 }]} value={form.description} onChangeText={v => set('description', v)} placeholder="Brief description" placeholderTextColor={Colors.muted} multiline />

          <Text style={modalStyles.label}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modalStyles.categoryRow}>
            {CATEGORIES.map(c => (
              <TouchableOpacity
                key={c}
                style={[modalStyles.categoryChip, form.category === c && modalStyles.categoryChipActive]}
                onPress={() => set('category', c)}
              >
                <Text style={[modalStyles.categoryText, form.category === c && { color: '#fff' }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={modalStyles.label}>Image URL</Text>
          <TextInput style={modalStyles.input} value={form.imageUrl} onChangeText={v => set('imageUrl', v)} placeholder="https://..." placeholderTextColor={Colors.muted} autoCapitalize="none" />

          <View style={modalStyles.row}>
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.label}>Delivery Time (min)</Text>
              <TextInput style={modalStyles.input} value={form.deliveryTime} onChangeText={v => set('deliveryTime', v)} keyboardType="number-pad" placeholder="30" placeholderTextColor={Colors.muted} />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.label}>Delivery Fee ($)</Text>
              <TextInput style={modalStyles.input} value={form.deliveryFee} onChangeText={v => set('deliveryFee', v)} keyboardType="decimal-pad" placeholder="2.99" placeholderTextColor={Colors.muted} />
            </View>
          </View>

          <Text style={modalStyles.label}>Min Order ($)</Text>
          <TextInput style={modalStyles.input} value={form.minOrder} onChangeText={v => set('minOrder', v)} keyboardType="decimal-pad" placeholder="10.00" placeholderTextColor={Colors.muted} />

          <View style={modalStyles.switchRow}>
            <Text style={modalStyles.label}>Active (visible to customers)</Text>
            <Switch
              value={form.isActive}
              onValueChange={v => set('isActive', v)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function AdminRestaurantsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchRestaurants = useCallback(async () => {
    try {
      const data = await apiGet('/restaurants');
      setRestaurants(data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchRestaurants();
  }, [fetchRestaurants]));

  const handleSave = async (form: FormData) => {
    if (!form.name || !form.category) {
      Alert.alert('Validation', 'Name and category are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        category: form.category,
        imageUrl: form.imageUrl,
        deliveryTime: parseInt(form.deliveryTime) || 30,
        deliveryFee: parseFloat(form.deliveryFee) || 2.99,
        minOrder: parseFloat(form.minOrder) || 10,
        isActive: form.isActive,
      };
      if (editingRestaurant) {
        await apiPut(`/restaurants/${editingRestaurant.id}`, payload);
      } else {
        await apiPost('/restaurants', payload);
      }
      await fetchRestaurants();
      setModalVisible(false);
      setEditingRestaurant(null);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (r: Restaurant) => {
    Alert.alert('Delete Restaurant', `Delete "${r.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await apiDelete(`/restaurants/${r.id}`);
            await fetchRestaurants();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const openEdit = (r: Restaurant) => {
    setEditingRestaurant(r);
    setModalVisible(true);
  };

  const openNew = () => {
    setEditingRestaurant(null);
    setModalVisible(true);
  };

  const getInitialForm = (): FormData => {
    if (!editingRestaurant) return emptyForm;
    return {
      name: editingRestaurant.name,
      description: editingRestaurant.description || '',
      category: editingRestaurant.category,
      imageUrl: editingRestaurant.imageUrl || '',
      deliveryTime: String(editingRestaurant.deliveryTime),
      deliveryFee: String(editingRestaurant.deliveryFee),
      minOrder: String(editingRestaurant.minOrder),
      isActive: editingRestaurant.isActive,
    };
  };

  const paddingTop = Math.max(insets.top, Platform.OS === 'web' ? 67 : 0) + 12;

  return (
    <View style={[styles.container, { paddingTop }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Restaurants</Text>
        <TouchableOpacity onPress={openNew} style={styles.addBtn}>
          <Feather name="plus" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={r => r.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRestaurants(); }} tintColor={Colors.primary} />
          }
          ListEmptyComponent={() => (
            <View style={styles.center}>
              <Feather name="map-pin" size={48} color={Colors.border} />
              <Text style={styles.emptyText}>No restaurants yet</Text>
              <TouchableOpacity style={styles.addFirstBtn} onPress={openNew}>
                <Text style={styles.addFirstBtnText}>Add your first restaurant</Text>
              </TouchableOpacity>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.cardImage} contentFit="cover" />
                ) : (
                  <View style={[styles.cardImage, styles.imagePlaceholder]}>
                    <Feather name="image" size={20} color={Colors.muted} />
                  </View>
                )}
                <View style={styles.cardInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                    {!item.isActive && (
                      <View style={styles.inactiveBadge}>
                        <Text style={styles.inactiveBadgeText}>Inactive</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardCategory}>{item.category}</Text>
                  <Text style={styles.cardMeta}>{item.deliveryTime} min · ${item.deliveryFee.toFixed(2)} delivery</Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
                  <Feather name="edit-2" size={16} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}>
                  <Feather name="trash-2" size={16} color="#B91C1C" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <RestaurantForm
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setEditingRestaurant(null); }}
        onSave={handleSave}
        initial={getInitialForm()}
        saving={saving}
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
  addBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 12 },
  card: {
    backgroundColor: Colors.background, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  cardImage: { width: 56, height: 56, borderRadius: 12 },
  imagePlaceholder: { backgroundColor: Colors.backgroundAlt, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text, flex: 1 },
  inactiveBadge: { backgroundColor: Colors.border, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  inactiveBadgeText: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.muted },
  cardCategory: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.muted, marginTop: 2 },
  cardMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.muted, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#FFF0EE', alignItems: 'center', justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48 },
  emptyText: { fontFamily: 'Inter_500Medium', fontSize: 15, color: Colors.muted, marginTop: 12 },
  addFirstBtn: {
    marginTop: 16, backgroundColor: Colors.primary,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  addFirstBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#fff' },
});

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerBtn: { minWidth: 60 },
  headerTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: Colors.text },
  cancelText: { fontFamily: 'Inter_400Regular', fontSize: 16, color: Colors.muted },
  saveText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: Colors.primary, textAlign: 'right' },
  scroll: { padding: 20, paddingBottom: 60 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.muted, marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: Colors.backgroundAlt, borderRadius: 12, padding: 14,
    fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border, textAlignVertical: 'top',
  },
  categoryRow: { marginTop: 4 },
  categoryChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8,
    backgroundColor: Colors.backgroundAlt, borderWidth: 1, borderColor: Colors.border,
  },
  categoryChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text },
  row: { flexDirection: 'row' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
});
