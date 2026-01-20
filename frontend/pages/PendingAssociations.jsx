import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Image,
} from "react-native";
import axios from "axios";
import config from "../config";

export default function PendingAssociations() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const API = axios.create({ baseURL: config.API_URL });

  const fetchPending = async () => {
    try {
      const res = await API.get("/admin/pending-associations");
      setData(res.data);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch associations");
    } finally {
      setLoading(false);
    }
  };

  const approveAssociation = async (accountId) => {
    try {
      await API.post(`/admin/approve-association/${accountId}`);
      Alert.alert("Success", "Association approved");
      fetchPending();
    } catch (err) {
      Alert.alert("Error", "Approval failed");
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  if (loading) {
    return (
      <ActivityIndicator
        style={{ marginTop: 80 }}
        size="large"
        color="#A27571"
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        <Image
          source={require("../assets/images/image.png")}
          style={styles.logo}
        />
        <Text style={styles.headerTitle}>Pending Associations</Text>
      </View>

      {/* ===== LIST ===== */}
      <FlatList
        data={data}
        keyExtractor={(item) => item.account_id.toString()}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.association_authentication && (
              <Image
                source={{
                  uri: `${config.API_URL}${item.association_authentication}`,
                }}
                style={styles.authImage}
              />
            )}

            <Text style={styles.name}>{item.full_name}</Text>
            <Text style={styles.info}>{item.email}</Text>
            <Text style={styles.info}>{item.phone}</Text>

            <TouchableOpacity
              style={styles.btn}
              onPress={() => approveAssociation(item.account_id)}
            >
              <Text style={styles.btnText}>Approve</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No pending associations
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EBE1D7",
    paddingHorizontal: 20,
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 25,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: "contain",
    marginRight: 10,
    marginTop: -40,
    marginLeft: -20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#A27571", 
    marginTop:-50,
    marginLeft: -20,
  },

 
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 18,
    elevation: 3,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2f2f2f",
    marginBottom: 4,
  },
  info: {
    fontSize: 13,
    color: "#555",
  },
  authImage: {
  width: "100%",
  height: 160,
  borderRadius: 10,
  marginTop: 12,
  resizeMode: "contain",
  backgroundColor: "#f5f5f5",
},
  /* BUTTON */
  btn: {
    backgroundColor: "#A27571",
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 14,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },

  emptyText: {
    textAlign: "center",
    marginTop: 60,
    color: "#777",
    fontSize: 14,
  },
});
