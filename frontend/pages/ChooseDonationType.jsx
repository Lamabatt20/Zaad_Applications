import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

export default function ChooseDonationType({ navigation, route }) {

 
  const initialData = route?.params || {};

  
  const [currentUser, setCurrentUser] = useState({
    user_id: initialData.user_id,
    username: initialData.username,
    email: initialData.email,
    full_name: initialData.full_name,
    phone: initialData.phone,
    role: initialData.role,
    address: initialData.address
  });

  
  useEffect(() => {
    if (route.params) {
      setCurrentUser(prev => ({
        ...prev,
        ...route.params,
      }));
    }
  }, [route.params]);

  

  const onSelect = (type) => {
    console.log('Selected:', type, 'user_id:', currentUser.user_id);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
       
        
        <View style={styles.welcomeRow}>
          <Image
            source={require('../assets/images/image.png')}
            style={styles.welcomeLogo}
            resizeMode="contain"
          />

          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcome}>Welcome {currentUser.username || 'Donor'}</Text>
          </View>

         
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() =>
              navigation.navigate("ProfileScreen", {
                ...currentUser
              })
            }
          >
            <Ionicons name="person-circle-outline" size={36} color="#A27571" />
          </TouchableOpacity>
        </View>

        
        
        <Text style={styles.bodyTitle}>Choose Donation Type:</Text>

        
       
        <View style={styles.cardsRow}>
          
          
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate("ClothesAssociationsScreen", {
                ...currentUser
              })
            }
          >
            <Image
              source={require('../assets/images/clothes.png')}
              style={styles.cardImage}
              resizeMode="contain"
            />
            <Text style={styles.cardLabel}>Clothes Donation</Text>
          </TouchableOpacity>

         
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate("FoodAssociationsScreen", {
                ...currentUser
              })
            }
          >
            <Image
              source={require('../assets/images/food.png')}
              style={styles.cardImage}
              resizeMode="contain"
            />
            <Text style={styles.cardLabel}>Food Donation</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      
      
      <View style={styles.footerContainer}>
        <Image
          source={require('../assets/images/Z A A D.png')}
          style={styles.footerLogo}
        />
      </View>

      
      <TouchableOpacity
        style={styles.chatbotBtn}
        onPress={() => navigation.navigate("ChatBotScreen", { ...currentUser })}
      >
        <Image
          source={require("../assets/images/zaadbot.png")}
          style={{ width: 50, height: 50, resizeMode: "contain" }}
        />
      </TouchableOpacity>
     
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EBE1D7',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeLogo: {
    width: 150,
    height: 150,
    marginRight: 10,
    marginLeft: -35,
    marginTop: -50,
  },
  welcomeTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  welcome: {
    fontFamily: 'Times New Roman',
    fontSize: 25,
    marginTop: -50,
    marginLeft: -65,
    color: '#8b6f69',
  },
  profileBtn: {
    top: -30,
  },
  bodyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2f2f2f',
    marginBottom: -10,
    marginTop: -20,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    width: CARD_WIDTH,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  cardImage: {
    width: 160,
    height: 160,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },
  footerContainer: {
    position: 'absolute',
    bottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  footerLogo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  chatbotBtn: {
    position: 'absolute',
    bottom: 100,
    right: 20,
  },
  
});
