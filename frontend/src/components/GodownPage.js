import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { showToast } from "../utils/toastNotifications";

const GodownPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const godown = location.state.godown;

  const [despatchData, setDespatchData] = useState([]);
  const [deliveryData, setDeliveryData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Backend URL from environment variable
  const backendUrl =
    process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

  useEffect(() => {
    if (godown) {
      fetchInventoryData();
    }
  }, [godown]);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      // Fetch despatch data (items in godown)
      const despatchRes = await axios.get(`${backendUrl}/api/despatch`);
      const filteredDespatch = despatchRes.data.filter(
        (item) => item.godownName === godown.name
      );
      setDespatchData(filteredDespatch);

      // Fetch delivery data (items ready for delivery)
      const deliveryRes = await axios.get(`${backendUrl}/api/products3`);
      const filteredDelivery = deliveryRes.data.filter(
        (item) => item.godownName === godown.name
      );
      setDeliveryData(filteredDelivery);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      showToast.error("Error loading inventory data");
      setLoading(false);
    }
  };

  const handleDeliveryClick = () => {
    navigate("/delivery", { state: { godown } });
  };

  const handleInventoryClick = () => {
    navigate("/inventory", { state: { godown } });
  };

  const handleDispatchClick = () => {
    navigate("/dgodowndetails", { state: { godown } });
  };

  // Group data by item code prefix
  const groupData = (dataArray) => {
    const grouped = {};
    dataArray.forEach((item) => {
      const prefix = item.inputValue.substring(0, 3);
      if (grouped[prefix]) {
        grouped[prefix].count += 1;
        if (!grouped[prefix].allValues.includes(item.inputValue)) {
          grouped[prefix].allValues.push(item.inputValue);
        }
      } else {
        grouped[prefix] = {
          option: prefix,
          allValues: [item.inputValue],
          count: 1,
        };
      }
    });
    return Object.values(grouped);
  };

  const styles = {
    container: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      minHeight: "100vh",
      background: "linear-gradient(-45deg, #fcb900, #9900ef, #ff6900, #00ff07)",
      backgroundSize: "400% 400%",
      animation: "gradientAnimation 12s ease infinite",
      padding: "20px",
    },
    content: {
      width: "100%",
      maxWidth: "1200px",
      backgroundColor: "rgba(218, 216, 224, 0.95)",
      borderRadius: "15px",
      padding: "30px",
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
    },
    header: {
      color: "white",
      marginBottom: "10px",
      fontSize: "3rem",
      fontFamily: "'Poppins', sans-serif",
      fontWeight: "bold",
      textShadow: "2px 2px 5px rgba(0, 0, 0, 0.3)",
      textAlign: "center",
    },
    subtitle: {
      fontSize: "1.3rem",
      color: "white",
      marginBottom: "20px",
      textAlign: "center",
    },
    infoCard: {
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      padding: "15px",
      borderRadius: "10px",
      marginBottom: "20px",
      textAlign: "center",
    },
    infoText: {
      fontSize: "1.2rem",
      color: "white",
      marginBottom: "5px",
    },
    buttonContainer: {
      display: "flex",
      gap: "15px",
      justifyContent: "center",
      marginTop: "20px",
      marginBottom: "30px",
      flexWrap: "wrap",
    },
    button: {
      backgroundColor: "rgba(218, 216, 224, 0.8)",
      color: "#fff",
      padding: "12px 24px",
      border: "none",
      borderRadius: "28px",
      fontSize: "1.2rem",
      fontWeight: "bold",
      cursor: "pointer",
      transition: "all 0.3s ease",
      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
    },
    statsContainer: {
      display: "flex",
      justifyContent: "space-around",
      marginBottom: "30px",
      gap: "15px",
      flexWrap: "wrap",
    },
    statCard: {
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      padding: "20px",
      borderRadius: "10px",
      minWidth: "150px",
      textAlign: "center",
    },
    statLabel: {
      fontSize: "14px",
      color: "rgba(255, 255, 255, 0.8)",
      marginBottom: "5px",
      textTransform: "uppercase",
    },
    statValue: {
      fontSize: "32px",
      fontWeight: "bold",
      color: "white",
    },
    tableContainer: {
      marginTop: "20px",
    },
    tableTitle: {
      color: "white",
      fontSize: "1.5rem",
      marginBottom: "15px",
      textAlign: "center",
      fontWeight: "bold",
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
        <div style={styles.content}>
          <h2 style={styles.header}>Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{globalStyles}</style>
      <div style={styles.content}>
        <h2 style={styles.header}>Godown Dashboard</h2>

        {/* Godown Info */}
        <div style={styles.infoCard}>
          <p style={styles.infoText}>
            <strong>Name:</strong> {godown.name}
          </p>
          <p style={styles.infoText}>
            <strong>Address:</strong> {godown.address}
          </p>
        </div>

        {/* Statistics */}
        <div style={styles.statsContainer}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>In Godown</div>
            <div style={styles.statValue}>{despatchData.length}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Ready for Delivery</div>
            <div style={styles.statValue}>{deliveryData.length}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Items</div>
            <div style={styles.statValue}>
              {despatchData.length + deliveryData.length}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.buttonContainer}>
          <button
            onClick={handleDispatchClick}
            style={styles.button}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-3px)";
              e.target.style.boxShadow = "0 6px 15px rgba(0, 0, 0, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.2)";
            }}
          >
            Dispatch Items
          </button>
          <button
            onClick={handleDeliveryClick}
            style={styles.button}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-3px)";
              e.target.style.boxShadow = "0 6px 15px rgba(0, 0, 0, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.2)";
            }}
          >
            Process Delivery
          </button>
          <button
            onClick={handleInventoryClick}
            style={styles.button}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-3px)";
              e.target.style.boxShadow = "0 6px 15px rgba(0, 0, 0, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.2)";
            }}
          >
            View Full Inventory
          </button>
        </div>

        {/* Godown Inventory Table */}
        <div style={styles.tableContainer}>
          <h3 style={styles.tableTitle}>Items in Godown</h3>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
              backgroundColor: "white",
              borderRadius: "10px",
              overflow: "hidden",
              marginBottom: "30px",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "rgba(76, 175, 80, 0.8)",
                  color: "white",
                }}
              >
                <th style={{ border: "1px solid #ddd", padding: "12px" }}>
                  Serial No.
                </th>
                <th style={{ border: "1px solid #ddd", padding: "12px" }}>
                  Item Code
                </th>
                <th style={{ border: "1px solid #ddd", padding: "12px" }}>
                  All Values
                </th>
                <th style={{ border: "1px solid #ddd", padding: "12px" }}>
                  Count
                </th>
              </tr>
            </thead>
            <tbody>
              {groupData(despatchData).length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#666",
                      fontStyle: "italic",
                    }}
                  >
                    No items in godown yet
                  </td>
                </tr>
              ) : (
                groupData(despatchData).map((group, index) => (
                  <tr
                    key={index}
                    style={{
                      textAlign: "center",
                      backgroundColor: index % 2 === 0 ? "#f9f9f9" : "white",
                    }}
                  >
                    <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                      {index + 1}
                    </td>
                    <td
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                        fontWeight: "bold",
                      }}
                    >
                      {group.option}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                      <select
                        style={{
                          width: "100%",
                          padding: "8px",
                          borderRadius: "8px",
                          border: "1px solid #ddd",
                        }}
                      >
                        {group.allValues.map((value, subIndex) => (
                          <option key={subIndex} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                        fontWeight: "bold",
                        color: "#4CAF50",
                      }}
                    >
                      {group.count}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Delivery Ready Table */}
        <div style={styles.tableContainer}>
          <h3 style={styles.tableTitle}>Items Ready for Delivery</h3>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
              backgroundColor: "white",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "rgba(33, 150, 243, 0.8)",
                  color: "white",
                }}
              >
                <th style={{ border: "1px solid #ddd", padding: "12px" }}>
                  Serial No.
                </th>
                <th style={{ border: "1px solid #ddd", padding: "12px" }}>
                  Item Code
                </th>
                <th style={{ border: "1px solid #ddd", padding: "12px" }}>
                  All Values
                </th>
                <th style={{ border: "1px solid #ddd", padding: "12px" }}>
                  Count
                </th>
              </tr>
            </thead>
            <tbody>
              {groupData(deliveryData).length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#666",
                      fontStyle: "italic",
                    }}
                  >
                    No items ready for delivery yet
                  </td>
                </tr>
              ) : (
                groupData(deliveryData).map((group, index) => (
                  <tr
                    key={index}
                    style={{
                      textAlign: "center",
                      backgroundColor: index % 2 === 0 ? "#f9f9f9" : "white",
                    }}
                  >
                    <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                      {index + 1}
                    </td>
                    <td
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                        fontWeight: "bold",
                      }}
                    >
                      {group.option}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                      <select
                        style={{
                          width: "100%",
                          padding: "8px",
                          borderRadius: "8px",
                          border: "1px solid #ddd",
                        }}
                      >
                        {group.allValues.map((value, subIndex) => (
                          <option key={subIndex} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                        fontWeight: "bold",
                        color: "#2196F3",
                      }}
                    >
                      {group.count}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GodownPage;
