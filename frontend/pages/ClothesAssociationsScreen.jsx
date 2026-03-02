import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, FlatList, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SideMenu from "../components/SideMenu";
import axios from "axios";
import API from "../config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ClothesAssociationsScreen({ navigation, route }) {
  const [associations, setAssociations] = useState([]);
  const [allAssociations, setAllAssociations] = useState([]);
  const [showLocationFilters, setShowLocationFilters] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const { user_id, username, email, full_name, phone, role, address } =
    route?.params || {};
  const donationType =
    route?.params?.donationType || route?.params?.type || "clothes";
  
  // ✅ Get location filter from route params (from ChatBot)
  const filterLocation = route?.params?.location;

  const locations = [
    "Ramallah",
    "Hebron",
    "Nablus",
    "Jenin",
    "Jericho",
    "Tulkarem",
    "Bethlehem",
  ];

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

  useEffect(() => {
    applyFilters();
  }, [allAssociations, filterLocation, selectedLocation]);

  const fetchAssociations = async () => {
    try {
      const res = await axios.get(`${API.API_URL}/associations/${donationType}`);
      let data = Array.isArray(res.data) ? res.data : res.data.items || [];
      setAllAssociations(data);
    } catch (err) {
    }
  };

  const associationSearchText = (association) => {
    return [
      association?.name,
      association?.description,
      association?.address,
      association?.city,
      association?.location,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  };

  const applyFilters = () => {
    let data = allAssociations;

    if (filterLocation) {
      data = data.filter((a) =>
        associationSearchText(a).includes(filterLocation.toLowerCase())
      );
    }

    if (selectedLocation) {
      data = data.filter((a) =>
        associationSearchText(a).includes(selectedLocation.toLowerCase())
      );
    }

    setAssociations(data);
  };

  const bg = darkMode ? "#1c1c1c" : "#EBE1D7";
  const text = darkMode ? "#fff" : "#2f2f2f";

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate("AssociationInfo", { association: item, donationType: 'clothes' })
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

  const openSidebar = () => setSidebarOpen(true);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <Image
          source={require("../assets/images/image.png")}
          style={styles.topLogo}
        />

        <Text style={[styles.headerTitle, { color: text }]}>Clothes Donation</Text>

        <View style={styles.headerRightButtons}>
          <TouchableOpacity
            style={styles.filterButtonHeader}
            onPress={() => setShowLocationFilters(true)}
          >
            <Ionicons name="filter" size={24} color={text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButtonRight} onPress={openSidebar}>
            <Image source={require("../assets/menu.png")} style={[styles.menuIcon, { tintColor: text }]} />
          </TouchableOpacity>
        </View>
      </View>

      {selectedLocation && (
        <View style={styles.selectedFilterContainer}>
          <Text style={[styles.selectedFilterText, { color: text }]}>City: {selectedLocation}</Text>
          <TouchableOpacity onPress={() => setSelectedLocation(null)}>
            <Ionicons name="close-circle" size={18} color={text} />
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={showLocationFilters}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLocationFilters(false)}
      >
        <Pressable
          style={styles.filterModalOverlay}
          onPress={() => setShowLocationFilters(false)}
        >
          <Pressable
            style={[
              styles.filterModalCard,
              { backgroundColor: darkMode ? "#2b2b2b" : "#fff" },
            ]}
            onPress={() => {}}
          >
            <Text style={[styles.filterModalTitle, { color: text }]}>Filter by city</Text>

            {locations.map((location) => {
              const active = selectedLocation === location;
              return (
                <TouchableOpacity
                  key={location}
                  style={styles.filterOptionRow}
                  onPress={() => {
                    setSelectedLocation(location);
                    setShowLocationFilters(false);
                  }}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      { color: active ? "#4CAF50" : text },
                    ]}
                  >
                    {location}
                  </Text>
                  {active && <Ionicons name="checkmark" size={18} color="#4CAF50" />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

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
        onPress={() => navigation.navigate("ChatBotScreen", { user_id, username, email, full_name, phone, role, address })}
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
        sourceScreen="ClothesAssociationsScreen"
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
    color: "#8b6f69",
    marginLeft: -100,
    marginBottom: 30,
  },

  menuButtonRight: {
    marginTop: -15,
  },

  headerRightButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  filterButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.08)",
    marginTop: -15,
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

  selectedFilterContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginLeft: 15,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.08)",
  },

  selectedFilterText: {
    fontSize: 13,
    marginRight: 6,
    fontWeight: "500",
  },

  filterModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  filterModalCard: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },

  filterModalTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 8,
    paddingHorizontal: 6,
  },

  filterOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },

  filterOptionText: {
    fontSize: 15,
    fontWeight: "500",
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
