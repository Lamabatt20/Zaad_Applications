import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";
import SideMenu from "../components/SideMenu";
import axios from "axios";
import API from "../config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function FoodAssociationsScreen({ navigation, route }) {
  const [associations, setAssociations] = useState([]);
  const [darkMode, setDarkMode] = useState(false);

  const { user_id, username, email, full_name, phone, role, address } =
    route?.params || {};

  
  useEffect(() => {
    loadDarkMode();
  }, []);

  const loadDarkMode = async () => {
    try {
      const saved = await AsyncStorage.getItem("dark_mode");
      if (saved !== null) setDarkMode(saved === "true");
    } catch (e) {}
  };

  const bg = darkMode ? "#1c1c1c" : "#EBE1D7";
  const text = darkMode ? "#fff" : "#2f2f2f";

  useEffect(() => {
    fetchAssociations();
  }, []);

  const fetchAssociations = async () => {
    try {
      // Some backends don't expose a /associations/food endpoint.
      // Request all associations and filter for those with `food` flag.
      const res = await axios.get(`${API.API_URL}/associations`);
      const all = Array.isArray(res.data) ? res.data : res.data.items || [];
      const filtered = all.filter((a) => {
        if (a == null) return false;
        // accept boolean true or string 'true' or numeric 1
        return a.food === true || a.food === 'true' || a.food === 1 || a.food === '1';
      });
      setAssociations(filtered);
    } catch (err) {
      console.log("Error fetching associations:", err);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate("AssociationInfo", {
          association: item,
          donationType: "food",
        })
      }
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

  const openSidebar = () => setSidebarOpen(true);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <Image
          source={require("../assets/images/image.png")}
          style={[styles.topLogo]}
        />

        <Text style={[styles.headerTitle, { color: text }]}>Food Donation</Text>

        <TouchableOpacity style={styles.menuButtonRight} onPress={openSidebar}>
          <Image
            source={require("../assets/menu.png")}
            style={[styles.menuIcon, { tintColor: text }]}
          />
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
        onPress={() =>
          navigation.navigate("ChatBotScreen", {
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
        <Image
          source={require("../assets/images/zaadbot.png")}
          style={styles.chatbotIcon}
        />
      </TouchableOpacity>

      <SideMenu
        visible={sidebarOpen}
        onClose={closeSidebar}
        navigation={navigation}
        user={{ user_id, username, email, full_name, phone, role, address }}
        sourceScreen="FoodAssociationsScreen"
        darkMode={darkMode}
      />
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
    width: 150,
    height: 100,
    resizeMode: "contain",
    marginLeft: -30,
    marginRight: 10,
    marginBottom: 15,
    marginTop: -10,
  },

  headerTitle: {
    fontFamily: "Times New Roman",
    fontSize: 25,
    marginLeft: -150,
    marginBottom: 30,
  },

  menuButtonRight: {
    padding: -10,
    marginTop: -15,
  },

  menuIcon: {
    width: 45,
    height: 45,
  },

  logo: {
    width: 140,
    height: 140,
    borderRadius: 10,
    margin: 10,
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
  },

  chatbotButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
  },

  chatbotIcon: {
    width: 50,
    height: 50,
    resizeMode: "contain",
  },

  card: {
    width: "47%",
    alignItems: "center",
    borderRadius: 10,
    paddingVertical: 10,
    backgroundColor: "transparent",
  },

  associationName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: -10,
    marginTop: 10,
  },
});
