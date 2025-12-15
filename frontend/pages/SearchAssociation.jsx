import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  SafeAreaView,
  Platform,
} from 'react-native';
import axios from 'axios';
import API from '../config';
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SearchAssociation({ navigation, route }) {
  const [query, setQuery] = useState('');
  const [associations, setAssociations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [darkMode, setDarkMode] = useState(false);

  
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem("dark_mode");
        if (saved !== null) setDarkMode(saved === "true");
      } catch {}
    };
    loadTheme();
  }, []);

  
  const bg = darkMode ? "#1c1c1c" : "#EBE1D7";
  const text = darkMode ? "#fff" : "#2f2f2f";
  const cardBg = darkMode ? "#2a2a2a" : "#fff";
  const cardText = darkMode ? "#fff" : "#333";
  const inputBg = darkMode ? "#2a2a2a" : "#fff";
  const inputText = darkMode ? "#fff" : "#000";
  const placeholder = darkMode ? "#aaa" : "#888";

 
  const sourceScreen = route?.params?.sourceScreen || 'ChatBot';
  let donationType = 'clothes';

  if (sourceScreen === 'ChatBotScreen') donationType = 'all';
  else if (sourceScreen === 'FoodAssociationsScreen') donationType = 'food';
  else if (sourceScreen === 'ClothesAssociationsScreen') donationType = 'clothes';
  else donationType = route?.params?.donationType || 'clothes';

  useEffect(() => {
    fetchAssociations();
  }, [donationType]);

  useEffect(() => {
    if (!query) setFiltered(associations);
    else {
      const q = query.toLowerCase();
      setFiltered(
        associations.filter(
          (a) =>
            (a.name || '').toLowerCase().includes(q) ||
            (a.description || '').toLowerCase().includes(q)
        )
      );
    }
  }, [query, associations]);

  const fetchAssociations = async () => {
    try {
      let endpoint =
        donationType === 'all'
          ? `${API.API_URL}/associations`
          : `${API.API_URL}/associations/${donationType}`;

      const res = await axios.get(endpoint);
      const data = Array.isArray(res.data) ? res.data : res.data.items || [];
      setAssociations(data);
      setFiltered(data);
    } catch (e) {
      console.log('Error fetching associations:', e);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBg }]}
      onPress={() => navigation.navigate('AssociationInfo', { association: item })}
    >
      <Image
        source={
          item.association_logo
            ? { uri: `${API.API_URL}${item.association_logo}` }
            : { uri: 'https://via.placeholder.com/140' }
        }
        style={styles.cardLogo}
      />
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: cardText }]}>{item.name}</Text>
        <Text style={[styles.cardSubtitle, { color: darkMode ? "#ccc" : "#666" }]} numberOfLines={2}>
          {item.description}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <View style={[styles.container, { backgroundColor: bg }]}>

        <View style={styles.topSearchRow}>
          <Image source={require('../assets/images/logo1.png')} style={styles.logo1} />

          <View style={[styles.searchRow, { backgroundColor: inputBg }]}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={`Search ${donationType} associations`}
              placeholderTextColor={placeholder}
              style={[styles.searchInput, { color: inputText }]}
            />
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}></TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => (item.association_id || item.id || item.name).toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />

        <View style={styles.bottomLogoContainer}>
          <Image source={require('../assets/images/Z A A D.png')} style={styles.bottomLogo} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 18 : 12 },
  topSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
    marginTop: -20,
  },
  logo1: {
    width: 85,
    height: 85,
    resizeMode: 'contain',
    marginRight: 6,
  },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 12,
    paddingHorizontal: 6,
  },
  searchInput: {
    flex: 1,
    height: 36,
    fontSize: 14,
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingBottom: 120 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  cardLogo: { width: 64, height: 64, borderRadius: 10, marginRight: 12, resizeMode: 'cover' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardSubtitle: { fontSize: 13 },
  bottomLogoContainer: { position: 'absolute', bottom: 10, left: 0, right: 0, alignItems: 'center' },
  bottomLogo: { width: 80, height: 80, resizeMode: 'contain' },
});
