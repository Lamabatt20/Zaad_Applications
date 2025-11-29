import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Animated,
} from "react-native";
import axios from "axios";
import API from "../config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ClothesAssociationsScreen({ navigation, route }) {
  const [associations, setAssociations] = useState([]);
  const { user_id, username, email, full_name, phone, role, address } =
    route?.params || {};
  const donationType =
    route?.params?.donationType || route?.params?.type || "clothes";

  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      const saved = await AsyncStorage.getItem("dark_mode");
      if (saved !== null) setDarkMode(saved === "true");
    };
    loadTheme();
  }, []);

  useEffect(() => {
    fetchAssociations();
  }, [donationType]);

  const fetchAssociations = async () => {
    try {
      const res = await axios.get(`${API.API_URL}/associations/${donationType}`);
      const data = Array.isArray(res.data) ? res.data : res.data.items || [];
      setAssociations(data);
    } catch (err) {
      // keep associations empty on error
    }
  };

  const bg = darkMode ? "#1c1c1c" : "#EBE1D7";
  const text = darkMode ? "#fff" : "#000";

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate("AssociationInfo", { association: item })
      }
      style={styles.itemContainer}
    >
      <Image
        source={{ uri: `${API.API_URL}${item.association_logo}` }}
        style={styles.logo}
      />

      <Text style={[styles.associationName, { color: text }]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-280)).current;

  const openSidebar = () => {
    setSidebarOpen(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const closeSidebar = () => {
    Animated.timing(slideAnim, {
      toValue: -280,
      duration: 250,
      useNativeDriver: false,
    }).start(() => setSidebarOpen(false));
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <Image
          source={require("../assets/images/image.png")}
          style={styles.topLogo}
        />
        <Text style={[styles.headerTitle, { color: text }]}>
          {`${donationType.charAt(0).toUpperCase() + donationType.slice(1)} Donation`}
        </Text>
        <TouchableOpacity style={styles.menuButtonRight} onPress={openSidebar}>
          <Image source={require("../assets/menu.png")} style={styles.menuIcon} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={associations}
        renderItem={renderItem}
        keyExtractor={(item) => item.association_id.toString()}
        numColumns={2}
        columnWrapperStyle={{
          justifyContent: "space-between",
          paddingHorizontal: 15,
          marginBottom: 15,
        }}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <View style={styles.bottomContainer}>
        <Image
          source={require("../assets/images/Z A A D.png")}
          style={styles.bottomLogo}
        />
      </View>

      <TouchableOpacity
        style={styles.chatbotButton}
        onPress={() => navigation.navigate("ChatBotScreen")}
      >
        <Image
          source={require("../assets/images/zaadbot.png")}
          style={styles.chatbotIcon}
        />
      </TouchableOpacity>

      {sidebarOpen && (
        <TouchableOpacity style={styles.overlay} onPress={closeSidebar} />
      )}

      <Animated.View
        style={[
          styles.sidebarLeft,
          { right: slideAnim, backgroundColor: darkMode ? "#2a2a2a" : "#fff" },
        ]}
      >
        <View style={styles.profileBox}>
          <Image
            source={require("../assets/profile.png")}
            style={styles.profileImg}
          />
        </View>

        <TouchableOpacity style={styles.sideBtn}>
          <Text style={[styles.sideBtnText, { color: text }]}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sideBtn}
          onPress={() =>
            navigation.navigate("ProfileScreen", {
              user_id,
              username,
              email,
              full_name,
              phone,
              role,
              address,
            })
          }
        >
          <Text style={[styles.sideBtnText, { color: text }]}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideBtn}>
          <Text style={[styles.sideBtnText, { color: text }]}>Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideBtn}>
          <Text
            style={[styles.sideBtnText, { color: text }]}
            onPress={() =>
              navigation.navigate("SearchAssociation", { donationType })
            }
          >
            Search
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 25,
    paddingHorizontal: 10,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
    justifyContent: "space-between",
  },

  topLogo: {
    width: 160,
    height: 100,
    resizeMode: "contain",
  },

  headerTitle: {
    fontFamily: "Times New Roman",
    fontSize: 25,
  },

  menuButtonRight: {
    padding: 10,
  },

  menuIcon: {
    width: 45,
    height: 45,
  },

  itemContainer: {
    width: "47%",
    alignItems: "center",
  },

  logo: {
    width: 140,
    height: 140,
    borderRadius: 10,
  },

  associationName: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: 10,
    marginBottom: -10,
  },

  bottomContainer: {
    position: "absolute",
    bottom: 10,
    width: "100%",
    alignItems: "center",
  },

  bottomLogo: {
     width: 80,
    height: 80,
    resizeMode: "contain",
    position: "absolute",
    bottom: 10,
  },

  chatbotButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
  },

  chatbotIcon: {
    width: 50,
    height: 50,
  },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 9,
  },

  sidebarLeft: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 280,
    paddingTop: 40,
    zIndex: 10,
    elevation: 10,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },

  profileBox: {
    alignItems: "center",
    marginBottom: 20,
  },

  profileImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },

  sideBtn: {
    paddingVertical: 15,
    paddingHorizontal: 20,
  },

  sideBtnText: {
    fontSize: 16,
  },

  logoutBtn: {
    marginTop: 30,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },

  logoutText: {
    color: "red",
    fontSize: 16,
    fontWeight: "bold",
  },
});
