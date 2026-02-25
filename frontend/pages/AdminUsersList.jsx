import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AdminUsersList({ route }) {
  const { title, data } = route.params;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* ===== HEADER (LOGO + TITLE) ===== */}
        <View style={styles.header}>
          <Image
            source={require("../assets/images/image.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.headerTitle}>{title}</Text>
        </View>

        {/* ===== TABLE HEADER ===== */}
        <View style={[styles.row, styles.tableHeader]}>
          <Text style={[styles.cell, styles.name, styles.headerText]}>
            Name
          </Text>
          <Text style={[styles.cell, styles.headerText]}>
            Phone
          </Text>
          <Text style={[styles.cell, styles.headerText]}>
            Address
          </Text>
        </View>

        {/* ===== TABLE ROWS ===== */}
        {data.map((item, index) => (
          <View key={index} style={styles.row}>
            <Text style={[styles.cell, styles.name]}>
              {item.name || "-"}
            </Text>
            <Text style={styles.cell}>
              {item.phone || "-"}
            </Text>
            <Text style={styles.cell}>
              {item.address || "-"}
            </Text>
          </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#EBE1D7",
  },

  container: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  /* ===== HEADER ===== */
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 0,        
    marginBottom: 20,
  },

  logo: {
    width: 130,
    height: 130,
    marginLeft: -16,
    marginTop: -25,     
  },

  headerTitle: {
    fontSize: 24,
    color: "#A27571",   
    marginLeft: -4,      
    marginTop: -20,     
    fontWeight: "500",  
  },

  /* ===== TABLE ===== */
  tableHeader: {
    backgroundColor: "#A27571",
    borderRadius: 8,
    marginTop: 10,
  },

  headerText: {
    color: "#fff",
    fontWeight: "600",
  },

  row: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },

  cell: {
    flex: 1,
    fontSize: 13,
    color: "#333",
  },

  name: {
    flex: 1.2,
    fontWeight: "600",
  },
});