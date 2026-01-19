import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import axios from "axios";
import config from "../config";

export default function PendingAssociations() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const API = axios.create({ baseURL: config.API_URL });

  const fetchPending = async () => {
    try {
      const res = await API.get("/admin/pending-associations", {
        headers: { "x-role": "admin" }, // مؤقت
      });
      setData(res.data);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch associations");
    } finally {
      setLoading(false);
    }
  };

  const approveAssociation = async (accountId) => {
    try {
      await API.post(
        `/admin/approve-association/${accountId}`,
        {},
        { headers: { "x-role": "admin" } }
      );
      Alert.alert("Success", "Association approved");
      fetchPending();
    } catch (err) {
      Alert.alert("Error", "Approval failed");
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  if (loading) return <ActivityIndicator style={{ marginTop: 50 }} />;

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.account_id.toString()}
      contentContainerStyle={{ padding: 20 }}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.full_name}</Text>
          <Text>{item.email}</Text>
          <Text>{item.phone}</Text>

          <TouchableOpacity
            style={styles.btn}
            onPress={() => approveAssociation(item.account_id)}
          >
            <Text style={{ color: "#fff" }}>Approve</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    elevation: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  btn: {
    backgroundColor: "#000",
    padding: 10,
    marginTop: 10,
    borderRadius: 6,
    alignItems: "center",
  },
});
