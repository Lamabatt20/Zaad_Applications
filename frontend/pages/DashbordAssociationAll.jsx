import React, { useEffect, useRef } from "react";
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
  TouchableOpacity,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

export default function DashbordAssociationAll({ route }) {
  const username = route?.params?.username || "Association";
  const navigation = useNavigation();

  const modules = [
    {
      id: "1",
      title: "Food Donations",
      subtitle: "Accepted & Approved",
      icon: "fast-food-outline",
      screen: "DashbordAssociationFoods", 
    },
    {
      id: "2",
      title: "Clothes Donations",
      subtitle: "Pending, Accepted, Approved, Rejected",
      icon: "shirt-outline",
      screen: "DashbordAssociationClothes", 
    },
  ];

  // animations
  const fadeAnimations = useRef(modules.map(() => new Animated.Value(0))).current;
  const pressAnimations = useRef(modules.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const anims = fadeAnimations.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 550,
        delay: index * 180,
        useNativeDriver: true,
      })
    );
    Animated.stagger(130, anims).start();
  }, []);

  const goToScreen = (item) => {
    if (!item?.screen) return;

    navigation.navigate(item.screen, {
      ...route?.params,
      username,
    });
  };

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

          // ✅ التنقّل
          goToScreen(item);
        }}
      >
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnimations[index],
              transform: [{ translateY: fadeTranslateY }, { translateY: pressTranslateY }],
            },
          ]}
        >
          <View style={styles.cardRow}>
            <View style={styles.leftRow}>
              <View style={styles.iconCircle}>
                <Ionicons name={item.icon} size={22} color="#8b6f69" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSub}>{item.subtitle}</Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#54403c" />
          </View>
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
            source={require("../assets/images/image.png")}
            style={styles.welcomeLogo}
            resizeMode="contain"
          />

          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcome}>Welcome {username}</Text>
          </View>

          <TouchableOpacity style={{ top: -30 }} onPress={() => navigation.navigate('ProfileScreen', { ...route?.params })}>
            <Ionicons name="person-circle-outline" size={36} color="#8b6f69" />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <View style={styles.cardsTitleContainer}>
          <Text style={styles.cardsTitle}>Dashboard (All)</Text>
        </View>

        {/* Cards */}
        <FlatList
          data={modules}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          scrollEnabled={false}
        />

        {/* Footer */}
        <View style={styles.footerContainer}>
          <Image
            source={require("../assets/images/Z A A D.png")}
            style={styles.footerLogo}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EBE1D7" },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: "space-between",
  },

  /* HEADER */
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 26,
    marginTop: -10,
  },
  welcomeLogo: {
    width: 135,
    height: 135,
    marginRight: 10,
    marginLeft: -35,
    marginTop: -50,
  },
  welcomeTextContainer: { marginLeft: 12, flex: 1 },
  welcome: {
    fontFamily: "Times New Roman",
    fontSize: 23,
    marginTop: -50,
    marginLeft: -65,
    color: "#8b6f69",
  },
  smallHint: {
    marginLeft: -65,
    marginTop: 6,
    fontSize: 13,
    color: "#6b5a56",
  },

  /* Title */
  cardsTitleContainer: { marginBottom: 15 },
  cardsTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#54403cff",
    fontFamily: "Times New Roman",
  },

  /* CARD */
  card: {
    backgroundColor: "#f2f2f2",
    padding: 18,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 3,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftRow: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#333" },
  cardSub: { fontSize: 12, color: "#6b6b6b", marginTop: 2 },

  /* FOOTER */
  footerContainer: { alignItems: "center", paddingVertical: 10 },
  footerLogo: { width: 80, height: 80, resizeMode: "contain" },
});
