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

export default function ClothesAssociationsScreen({ navigation }) {
  const [associations, setAssociations] = useState([]);

  useEffect(() => {
    fetchAssociations();
  }, []);

  const fetchAssociations = async () => {
    try {
      const res = await axios.get(`${API.API_URL}/associations/clothes`);
      setAssociations(res.data);
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
        })
      }
    >
      <Image
        source={{ uri: `${API.API_URL}${item.association_logo}` }}
        style={styles.logo}
      />
      <Text style={styles.name}>{item.name}</Text>
    </TouchableOpacity>
  );

  // SIDEBAR ANIMATION
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-300)).current;

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
      toValue: -300,
      duration: 250,
      useNativeDriver: false,
    }).start(() => setSidebarOpen(false));
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={openSidebar}>
          <Image
            source={require("../assets/menu.png")}
            style={styles.menuIcon}
          />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Image
            source={require("../assets/icon.png")}
            style={styles.headerLogo}
          />
          <Text style={styles.headerTitle}>Zaad</Text>
        </View>
      </View>

      <Text style={styles.title}>Clothes Donation Associations</Text>

      <FlatList
        data={associations}
        renderItem={renderItem}
        keyExtractor={(item) => item.association_id.toString()}
        numColumns={2}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      {/* OVERLAY */}
      {sidebarOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeSidebar}
        />
      )}

      {/* SIDEBAR */}
      <Animated.View style={[styles.sidebar, { left: slideAnim }]}>
        <View style={styles.profileBox}>
          <Image
            source={require("../assets/profile.png")} 
            style={styles.profileImg}
          />
       
        </View>

        <TouchableOpacity style={styles.sideBtn}>
          <Text style={styles.sideBtnText}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideBtn}>
          <Text style={styles.sideBtnText}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideBtn}>
          <Text style={styles.sideBtnText}>Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideBtn}>
          <Text style={styles.sideBtnText}>Search</Text>
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
    backgroundColor: "#F5E9DD",
    paddingTop: 10,
    paddingHorizontal: 10,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: "#fff",
    elevation: 4,
    borderRadius: 12,
    marginBottom: 15,
  },

  menuButton: {
    paddingLeft: 10,
  },

  menuIcon: {
    width: 28,
    height: 28,
  },

  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },

  headerLogo: {
    width: 36,
    height: 36,
    marginRight: 8,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 15,
    color: "#8B5E3C",
  },

  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 10,
    margin: 8,
    alignItems: "center",
    elevation: 3,
  },

  logo: {
    width: 120,
    height: 120,
    borderRadius: 10,
  },

  name: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
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

  sidebar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: "#fff",
    paddingTop: 40,
    zIndex: 10,
    elevation: 10,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },

  profileBox: {
    alignItems: "center",
    marginBottom: 20,
  },

  profileImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },

  username: {
    fontSize: 18,
    fontWeight: "bold",
  },

  email: {
    fontSize: 14,
    color: "#555",
  },

  sideBtn: {
    paddingVertical: 15,
    paddingHorizontal: 20,
  },

  sideBtnText: {
    fontSize: 16,
    color: "#333",
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
