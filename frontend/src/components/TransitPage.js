import React, { useState, useEffect } from "react";
import axios from "axios";
import { showToast } from "../utils/toastNotifications";

const TransitPage = () => {
  const [transitItems, setTransitItems] = useState([]);
  const [summary, setSummary] = useState({ totalInTransit: 0, byGodown: [] });
  const [loading, setLoading] = useState(true);
  const [selectedGodown, setSelectedGodown] = useState("all");

  const backendUrl =
    process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

  // Fetch transit items
  const fetchTransitItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/transits`);
      setTransitItems(response.data);

      // Fetch summary
      const summaryResponse = await axios.get(
        `${backendUrl}/api/transits/summary`
      );
      setSummary(summaryResponse.data);

      showToast.success(`Loaded ${response.data.length} items in transit`);
    } catch (error) {
      console.error("Error fetching transit items:", error);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Error fetching transit items";
      showToast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransitItems();
  }, []);

  // Update transit status
  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await axios.put(`${backendUrl}/api/transits/${id}/status`, {
        status: newStatus,
      });
      showToast.success(`Status updated to ${newStatus}`);
      fetchTransitItems(); // Refresh the list
    } catch (error) {
      console.error("Error updating status:", error);
      showToast.error("Error updating status");
    }
  };

  // Filter items by godown
  const filteredItems =
    selectedGodown === "all"
      ? transitItems
      : transitItems.filter(
          (item) => item.destinationGodown === selectedGodown
        );

  // Group items by destination
  const groupByDestination = () => {
    const grouped = {};
    filteredItems.forEach((item) => {
      const dest = item.destinationGodown || "Unknown";
      if (!grouped[dest]) {
        grouped[dest] = [];
      }
      grouped[dest].push(item);
    });
    return grouped;
  };

  const groupedItems = groupByDestination();

  const styles = {
    container: {
      background: "linear-gradient(-45deg, #fcb900, #9900ef, #ff6900, #00ff07)",
      backgroundSize: "400% 400%",
      animation: "gradientAnimation 12s ease infinite",
      minHeight: "100vh",
      padding: "20px",
      fontFamily: "'Roboto', sans-serif",
    },
    title: {
      fontSize: "3.5rem",
      color: "white",
      textShadow: "2px 2px 4px rgba(0, 0, 0, 0.4)",
      marginBottom: "20px",
      textAlign: "center",
    },
    summaryCards: {
      display: "flex",
      gap: "20px",
      marginBottom: "30px",
      flexWrap: "wrap",
      justifyContent: "center",
    },
    summaryCard: {
      backgroundColor: "rgba(218, 216, 224, 0.8)",
      padding: "20px",
      borderRadius: "15px",
      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
      minWidth: "200px",
      textAlign: "center",
    },
    cardTitle: {
      fontSize: "14px",
      color: "#666",
      marginBottom: "10px",
      textTransform: "uppercase",
    },
    cardValue: {
      fontSize: "32px",
      fontWeight: "bold",
      color: "#333",
    },
    filterContainer: {
      textAlign: "center",
      marginBottom: "20px",
    },
    select: {
      padding: "10px 20px",
      fontSize: "16px",
      borderRadius: "28px",
      border: "2px solid rgba(255, 255, 255, 0.5)",
      backgroundColor: "rgba(218, 216, 224, 0.8)",
      color: "#333",
      cursor: "pointer",
    },
    groupHeader: {
      backgroundColor: "rgba(218, 216, 224, 0.9)",
      padding: "15px",
      borderRadius: "10px",
      marginBottom: "15px",
      color: "white",
      fontSize: "24px",
      fontWeight: "bold",
      textAlign: "center",
    },
    itemsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
      gap: "20px",
      marginBottom: "30px",
    },
    itemCard: {
      backgroundColor: "rgba(218, 216, 224, 0.6)",
      padding: "20px",
      borderRadius: "15px",
      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
      transition: "transform 0.3s",
    },
    itemValue: {
      fontSize: "20px",
      fontWeight: "bold",
      color: "white",
      marginBottom: "10px",
    },
    itemDetails: {
      fontSize: "14px",
      color: "rgba(255, 255, 255, 0.9)",
      marginBottom: "5px",
    },
    buttonContainer: {
      display: "flex",
      gap: "10px",
      marginTop: "15px",
    },
    button: {
      padding: "8px 16px",
      borderRadius: "20px",
      border: "none",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "bold",
      transition: "all 0.3s",
    },
    deliveredButton: {
      backgroundColor: "#4CAF50",
      color: "white",
    },
    cancelButton: {
      backgroundColor: "#f44336",
      color: "white",
    },
    refreshButton: {
      backgroundColor: "rgba(218, 216, 224, 0.8)",
      color: "white",
      padding: "15px 32px",
      borderRadius: "28px",
      border: "none",
      fontSize: "20px",
      cursor: "pointer",
      margin: "20px auto",
      display: "block",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
    },
  };

  const globalStyles = `
    @keyframes gradientAnimation {
      0% { background-position: 0% 50%; }
      25% { background-position: 50% 100%; }
      50% { background-position: 100% 50%; }
      75% { background-position: 50% 0%; }
      100% { background-position: 0% 50%; }
    }
  `;

  if (loading) {
    return (
      <div style={styles.container}>
        <style>{globalStyles}</style>
        <h2 style={styles.title}>Loading transit data...</h2>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{globalStyles}</style>
      <h2 style={styles.title}>Items in Transit</h2>

      {/* Summary Cards */}
      <div style={styles.summaryCards}>
        <div style={styles.summaryCard}>
          <div style={styles.cardTitle}>Total in Transit</div>
          <div style={styles.cardValue}>{summary.totalInTransit}</div>
        </div>
        {summary.byGodown &&
          summary.byGodown.map((godown, index) => (
            <div key={index} style={styles.summaryCard}>
              <div style={styles.cardTitle}>{godown.godownName}</div>
              <div style={styles.cardValue}>{godown.itemCount} items</div>
            </div>
          ))}
      </div>

      {/* Filter by Godown */}
      <div style={styles.filterContainer}>
        <label
          style={{ color: "white", marginRight: "10px", fontSize: "18px" }}
        >
          Filter by Destination:
        </label>
        <select
          style={styles.select}
          value={selectedGodown}
          onChange={(e) => setSelectedGodown(e.target.value)}
        >
          <option value="all">All Godowns</option>
          {summary.byGodown &&
            summary.byGodown.map((godown, index) => (
              <option key={index} value={godown.godownName}>
                {godown.godownName}
              </option>
            ))}
        </select>
      </div>

      {/* Transit Items Grouped by Destination */}
      {Object.keys(groupedItems).length === 0 ? (
        <div
          style={{
            textAlign: "center",
            color: "white",
            fontSize: "24px",
            marginTop: "50px",
          }}
        >
          No items currently in transit
        </div>
      ) : (
        Object.keys(groupedItems).map((destination) => (
          <div key={destination}>
            <div style={styles.groupHeader}>
              Destination: {destination} ({groupedItems[destination].length}{" "}
              items)
            </div>
            <div style={styles.itemsGrid}>
              {groupedItems[destination].map((item) => (
                <div key={item._id} style={styles.itemCard}>
                  <div style={styles.itemValue}> {item.inputValue}</div>
                  <div style={styles.itemDetails}>
                    <strong>From:</strong> {item.sourceLocation}
                  </div>
                  <div style={styles.itemDetails}>
                    <strong>Quantity:</strong> {item.quantity}
                  </div>
                  <div style={styles.itemDetails}>
                    <strong>Dispatched:</strong>{" "}
                    {new Date(item.dispatchDate).toLocaleString()}
                  </div>
                  {item.estimatedArrival && (
                    <div style={styles.itemDetails}>
                      <strong>Est. Arrival:</strong>{" "}
                      {new Date(item.estimatedArrival).toLocaleString()}
                    </div>
                  )}
                  {item.notes && (
                    <div style={styles.itemDetails}>
                      <strong>Notes:</strong> {item.notes}
                    </div>
                  )}
                  <div style={styles.buttonContainer}>
                    <button
                      style={{ ...styles.button, ...styles.deliveredButton }}
                      onClick={() => handleStatusUpdate(item._id, "Delivered")}
                    >
                      ✓ Mark Delivered
                    </button>
                    <button
                      style={{ ...styles.button, ...styles.cancelButton }}
                      onClick={() => handleStatusUpdate(item._id, "Cancelled")}
                    >
                      ✕ Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Refresh Button */}
      <button style={styles.refreshButton} onClick={fetchTransitItems}>
        Refresh
      </button>
    </div>
  );
};

export default TransitPage;
