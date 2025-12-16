import React, { useEffect, useRef,useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  Image,
  TouchableWithoutFeedback,
  TouchableOpacity
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

export default function ClothesDonationStatus({ route }) {
  const username = route?.params?.username || "Association";

 
  const navigation = useNavigation();

  const statuses = [
    { id: '1', status: 'Pending' },
    { id: '2', status: 'Approved' },
    { id: '3', status: 'Rejected' },
    { id: '4', status: 'Accepted' },
  ];

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

  
  const fadeAnimations = useRef(statuses.map(() => new Animated.Value(0))).current;

  
  const pressAnimations = useRef(statuses.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const anims = fadeAnimations.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 600,
        delay: index * 200,
        useNativeDriver: true,
      })
    );

    Animated.stagger(150, anims).start();
  }, []);

  const renderItem = ({ item, index }) => {
    const fadeTranslateY = fadeAnimations[index].interpolate({
      inputRange: [0, 1],
      outputRange: [25, 0],
    });

    const pressTranslateY = pressAnimations[index].interpolate({
      inputRange: [0, 1],
      outputRange: [0, -8], 
    });

    return (
      <TouchableWithoutFeedback
        onPressIn={() => {
          Animated.spring(pressAnimations[index], {
            toValue: 1,
            useNativeDriver: true,
          }).start();
        }}
        onPressOut={() => {
          Animated.spring(pressAnimations[index], {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }}

       onPress={() => {
  if (item.status === "Pending") {
    navigation.navigate("PendingClothesScreen");
  } else if (item.status === "Accepted") {
    navigation.navigate("AcceptedClothesScreen");
  } else if (item.status === "Rejected") {
    navigation.navigate("RejectedClothesScreen");
  } else if (item.status === "Approved") {
    navigation.navigate("ApprovedClothesScreen");
  }
}}

      >
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnimations[index],
              transform: [
                { translateY: fadeTranslateY },
                { translateY: pressTranslateY },
              ],
            },
          ]}
        >
          <Text style={styles.status}>{item.status}</Text>
        </Animated.View>
      </TouchableWithoutFeedback>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <View style={styles.welcomeRow}>
          <Image
            source={require('../assets/images/image.png')}
            style={styles.welcomeLogo}
            resizeMode="contain"
          />

          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcome}>Welcome {username}</Text>
          </View>

          <TouchableOpacity
            style={{ top: -30 }}
            onPress={() =>
              navigation.navigate("ProfileScreen", {
                ...currentUser
              })
            }
          >
            <Ionicons name="person-circle-outline" size={36} color={ "#A27571"} />
          </TouchableOpacity>
        </View>

        {/* Title for Cards */}
        <View style={styles.cardsTitleContainer}>
          <Text style={styles.cardsTitle}>Donation Status</Text>
        </View>

        {/* Status Cards */}
        <FlatList
          data={statuses}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          scrollEnabled={false}
        />

        {/* Footer */}
        <View style={styles.footerContainer}>
          <Image
            source={require('../assets/images/Z A A D.png')}
            style={styles.footerLogo}
          />
        </View>

      </ScrollView>
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
    paddingBottom: 40,   
    flexGrow: 1,
    justifyContent: 'space-between', 
  },

  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: -10,
  },
  welcomeLogo: {
    width: 135,
    height: 135,
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
    fontSize: 23,
    marginTop: -50,
    marginLeft: -65,
    color: '#8b6f69',
  },

  /* Cards Title */
  cardsTitleContainer: {
    marginBottom: 15,
    marginLeft: 0,    
  },
  cardsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#54403cff',
    fontFamily: 'Times New Roman',
  },

  /* CARD */
  card: {
    backgroundColor: "#f2f2f2",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 3,
  },
  status: {
    fontSize: 18,
    fontWeight: "600",
  },

   footerContainer: {
    position: 'absolute',
    bottom: -20,
    width: '100%',
    alignItems: 'center',
  },
  footerLogo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
});
