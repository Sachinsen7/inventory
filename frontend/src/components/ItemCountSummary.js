import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { showToast } from "../utils/toastNotifications";

const ItemCountSummary = () => {
  const [inventory, setInventory] = useState([]);
  const [godownNames, setGodownNames] = useState([]);
  const [summary, setSummary] = useState({
    totalItems: 0,
    totalQuantity: 0,
    totalFactory: 0,
    totalInTransit: 0,
  });
  const [loading, setLoading] = useState(true);

  // Backend URL from environment variable
  const backendUrl =
    process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

  // Fetch data from backend (MongoDB)
  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${backendUrl}/api/inventory/comprehensive-summary`
      );

      setInventory(response.data.inventory || []);
      setGodownNames(response.data.godownNames || []);
      setSummary(
        response.data.summary || {
          totalItems: 0,
          totalQuantity: 0,
          totalFactory: 0,
          totalInTransit: 0,
        }
      );

      if (response.data.inventory.length === 0) {
        showToast.info("No inventory data available");
      } else {
        showToast.success(`Loaded ${response.data.inventory.length} items`);
      }
    } catch (error) {
      console.log("Error fetching inventory data: ", error);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Error fetching inventory data";
      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        showToast.error(
          "Connection timeout. Please check your internet connection."
        );
      } else if (error.response) {
        showToast.error(
          `Backend error: ${error.response.status} - ${errorMsg}`
        );
      } else if (error.request) {
        showToast.error(
          "Unable to connect to the server. Please check if the backend is running."
        );
      } else {
        showToast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      background: "linear-gradient(-45deg, #fcb900, #9900ef, #ff6900, #00ff07)",
      backgroundSize: "400% 400%",
      animation: "gradientAnimation 12s ease infinite",
      minHeight: "100vh",
      padding: "20px",
      fontFamily: "'Roboto', sans-serif",
      color: "#333",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    },
    title: {
      fontSize: "3.9rem",
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
    tableContainer: {
      width: "95%",
      overflowX: "auto",
      marginBottom: "20px",
    },
    table: {
      width: "100%",
      minWidth: "800px",
      margin: "0 auto",
      borderCollapse: "collapse",
      backgroundColor: "rgba(218, 216, 224, 0.6)",
      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
      borderRadius: "15px",
      overflow: "hidden",
    },
    th: {
      border: "1px solid #ccc",
      padding: "12px 8px",
      backgroundColor: "rgba(218, 216, 224, 0.8)",
      color: "#fff",
      fontSize: "14px",
      textAlign: "center",
      fontWeight: "bold",
      position: "sticky",
      top: 0,
      zIndex: 10,
    },
    td: {
      border: "1px solid #ccc",
      padding: "12px 8px",
      textAlign: "center",
      fontSize: "14px",
      color: "white",
    },
    tr: {
      transition: "background 0.3s",
    },
    trHover: {
      backgroundColor: "rgba(218, 216, 224, 0.6)",
    },
    button: {
      backgroundColor: "rgba(218, 216, 224, 0.8)",
      color: "white",
      border: "none",
      padding: "15px 32px",
      textAlign: "center",
      textDecoration: "none",
      display: "inline-block",
      fontSize: "20px",
      margin: "10px",
      borderRadius: "28px",
      cursor: "pointer",
      boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
      transition: "background-color 0.3s ease, transform 0.3s ease",
      fontFamily: "'Poppins', sans-serif",
    },
    loadingText: {
      fontSize: "24px",
      color: "white",
      textAlign: "center",
      marginTop: "50px",
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
        <p style={styles.loadingText}>Loading inventory data...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{globalStyles}</style>
      <h2 style={styles.title}>Comprehensive Item Inventory</h2>

      {/* Summary Cards */}
      <div style={styles.summaryCards}>
        <div style={styles.summaryCard}>
          <div style={styles.cardTitle}>Total Items</div>
          <div style={styles.cardValue}>{summary.totalItems}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.cardTitle}>Total Quantity</div>
          <div style={styles.cardValue}>{summary.totalQuantity}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.cardTitle}>Factory Inventory</div>
          <div style={styles.cardValue}>{summary.totalFactory}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.cardTitle}>In Transit</div>
          <div style={styles.cardValue}>{summary.totalInTransit}</div>
        </div>
      </div>

      {/* Buttons */}
      <div>
        <button
          style={styles.button}
          onMouseEnter={(e) => (e.target.style.transform = "scale(1.1)")}
          onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
        >
          <Link
            to="/BarcodeTable"
            style={{
              color: "white",
              textDecoration: "none",
            }}
          >
            Barcode History
          </Link>
        </button>

        <button
          style={styles.button}
          onClick={fetchInventoryData}
          onMouseEnter={(e) => (e.target.style.transform = "scale(1.1)")}
          onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
        >
          Refresh Data
        </button>
      </div>

      {/* Inventory Table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>S.No.</th>
              <th style={styles.th}>Item Name</th>
              <th style={styles.th}>Total Quantity</th>
              <th style={styles.th}>Factory Inventory</th>
              <th style={styles.th}>In Transit</th>
              {godownNames.map((godownName, index) => (
                <th key={index} style={styles.th}>
                  {godownName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inventory.length === 0 ? (
              <tr>
                <td
                  colSpan={5 + godownNames.length}
                  style={{ ...styles.td, padding: "30px" }}
                >
                  No inventory data available. Please add items to the system.
                </td>
              </tr>
            ) : (
              inventory.map((item, index) => (
                <tr
                  key={index}
                  style={styles.tr}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      styles.trHover.backgroundColor)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <td style={styles.td}>{index + 1}</td>
                  <td style={{ ...styles.td, fontWeight: "bold" }}>
                    {item.itemName}
                  </td>
                  <td
                    style={{
                      ...styles.td,
                      fontWeight: "bold",
                      color: "#4CAF50",
                    }}
                  >
                    {item.totalQuantity}
                  </td>
                  <td style={styles.td}>{item.factoryInventory || 0}</td>
                  <td style={styles.td}>{item.inTransit || 0}</td>
                  {godownNames.map((godownName, gIndex) => (
                    <td key={gIndex} style={styles.td}>
                      {item.godowns[godownName] || 0}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {inventory.length > 0 && (
            <tfoot>
              <tr style={{ backgroundColor: "rgba(218, 216, 224, 0.9)" }}>
                <td
                  colSpan="2"
                  style={{
                    ...styles.th,
                    textAlign: "right",
                    fontWeight: "bold",
                  }}
                >
                  TOTALS:
                </td>
                <td
                  style={{ ...styles.th, fontWeight: "bold", color: "#4CAF50" }}
                >
                  {inventory.reduce((sum, item) => sum + item.totalQuantity, 0)}
                </td>
                <td style={{ ...styles.th, fontWeight: "bold" }}>
                  {inventory.reduce(
                    (sum, item) => sum + (item.factoryInventory || 0),
                    0
                  )}
                </td>
                <td style={{ ...styles.th, fontWeight: "bold" }}>
                  {inventory.reduce(
                    (sum, item) => sum + (item.inTransit || 0),
                    0
                  )}
                </td>
                {godownNames.map((godownName, gIndex) => (
                  <td key={gIndex} style={{ ...styles.th, fontWeight: "bold" }}>
                    {inventory.reduce(
                      (sum, item) => sum + (item.godowns[godownName] || 0),
                      0
                    )}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default ItemCountSummary;
