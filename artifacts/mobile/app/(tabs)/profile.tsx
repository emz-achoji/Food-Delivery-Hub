import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { useAuth } from '../context/AuthContext';
import { apiPut } from '../lib/api';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token, logout } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [address, setAddress] = useState(user?.address ?? '');

  const paddingTop = Math.max(insets.top, Platform.OS === 'web' ? 67 : 0) + 16;

  const handleLogout = async () => {
    await logout();
    router.replace('/(tabs)');
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await apiPut(`/auth/profile`, { name, phone, address }, { 'x-user-id': token });
      setEditing(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop }]}>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.emptyState}>
          <View style={styles.avatarLarge}>
            <Feather name="user" size={40} color={Colors.muted} />
          </View>
          <Text style={styles.emptyTitle}>You're not signed in</Text>
          <Text style={styles.emptyText}>Sign in to manage your profile and view your order history.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/auth')}>
            <Text style={styles.primaryBtnText}>Sign in / Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const initials = user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <View style={[styles.container, { paddingTop }]}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Profile</Text>
        {!editing ? (
          <TouchableOpacity onPress={() => setEditing(true)} style={styles.editBtn}>
            <Feather name="edit-2" size={16} color={Colors.primary} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setEditing(false)} style={styles.editBtn}>
            <Text style={[styles.editBtnText, { color: Colors.muted }]}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          {user.role === 'admin' && (
            <View style={styles.roleBadge}>
              <Feather name="shield" size={12} color="#7C3AED" />
              <Text style={styles.roleBadgeText}>Admin</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Info</Text>

          <View style={styles.field}>
            <Feather name="user" size={18} color={Colors.muted} style={styles.fieldIcon} />
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              {editing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={Colors.muted}
                />
              ) : (
                <Text style={styles.fieldValue}>{user.name}</Text>
              )}
            </View>
          </View>

          <View style={styles.field}>
            <Feather name="mail" size={18} color={Colors.muted} style={styles.fieldIcon} />
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Text style={styles.fieldValue}>{user.email}</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Feather name="phone" size={18} color={Colors.muted} style={styles.fieldIcon} />
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Phone</Text>
              {editing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="(555) 000-0000"
                  keyboardType="phone-pad"
                  placeholderTextColor={Colors.muted}
                />
              ) : (
                <Text style={styles.fieldValue}>{user.phone || 'Not set'}</Text>
              )}
            </View>
          </View>

          <View style={[styles.field, { borderBottomWidth: 0 }]}>
            <Feather name="map-pin" size={18} color={Colors.muted} style={styles.fieldIcon} />
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Default Address</Text>
              {editing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="123 Main St, City, State"
                  placeholderTextColor={Colors.muted}
                />
              ) : (
                <Text style={styles.fieldValue}>{user.address || 'Not set'}</Text>
              )}
            </View>
          </View>
        </View>

        {editing && (
          <TouchableOpacity
            style={[styles.primaryBtn, saving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/(tabs)/orders')}>
            <View style={styles.menuRowLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#FFF0EE' }]}>
                <Feather name="shopping-bag" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.menuRowText}>My Orders</Text>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.muted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Feather name="log-out" size={18} color="#B91C1C" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.memberSince}>
          Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 28, color: Colors.text },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontFamily: 'Inter_500Medium', fontSize: 15, color: Colors.primary },
  scrollContent: { paddingHorizontal: 20 },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatarLarge: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.backgroundAlt, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 28, color: '#fff' },
  userName: { fontFamily: 'Inter_700Bold', fontSize: 22, color: Colors.text },
  userEmail: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.muted, marginTop: 4 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 8, paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: '#EDE9FE', borderRadius: 20,
  },
  roleBadgeText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#7C3AED' },
  section: {
    backgroundColor: Colors.background, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 16, overflow: 'hidden',
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.muted,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  field: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  fieldIcon: { marginRight: 14 },
  fieldContent: { flex: 1 },
  fieldLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.muted, marginBottom: 2 },
  fieldValue: { fontFamily: 'Inter_500Medium', fontSize: 15, color: Colors.text },
  fieldInput: {
    fontFamily: 'Inter_500Medium', fontSize: 15, color: Colors.text,
    padding: 0, margin: 0,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  menuRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuRowText: { fontFamily: 'Inter_500Medium', fontSize: 15, color: Colors.text },
  primaryBtn: {
    backgroundColor: Colors.primary, padding: 16, borderRadius: 14,
    alignItems: 'center', marginBottom: 16,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
    borderRadius: 14, borderWidth: 1, borderColor: '#FEE2E2',
    backgroundColor: '#FFF5F5', marginBottom: 20,
  },
  logoutText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#B91C1C' },
  memberSince: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.muted, textAlign: 'center', marginBottom: 16 },
  emptyState: { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 20, color: Colors.text, marginBottom: 8 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.muted, textAlign: 'center', marginBottom: 24 },
});
