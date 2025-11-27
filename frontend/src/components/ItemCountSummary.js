import React, { useState, useEffect, useMemo } from "react";
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
  const [showAllGodowns, setShowAllGodowns] = useState(false);

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

  // Calculate active godowns (those with at least one item having quantity > 0)
  const activeGodowns = useMemo(() => {
    if (!inventory.length || !godownNames.length) return [];

    return godownNames.filter(godown => {
      return inventory.some(item => (item.godowns[godown] || 0) > 0);
    });
  }, [inventory, godownNames]);

  // Determine which godowns to show based on toggle
  const visibleGodowns = showAllGodowns ? godownNames : activeGodowns;

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
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      padding: "20px",
      borderRadius: "15px",
      boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)",
      minWidth: "200px",
      textAlign: "center",
      transition: "transform 0.3s ease",
    },
    cardTitle: {
      fontSize: "14px",
      color: "#666",
      marginBottom: "10px",
      textTransform: "uppercase",
      fontWeight: "bold",
      letterSpacing: "1px",
    },
    cardValue: {
      fontSize: "36px",
      fontWeight: "bold",
      color: "#333",
      background: "linear-gradient(45deg, #333, #666)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    },
    tableContainer: {
      width: "95%",
      overflowX: "auto",
      marginBottom: "20px",
      borderRadius: "15px",
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
    },
    table: {
      width: "100%",
      minWidth: "800px",
      margin: "0 auto",
      borderCollapse: "separate",
      borderSpacing: "0",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      overflow: "hidden",
    },
    th: {
      padding: "15px 10px",
      backgroundColor: "#2c3e50",
      color: "#fff",
      fontSize: "14px",
      textAlign: "center",
      fontWeight: "bold",
      position: "sticky",
      top: 0,
      zIndex: 10,
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      borderBottom: "3px solid #1a252f",
    },
    td: {
      padding: "12px 10px",
      textAlign: "center",
      fontSize: "14px",
      color: "#333",
      borderBottom: "1px solid #eee",
      transition: "background 0.2s",
    },
    tr: {
      transition: "background 0.2s",
    },
    trHover: {
      backgroundColor: "#f8f9fa",
    },
    zeroValue: {
      color: "#ccc",
      fontWeight: "normal",
    },
    positiveValue: {
      color: "#27ae60",
      fontWeight: "bold",
      fontSize: "15px",
    },
    buttonContainer: {
      display: "flex",
      gap: "15px",
      marginBottom: "20px",
      flexWrap: "wrap",
      justifyContent: "center",
    },
    button: {
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      backdropFilter: "blur(5px)",
      color: "white",
      border: "1px solid rgba(255, 255, 255, 0.4)",
      padding: "12px 24px",
      textAlign: "center",
      textDecoration: "none",
      display: "inline-block",
      fontSize: "16px",
      borderRadius: "50px",
      cursor: "pointer",
      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
      transition: "all 0.3s ease",
      fontWeight: "bold",
    },
    activeButton: {
      backgroundColor: "white",
      color: "#333",
      transform: "translateY(-2px)",
      boxShadow: "0 6px 12px rgba(0,0,0,0.2)",
    },
    loadingText: {
      fontSize: "24px",
      color: "white",
      textAlign: "center",
      marginTop: "50px",
      textShadow: "0 2px 4px rgba(0,0,0,0.3)",
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
      <div style={styles.buttonContainer}>
        <button
          style={styles.button}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "white";
            e.target.style.color = "#333";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
            e.target.style.color = "white";
          }}
        >
          <Link
            to="/BarcodeTable"
            style={{ color: "inherit", textDecoration: "none", display: "block" }}
          >
            📜 Barcode History
          </Link>
        </button>

        <button
          style={styles.button}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "white";
            e.target.style.color = "#333";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
            e.target.style.color = "white";
          }}
        >
          <Link
            to="/all-products"
            style={{ color: "inherit", textDecoration: "none", display: "block" }}
          >
            📦 All Products
          </Link>
        </button>

        <button
          style={{
            ...styles.button,
            ...(showAllGodowns ? styles.activeButton : {}),
          }}
          onClick={() => setShowAllGodowns(!showAllGodowns)}
        >
          {showAllGodowns ? "👁️ Hide Empty Godowns" : "👁️ Show All Godowns"}
        </button>

        <button
          style={styles.button}
          onClick={fetchInventoryData}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "white";
            e.target.style.color = "#333";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
            e.target.style.color = "white";
          }}
        >
          🔄 Refresh Data
        </button>
      </div>

      {/* Inventory Table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>S.No.</th>
              <th style={{ ...styles.th, textAlign: "left", paddingLeft: "20px" }}>Item Name</th>
              <th style={styles.th}>Total Qty</th>
              <th style={{ ...styles.th, backgroundColor: "#34495e" }}>Factory</th>
              <th style={{ ...styles.th, backgroundColor: "#34495e" }}>Transit</th>
              {visibleGodowns.map((godownName, index) => (
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
                  colSpan={5 + visibleGodowns.length}
                  style={{ ...styles.td, padding: "40px", fontStyle: "italic", color: "#666" }}
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
                    (e.currentTarget.style.backgroundColor = "#f1f2f6")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <td style={styles.td}>{index + 1}</td>
                  <td style={{ ...styles.td, textAlign: "left", paddingLeft: "20px", fontWeight: "600" }}>
                    {item.itemName}
                  </td>
                  <td style={styles.td}>
                    <span style={item.totalQuantity > 0 ? styles.positiveValue : styles.zeroValue}>
                      {item.totalQuantity}
                    </span>
                  </td>
                  <td style={{ ...styles.td, backgroundColor: "rgba(52, 73, 94, 0.05)" }}>
                    <span style={(item.factoryInventory || 0) > 0 ? styles.positiveValue : styles.zeroValue}>
                      {item.factoryInventory || 0}
                    </span>
                  </td>
                  <td style={{ ...styles.td, backgroundColor: "rgba(52, 73, 94, 0.05)" }}>
                    <span style={(item.inTransit || 0) > 0 ? styles.positiveValue : styles.zeroValue}>
                      {item.inTransit || 0}
                    </span>
                  </td>
                  {visibleGodowns.map((godownName, gIndex) => {
                    const qty = item.godowns[godownName] || 0;
                    return (
                      <td key={gIndex} style={styles.td}>
                        <span style={qty > 0 ? styles.positiveValue : styles.zeroValue}>
                          {qty}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
          {inventory.length > 0 && (
            <tfoot>
              <tr style={{ backgroundColor: "#ecf0f1", borderTop: "2px solid #bdc3c7" }}>
                <td
                  colSpan="2"
                  style={{
                    ...styles.td,
                    textAlign: "right",
                    fontWeight: "bold",
                    fontSize: "16px",
                    paddingRight: "20px",
                  }}
                >
                  TOTALS:
                </td>
                <td style={{ ...styles.td, fontWeight: "bold", fontSize: "16px", color: "#27ae60" }}>
                  {inventory.reduce((sum, item) => sum + item.totalQuantity, 0)}
                </td>
                <td style={{ ...styles.td, fontWeight: "bold" }}>
                  {inventory.reduce(
                    (sum, item) => sum + (item.factoryInventory || 0),
                    0
                  )}
                </td>
                <td style={{ ...styles.td, fontWeight: "bold" }}>
                  {inventory.reduce(
                    (sum, item) => sum + (item.inTransit || 0),
                    0
                  )}
                </td>
                {visibleGodowns.map((godownName, gIndex) => (
                  <td key={gIndex} style={{ ...styles.td, fontWeight: "bold" }}>
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
