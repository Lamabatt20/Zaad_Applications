import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import API from "../config";

export default function AssociationInfo({ route, navigation }) {
  const { association } = route.params;

  return (
    <View style={styles.container}>

      {/* HEADER LOGO + NAME */}
      <View style={styles.header}>
        <Image
          source={{ uri: `${API.API_URL}${association.association_logo}` }}
          style={styles.logo}
        />
        <Text style={styles.title}>{association.name}</Text>
      </View>

      {/* DESCRIPTION */}
      <Text style={styles.description}>
        {association.description || "No description available."}
      </Text>

      {/* MESSAGE */}
      <Text style={styles.question}>
        Do you want to donate to this association?
      </Text>

      {/* BUTTONS */}
      <View style={styles.buttons}>
        {/* YES */}
        <TouchableOpacity
          style={styles.yesBtn}
          onPress={() => navigation.navigate("DonateClothesScreen")}
        >
          <Text style={styles.btnText}>Yes</Text>
        </TouchableOpacity>

        {/* NO */}
        <TouchableOpacity
          style={styles.noBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.btnText}>No</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5E9DD",
    padding: 20,
  },

  header: {
    alignItems: "center",
    marginBottom: 20,
  },

  logo: {
    width: 140,
    height: 140,
    resizeMode: "contain",
    borderRadius: 10,
  },

  title: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: "700",
    color: "#8B5E3C",
  },

  description: {
    fontSize: 16,
    color: "#444",
    marginBottom: 30,
    textAlign: "center",
  },

  question: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
  },

  buttons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },

  yesBtn: {
    backgroundColor: "#3A85FF",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },

  noBtn: {
    backgroundColor: "#C94A4A",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },

  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
