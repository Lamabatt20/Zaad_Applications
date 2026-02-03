import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import axios from "axios";
import API from "../config";

export default function DonationsReport() {
  const [report, setReport] = useState(null);

  useEffect(() => {
    axios
      .get(`${API.API_URL}/admin/donation-report`)
      .then(res => setReport(res.data.data))
      .catch(err => console.log(err));
  }, []);

  if (!report) return null;

  return (
    <ScrollView style={styles.container}>

      {/* ===== KPIs ===== */}
      <View style={styles.row}>
        <Card title="Donations" value={report.total_donations} />
        <Card title="Associations" value={report.total_associations} />
      </View>

      <View style={styles.row}>
        <Card title="Donors" value={report.total_donors} />
        <Card title="Delivery" value={report.total_delivery_persons} />
      </View>

      <Card
        title="Average Rating"
        value={`⭐ ${report.avg_rating}`}
        full
      />

      {/* ===== Donations by Status ===== */}
      <Section title="Donations by Status">
        {report.donations_by_status.map(item => (
          <Line
            key={item.status}
            label={item.status}
            value={item.count}
          />
        ))}
      </Section>

      {/* ===== Donations by Type ===== */}
      <Section title="Donations by Type">
        {report.donations_by_type.map(item => (
          <Line
            key={item.donation_type}
            label={item.donation_type}
            value={item.count}
          />
        ))}
      </Section>

      <Section title="Latest Donor Ratings">
        {!report.donor_ratings || report.donor_ratings.length === 0 ? (
            <Text style={styles.emptyText}>No ratings yet</Text>
        ) : (
            report.donor_ratings.map((item, index) => (
            <View key={index} style={styles.ratingCard}>
                <Text style={styles.ratingName}>
                {item.donor_name}
                </Text>

                <Text style={styles.ratingInfo}>
                Donation #{item.donation_id}
                </Text>

                <Text style={styles.ratingStars}>
                {"⭐".repeat(item.rating)} ({item.rating}/5)
                </Text>

                {item.comment ? (
                <Text style={styles.ratingComment}>
                    “{item.comment}”
                </Text>
                ) : null}
            </View>
            ))
        )}
        </Section>

    </ScrollView>
  );
}

/* ===== Components ===== */

const Card = ({ title, value, full }) => (
  <View style={[styles.card, full && { width: "100%" }]}>
    <Text style={styles.cardTitle}>{title}</Text>
    <Text style={styles.cardValue}>{value}</Text>
  </View>
);

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const Line = ({ label, value }) => (
  <View style={styles.line}>
    <Text style={styles.lineLabel}>{label}</Text>
    <Text style={styles.lineValue}>{value}</Text>
  </View>
);

/* ===== Styles ===== */

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#EBE1D7",
    paddingHorizontal: 16,
    paddingTop: 40,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  card: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },

  cardTitle: {
    color: "#A27571",
    fontSize: 13,
    marginBottom: 6,
  },

  cardValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2f2f2f",
  },

  section: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
    color: "#2f2f2f",
  },

  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },

  lineLabel: {
    color: "#555",
  },

  lineValue: {
    fontWeight: "600",
  },

  ratingCard: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingVertical: 10,
  },

  ratingName: {
    fontWeight: "600",
    color: "#2f2f2f",
  },

  ratingInfo: {
    fontSize: 12,
    color: "#777",
  },

  ratingStars: {
    marginTop: 4,
    color: "#A27571",
  },

  ratingComment: {
    marginTop: 4,
    fontStyle: "italic",
    color: "#555",
  },

  emptyText: {
    textAlign: "center",
    color: "#777",
    paddingVertical: 10,
  },
});