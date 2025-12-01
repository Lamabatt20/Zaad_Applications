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

export default function SearchAssociation({ navigation, route }) {
  const [query, setQuery] = useState('');
  const [associations, setAssociations] = useState([]);
  const [filtered, setFiltered] = useState([]);

  // Determine donation type based on source screen:
  // If from ChatBot, fetch all associations; otherwise, fetch specific type (clothes/food)
  const sourceScreen = route?.params?.sourceScreen || 'ChatBot';
  let donationType = 'clothes'; // default
  
  if (sourceScreen === 'ChatBotScreen') {
    donationType = 'all';
  } else if (sourceScreen === 'FoodAssociationsScreen') {
    donationType = 'food';
  } else if (sourceScreen === 'ClothesAssociationsScreen') {
    donationType = 'clothes';
  } else {
    // Fallback to params if provided
    donationType = route?.params?.donationType || route?.params?.type || route?.params?.selectedType || 'clothes';
  }

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
      let endpoint = '';
      console.log('SearchAssociation - sourceScreen:', sourceScreen, 'donationType:', donationType);
      
      if (donationType === 'all') {
        // Fetch all associations (when from ChatBot)
        endpoint = `${API.API_URL}/associations`;
      } else {
        // Fetch filtered by type (clothes or food)
        endpoint = `${API.API_URL}/associations/${donationType}`;
      }
      console.log('SearchAssociation - endpoint:', endpoint);
      
      const res = await axios.get(endpoint);
      const data = Array.isArray(res.data) ? res.data : (res.data.items || []);
      console.log('SearchAssociation - fetched data count:', data.length);
      setAssociations(data);
      setFiltered(data);
    } catch (e) {
      console.log('Error fetching associations:', e);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
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
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardSubtitle} numberOfLines={2}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.topSearchRow}>
          <Image source={require('../assets/images/logo1.png')} style={styles.logo1} />
          <View style={styles.searchRow}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={`Search ${donationType} associations`}
              placeholderTextColor="#999"
              style={styles.searchInput}
              clearButtonMode="while-editing"
            />
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => (item.association_id || item.id || item.name).toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />

        <View style={styles.bottomLogoContainer}>
          <Image source={require('../assets/images/Z A A D.png')} style={styles.bottomLogo} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5efe9' },
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
    marginRight: -1,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    height: 36,
    fontSize: 14,
    color: '#222',
    alignItems:'center',
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: { fontSize: 18, color: '#999' },
  list: { paddingBottom: 120 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  cardLogo: { width: 64, height: 64, borderRadius: 10, marginRight: 12, resizeMode: 'cover' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: '#666' },
  bottomLogoContainer: { position: 'absolute', bottom: 10, left: 0, right: 0, alignItems: 'center' },
  bottomLogo: { width: 80, height: 80, resizeMode: 'contain' },
});
