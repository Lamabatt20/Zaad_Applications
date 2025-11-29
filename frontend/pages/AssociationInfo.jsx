import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import API from "../config";

export default function AssociationInfo({ route, navigation }) {
  const { association } = route.params;

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <Image
          source={require("../assets/images/logo1.png")}
          style={styles.headerLogo}
        />
        <Text style={styles.headerTitle}>{association.name}</Text>
      </View>

    
      <View style={styles.card}>
        <View style={styles.row}>
          <Image
          source={{ uri: `${API.API_URL}${association.association_logo}` }}
          style={styles.cardImage}
        />
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>{association.name}</Text>
            <Text style={styles.cardDescription}>
             {association.description
              || "No description available."}
            </Text>
          </View>
        </View>
      </View>

      
      <Text style={styles.question}>
        Do you want to donate to this association?
      </Text>

      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.btnYes}
          onPress={() => navigation.navigate("DonateClothesScreen")}
        >
          <Text style={styles.btnText}>Yes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnNo}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.btnText}>No</Text>
        </TouchableOpacity>
      </View>

      
      <Image
        source={require("../assets/images/Z A A D.png")}
        style={styles.bottomLogo}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EBE1D7",
    paddingTop: 60,
    alignItems: "center",
  },

  
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  headerLogo: {
    width: 160,
    height: 100,
    resizeMode: "contain",
    marginLeft: -130,
    marginRight: 10,
    marginTop:-10,

  },
  headerTitle: {
    fontFamily: "Times New Roman",
    fontSize: 25,
    color: "#8b6f69",
     marginLeft: -40,
  },

  
  card: {
    width: "90%",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 30,
    marginTop:30,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },

  cardTextContainer: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#00000",
  },

  cardDescription: {
    fontSize: 14,
    color: "#444",
    marginTop: 5,
  },

  
  question: {
    fontSize: 17,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
  },

  
  buttonsContainer: {
    width: "80%",
    flexDirection: "column",
    gap: 10,
  },

  btnYes: {
    backgroundColor: "#A27571",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  btnNo: {
    backgroundColor: "#C6AAA3",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    opacity: 0.85,
  },

  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  bottomLogo: {
    width: 80,
    height: 80,
    resizeMode: "contain",
    position: "absolute",
    bottom: 10,
  },
});
