import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { showToast } from "../utils/toastNotifications";
import TopCustomersWidget from "./TopCustomersWidget";
import SalesComparisonWidget from "./SalesComparisonWidget";
import StockValueWidget from "./StockValueWidget";
import OutstandingWidget from "./OutstandingWidget";
import PaymentOverdueWidget from "./PaymentOverdueWidget";
import BillSyncStatusWidget from "./BillSyncStatusWidget";
import LowStockAlertWidget from "./LowStockAlertWidget";
import PendingOrdersWidget from "./PendingOrdersWidget";
import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const { hasPermission } = useAuth();
  const canAccessInventory = hasPermission('canAccessInventory');

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [excelFiles, setExcelFiles] = useState([]);
  const [showFilesModal, setShowFilesModal] = useState(false);

  useEffect(() => {
    fetchExcelFiles();
  }, []);

  const fetchExcelFiles = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
      const response = await fetch(
        `${backendUrl}/api/excel-files`
      );
      const data = await response.json();
      setExcelFiles(data);
      console.log("Fetched Excel files:", data);
    } catch (error) {
      console.error("Error fetching Excel files:", error);
      showToast.error("Error loading files list");
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (
      file &&
      (file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.type === "application/vnd.ms-excel" ||
        file.type === "text/csv")
    ) {
      setSelectedFile(file);
    } else {
      showToast.error("Please select a valid Excel file (.xlsx, .xls, .csv)");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showToast.warning("Please select a file first");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("excelFile", selectedFile);

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
      const response = await fetch(
        `${backendUrl}/api/upload-excel`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();
      if (response.ok) {
        showToast.success("File uploaded successfully!");
        setShowUploadModal(false);
        setSelectedFile(null);
        fetchExcelFiles();
      } else {
        showToast.error("Error uploading file: " + data.message);
      }
    } catch (error) {
      showToast.error("Error uploading file: " + error.message);
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
      const response = await fetch(
        `${backendUrl}/api/download-excel/${fileId}`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName || fileId.split("-").slice(1).join("-") || "download.xlsx";
        document.body.appendChild(a);
        a.click();

        // Clean up
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 100);

        showToast.success("File downloaded successfully!");
      } else {
        const errorData = await response.json();
        showToast.error("Error downloading file: " + (errorData.message || "Unknown error"));
        console.error("Download error response:", errorData);
      }
    } catch (error) {
      showToast.error("Error downloading file: " + error.message);
      console.error("Download error:", error);
    }
  };

  const handleDelete = async (fileId) => {
    if (window.confirm("Are you sure you want to delete this file?")) {
      try {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
        const response = await fetch(
          `${backendUrl}/api/delete-excel/${fileId}`,
          {
            method: "DELETE",
          }
        );

        if (response.ok) {
          showToast.success("File deleted successfully!");
          fetchExcelFiles();
        } else {
          const errorData = await response.json();
          showToast.error("Error deleting file: " + (errorData.message || "Unknown error"));
        }
      } catch (error) {
        showToast.error("Error deleting file: " + error.message);
        console.error("Delete error:", error);
      }
    }
  };

  const handleDownloadTemplate = async (templateType) => {
    try {
      let endpoint, filename;

      switch (templateType) {
        case "inventory":
          endpoint = "download-inventory-template";
          filename = "inventory_template.xlsx";
          break;
        case "billing":
          endpoint = "download-billing-template";
          filename = "billing_items_template.xlsx";
          break;
        case "products":
          endpoint = "download-products-template";
          filename = "products_template.xlsx";
          break;
        default:
          endpoint = "download-products-template";
          filename = "products_template.xlsx";
      }

      const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
      const response = await fetch(
        `${backendUrl}/api/${endpoint}`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // Clean up
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 100);

        showToast.success("Template downloaded successfully!");
      } else {
        const errorData = await response.json();
        showToast.error("Error downloading template: " + (errorData.message || "Unknown error"));
      }
    } catch (error) {
      showToast.error("Error downloading template: " + error.message);
      console.error("Template download error:", error);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div style={styles.container}>
      <style>{globalStyles}</style>
      <h2 className="dashboard-header" style={styles.header}>Admin Dashboard</h2>



      <div className="button-container" style={styles.buttonContainer}>
        {canAccessInventory && (
          <Link to="/itemCountSummary" style={styles.link}>
            <button className="dashboard-button" style={styles.button}>Inventory</button>
          </Link>
        )}
        <Link to="/signupstaff" style={styles.link}>
          <button className="dashboard-button" style={styles.button}>Staff</button>
        </Link>
        {canAccessInventory && (
          <Link to="/godown" style={styles.link}>
            <button className="dashboard-button" style={styles.button}>Godown</button>
          </Link>
        )}
        <Link to="/sales" style={styles.link}>
          <button className="dashboard-button" style={styles.button}>Sale</button>
        </Link>
        <Link to="/purchases" style={styles.link}>
          <button className="dashboard-button" style={styles.button}>Purchases</button>
        </Link>

        <Link to="/data-management" style={styles.link}>
          <button className="dashboard-button" style={styles.button}>Data Management</button>
        </Link>
        <Link to="/bank-reconciliation" style={styles.link}>
          <button className="dashboard-button" style={styles.button}>Bank Reconciliation</button>
        </Link>
        <Link to="/day-book" style={styles.link}>
          <button className="dashboard-button" style={styles.button}>Day Book</button>
        </Link>
        <Link to="/enhanced-vouchers" style={styles.link}>
          <button className="dashboard-button" style={styles.button}>Enhanced Vouchers</button>
        </Link>
        <Link to="/cheque-management" style={styles.link}>
          <button className="dashboard-button" style={styles.button}>Cheque Management</button>
        </Link>
        <Link to="/ratio-analysis" style={styles.link}>
          <button className="dashboard-button" style={styles.button}>Ratio Analysis</button>
        </Link>
        {canAccessInventory && (
          <Link to="/transit" style={styles.link}>
            <button className="dashboard-button" style={styles.button}>Transit</button>
          </Link>
        )}

        <button className="dashboard-button" style={styles.button} onClick={() => setShowUploadModal(true)}>
          Upload Excel
        </button>
        <button className="dashboard-button" style={styles.button} onClick={() => setShowFilesModal(true)}>
          View Files
        </button>
        <button
          className="dashboard-button"
          style={styles.button}
          onClick={() => handleDownloadTemplate("products")}
        >
          Download Template
        </button>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalHeader}>Upload Excel File</h3>

            {/* Template Download Section */}
            <div style={styles.templateSection}>
              <p style={styles.templateText}>
                📥 Don't have a template? Download one:
              </p>
              <div style={styles.templateButtons}>
                <button
                  onClick={() => handleDownloadTemplate("products")}
                  style={styles.templateButton}
                >
                  � Produtcts Template
                </button>

              </div>
            </div>

            <div style={styles.divider}></div>

            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              style={styles.fileInput}
            />
            {selectedFile && (
              <p style={styles.fileInfo}>Selected: {selectedFile.name}</p>
            )}
            <div style={styles.modalButtons}>
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                style={styles.modalButton}
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                }}
                style={styles.modalButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Files Modal */}
      {showFilesModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalHeader}>Uploaded Excel Files</h3>
            <div style={styles.filesList}>
              {excelFiles.length === 0 ? (
                <p style={styles.noFiles}>No files uploaded yet</p>
              ) : (
                excelFiles.map((file) => (
                  <div key={file._id} style={styles.fileItem}>
                    <div style={styles.fileInfo}>
                      <p style={styles.fileName}>{file.originalName}</p>
                      <p style={styles.fileDetails}>
                        Size: {formatFileSize(file.size)} | Uploaded:{" "}
                        {formatDate(file.uploadDate)}
                      </p>
                    </div>
                    <div style={styles.fileActions}>
                      <button
                        onClick={() =>
                          handleDownload(file._id, file.originalName)
                        }
                        style={styles.actionButton}
                      >
                        Download
                      </button>
                      <button
                        onClick={() => handleDelete(file._id)}
                        style={styles.deleteButton}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => setShowFilesModal(false)}
              style={styles.modalButton}
            >
              Close
            </button>
          </div>
        </div>
      )}
      {/* Analytics Widgets */}
      <div className="widgets-grid" style={styles.widgetsGrid}>
        <PaymentOverdueWidget />
        <PendingOrdersWidget />
        <BillSyncStatusWidget />
        {canAccessInventory && <LowStockAlertWidget />}
        <OutstandingWidget />
        <SalesComparisonWidget />
        <TopCustomersWidget />
        {canAccessInventory && <StockValueWidget />}
      </div>



    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    minHeight: "100vh",
    background: "linear-gradient(-45deg, #fcb900, #9900ef, #ff6900, #00ff07)",
    padding: "20px 10px",
    backgroundSize: "400% 400%",
    animation: "gradientAnimation 12s ease infinite",
  },
  header: {
    fontSize: "44px",
    color: "#ffffff",
    fontFamily: "'Arial', sans-serif",
    textAlign: "center",
    marginBottom: "30px",
    textShadow: "2px 2px 4px rgba(0, 0, 0, 0.3)",
  },
  buttonContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "20px",
    justifyContent: "center",
  },
  button: {
    padding: "15px 30px",
    fontSize: "1.6rem",
    backgroundColor: "rgba(218, 216, 224, 0.8)",
    color: "#fff",
    border: "none",
    borderRadius: "28px",
    cursor: "pointer",
    transition: "background-color 0.3s ease, transform 0.3s ease",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
    fontFamily: "'Poppins', sans-serif",
    letterSpacing: "0.5px",
  },
  buttonHover: {
    backgroundColor: "#45a049",
    transform: "scale(1.1)",
  },
  link: {
    textDecoration: "none",
    color: "inherit",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "white",
    padding: "30px",
    borderRadius: "15px",
    maxWidth: "500px",
    width: "90%",
    maxHeight: "80vh",
    overflow: "auto",
  },
  modalHeader: {
    textAlign: "center",
    marginBottom: "20px",
    fontSize: "24px",
    color: "#333",
  },
  templateSection: {
    marginBottom: "20px",
    padding: "15px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    border: "1px solid #dee2e6",
  },
  templateText: {
    textAlign: "center",
    marginBottom: "15px",
    fontSize: "16px",
    color: "#495057",
    fontWeight: "500",
  },
  templateButtons: {
    display: "flex",
    gap: "10px",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  templateButton: {
    padding: "10px 20px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "14px",
    transition: "background-color 0.3s ease",
  },
  divider: {
    height: "1px",
    backgroundColor: "#dee2e6",
    margin: "20px 0",
  },
  fileInput: {
    width: "100%",
    padding: "10px",
    marginBottom: "20px",
    border: "2px dashed #ccc",
    borderRadius: "8px",
  },
  fileInfo: {
    marginBottom: "20px",
    padding: "10px",
    backgroundColor: "#f0f0f0",
    borderRadius: "5px",
    textAlign: "center",
  },
  modalButtons: {
    display: "flex",
    gap: "10px",
    justifyContent: "center",
  },
  modalButton: {
    padding: "10px 20px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
  },
  filesList: {
    maxHeight: "400px",
    overflow: "auto",
    marginBottom: "20px",
  },
  noFiles: {
    textAlign: "center",
    color: "#666",
    fontStyle: "italic",
  },
  fileItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    marginBottom: "10px",
    backgroundColor: "#f9f9f9",
  },
  fileName: {
    fontWeight: "bold",
    margin: "0 0 5px 0",
    color: "#333",
  },
  fileDetails: {
    margin: "0",
    fontSize: "12px",
    color: "#666",
  },
  fileActions: {
    display: "flex",
    gap: "10px",
  },
  actionButton: {
    padding: "5px 10px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "3px",
    cursor: "pointer",
    fontSize: "12px",
  },
  deleteButton: {
    padding: "5px 10px",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "3px",
    cursor: "pointer",
    fontSize: "12px",
  },
  widgetsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "20px",
    width: "100%",
    maxWidth: "1600px",
    margin: "0 auto",
    padding: "0 10px",
    alignItems: "start",
  },
  "@keyframes fadeIn": {
    "0%": {
      opacity: 0,
    },
    "100%": {
      opacity: 1,
    },
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

@media (min-width: 1400px) {
  .widgets-grid {
    grid-template-columns: repeat(3, 1fr) !important;
  }
}

@media (max-width: 1200px) {
  .widgets-grid {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)) !important;
    gap: 15px !important;
  }
}

@media (max-width: 768px) {
  .widgets-grid {
    grid-template-columns: 1fr !important;
    gap: 15px !important;
    padding: 0 5px !important;
  }
  
  .dashboard-header {
    font-size: 2.5rem !important;
    margin-bottom: 20px !important;
  }
  
  .button-container {
    gap: 15px !important;
  }
  
  .dashboard-button {
    padding: 12px 24px !important;
    font-size: 1.4rem !important;
  }
}

@media (max-width: 480px) {
  .widgets-grid {
    gap: 10px !important;
    grid-template-columns: 1fr !important;
  }
  
  .payment-overdue-widget,
  .pending-orders-widget,
  .bill-sync-widget,
  .low-stock-widget,
  .outstanding-widget,
  .sales-comparison-widget,
  .top-customers-widget,
  .stock-value-widget {
    min-height: 200px !important;
    padding: 12px !important;
  }
}
`;

export default Dashboard;
