import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { showToast } from "../utils/toastNotifications";
import * as XLSX from "xlsx";

// A component to display and edit a single item
const Item = ({ item, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [updatedItem, setUpdatedItem] = useState({ ...item });

  const handleUpdate = () => {
    onUpdate(item._id, updatedItem);
    setIsEditing(false);
  };

  return (
    <tr>
      <td>
        {isEditing ? (
          <input
            type="text"
            value={updatedItem.name}
            onChange={(e) =>
              setUpdatedItem({ ...updatedItem, name: e.target.value })
            }
          />
        ) : (
          item.name
        )}
      </td>
      <td>
        {isEditing ? (
          <input
            type="number"
            value={updatedItem.price}
            onChange={(e) =>
              setUpdatedItem({ ...updatedItem, price: e.target.value })
            }
          />
        ) : (
          item.price
        )}
      </td>
      <td>
        {isEditing ? (
          <input
            type="number"
            value={updatedItem.masterPrice}
            onChange={(e) =>
              setUpdatedItem({ ...updatedItem, masterPrice: e.target.value })
            }
          />
        ) : (
          item.masterPrice
        )}
      </td>
      <td>
        {isEditing ? (
          <button
            className="btn btn-success btn-sm me-2"
            onClick={handleUpdate}
          >
            Save
          </button>
        ) : (
          <button
            className="btn btn-primary btn-sm me-2"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </button>
        )}
        <button
          className="btn btn-danger btn-sm"
          onClick={() => onDelete(item._id)}
        >
          Delete
        </button>
      </td>
    </tr>
  );
};

// Component to display bill history
const BillHistory = ({ bills, customer }) => {
  const downloadBillPDF = async (bill) => {
    try {
      // Create a temporary div for PDF generation
      const pdfContent = document.createElement("div");
      pdfContent.style.padding = "20px";
      pdfContent.style.fontFamily = "Arial, sans-serif";
      pdfContent.style.backgroundColor = "white";
      pdfContent.style.color = "black";
      pdfContent.style.width = "800px";

      pdfContent.innerHTML = `
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #2c3e50; margin-bottom: 10px;">INVOICE</h1>
                    <div style="border-bottom: 2px solid #3498db; width: 100px; margin: 0 auto;"></div>
                </div>
                
                <div style="margin-bottom: 30px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                        <div>
                            <h3 style="color: #2c3e50; margin-bottom: 10px;">Bill To:</h3>
                            <p style="margin: 5px 0;"><strong>Name:</strong> ${
                              customer.name
                            }</p>
                            <p style="margin: 5px 0;"><strong>GST No:</strong> ${
                              customer.gstNo
                            }</p>
                            <p style="margin: 5px 0;"><strong>Address:</strong> ${
                              customer.address
                            }</p>
                            <p style="margin: 5px 0;"><strong>Phone:</strong> ${
                              customer.phoneNumber
                            }</p>
                        </div>
                        <div style="text-align: right;">
                            <p style="margin: 5px 0;"><strong>Bill No:</strong> ${
                              bill.billNumber
                            }</p>
                            <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(
                              bill.createdAt
                            ).toLocaleDateString()}</p>
                            <p style="margin: 5px 0;"><strong>Price Type:</strong> ${
                              bill.priceType === "masterPrice"
                                ? "Special Price"
                                : "Regular Price"
                            }</p>
                        </div>
                    </div>
                </div>
                
                <div style="margin-bottom: 30px;">
                    <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
                        <thead>
                            <tr style="background-color: #f8f9fa;">
                                <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Item Name</th>
                                <th style="border: 1px solid #ddd; padding: 12px; text-align: center;">Price (₹)</th>
                                <th style="border: 1px solid #ddd; padding: 12px; text-align: center;">Quantity</th>
                                <th style="border: 1px solid #ddd; padding: 12px; text-align: right;">Total (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bill.items
                              .map(
                                (item) => `
                                <tr>
                                    <td style="border: 1px solid #ddd; padding: 12px;">${item.itemName}</td>
                                    <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${item.selectedPrice}</td>
                                    <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${item.quantity}</td>
                                    <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">${item.total}</td>
                                </tr>
                            `
                              )
                              .join("")}
                        </tbody>
                    </table>
                </div>
                
                <div style="text-align: right; margin-top: 30px;">
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; display: inline-block;">
                        <h2 style="color: #2c3e50; margin: 0;">Total Amount: ₹${
                          bill.totalAmount
                        }</h2>
                    </div>
                </div>
                
                <div style="margin-top: 50px; text-align: center; color: #7f8c8d; font-size: 12px;">
                    <p>Thank you for your business!</p>
                </div>
            `;

      document.body.appendChild(pdfContent);

      const canvas = await html2canvas(pdfContent, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      document.body.removeChild(pdfContent);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(
        `bill_${customer.name}_${bill.billNumber}_${
          new Date(bill.createdAt).toISOString().split("T")[0]
        }.pdf`
      );
    } catch (error) {
      console.error("Error generating PDF:", error);
      showToast.error("Error generating PDF. Please try again.");
    }
  };

  if (bills.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px", opacity: 0.7 }}>
        <p>No bills generated yet for this customer.</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table">
        <thead>
          <tr>
            <th>BILL NUMBER</th>
            <th>DATE</th>
            <th>ITEMS COUNT</th>
            <th>TOTAL AMOUNT</th>
            <th>PRICE TYPE</th>
            <th>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {bills.map((bill) => (
            <tr key={bill._id}>
              <td>{bill.billNumber}</td>
              <td>{new Date(bill.createdAt).toLocaleDateString()}</td>
              <td>{bill.items.length}</td>
              <td>₹{bill.totalAmount}</td>
              <td>
                <span
                  className={`badge ${
                    bill.priceType === "masterPrice"
                      ? "bg-warning"
                      : "bg-info"
                  }`}
                >
                  {bill.priceType === "masterPrice"
                    ? "Special Price"
                    : "Regular Price"}
                </span>
              </td>
              <td>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => downloadBillPDF(bill)}
                >
                  Download PDF
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

function CustomerDetails() {
  const [customer, setCustomer] = useState(null);
  const [items, setItems] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  // Backend URL from environment variable
  const backendUrl =
    process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
  // Excel upload state
  const [excelData, setExcelData] = useState([]);
  const [showExcelPreview, setShowExcelPreview] = useState(false);
  const [excelFileName, setExcelFileName] = useState("");

  // Form state for new item
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [masterPrice, setMasterPrice] = useState("");

  // Search states
  const [itemSearchTerm, setItemSearchTerm] = useState("");
  const [billSearchTerm, setBillSearchTerm] = useState("");
  const [filteredItems, setFilteredItems] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);

  const { id } = useParams();
  console.log("CustomerDetails - Customer ID from params:", id);

  const fetchItems = useCallback(async () => {
    try {
      if (!customer) {
        console.log("Customer not loaded yet, skipping fetchItems");
        return;
      }
      console.log("Fetching billing items for customer ID:", customer._id);
      const itemsRes = await axios.get(
        `${backendUrl}/api/bills/customer/${customer._id}/items`
      );
      console.log("Billing items received:", itemsRes.data);
      console.log("Billing items array length:", itemsRes.data.length);
      setItems(itemsRes.data);
      setFilteredItems(itemsRes.data);
    } catch (error) {
      console.log("Error fetching billing items", error);
      console.log("Error details:", error.response?.data);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Error fetching billing items";
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
    }
  }, [customer]);

  const fetchBills = useCallback(async () => {
    try {
      if (!customer) {
        console.log("Customer not loaded yet, skipping fetchBills");
        return;
      }
      const billsRes = await axios.get(
        `${backendUrl}/api/bills/customer/${customer._id}/bills`
      );
      setBills(billsRes.data);
      setFilteredBills(billsRes.data);
    } catch (error) {
      console.log("Error fetching bills", error);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Error fetching bills";
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
    }
  }, [customer]);

  useEffect(() => {
    const fetchCustomerDetails = async () => {
      setLoading(true);
      try {
        console.log("Fetching customer details for ID:", id);
        const customerRes = await axios.get(
          `${backendUrl}/api/customers/${id}`
        );
        console.log("Customer details received:", customerRes.data);
        setCustomer(customerRes.data);
      } catch (error) {
        console.log("Error fetching customer details:", error);
        console.log("Error response:", error.response?.data);
        const errorMsg =
          error.response?.data?.message ||
          error.message ||
          "Error fetching customer details";
        if (
          error.code === "ECONNABORTED" ||
          error.message.includes("timeout")
        ) {
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
      }
      setLoading(false);
    };

    fetchCustomerDetails();
  }, [id]);

  // Fetch items and bills after customer is loaded
  useEffect(() => {
    if (customer) {
      fetchItems();
      fetchBills();
    }
  }, [customer, fetchItems, fetchBills]);

  // Filter items based on search term
  useEffect(() => {
    if (itemSearchTerm === "") {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(
        (item) =>
          item.name.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
          item.price.toString().includes(itemSearchTerm) ||
          item.masterPrice.toString().includes(itemSearchTerm)
      );
      setFilteredItems(filtered);
    }
  }, [itemSearchTerm, items]);

  // Filter bills based on search term
  useEffect(() => {
    if (billSearchTerm === "") {
      setFilteredBills(bills);
    } else {
      const filtered = bills.filter(
        (bill) =>
          bill.billNumber
            .toLowerCase()
            .includes(billSearchTerm.toLowerCase()) ||
          bill.totalAmount.toString().includes(billSearchTerm) ||
          bill.priceType.toLowerCase().includes(billSearchTerm.toLowerCase()) ||
          new Date(bill.createdAt).toLocaleDateString().includes(billSearchTerm)
      );
      setFilteredBills(filtered);
    }
  }, [billSearchTerm, bills]);

  const handleAddItem = (e) => {
    e.preventDefault();
    const newItem = {
      name,
      price: parseFloat(price),
      masterPrice: parseFloat(masterPrice),
      customerId: customer._id,
    };
    console.log("Adding new billing item:", newItem);
    console.log("Customer ID being used:", customer._id);
    axios
      .post(`${backendUrl}/api/bills/customer/items/add`, newItem)
      .then((res) => {
        console.log("Billing item added successfully:", res.data);
        fetchItems(); // Refetch items to show the new one
        // Clear form
        setName("");
        setPrice("");
        setMasterPrice("");
        showToast.success("Item added successfully!");
      })
      .catch((err) => {
        console.log("Error adding billing item:", err);
        console.log("Error response:", err.response?.data);
        showToast.error(
          "Error adding item: " + (err.response?.data?.message || err.message)
        );
      });
  };

  const handleDeleteItem = (itemId) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      axios
        .delete(`${backendUrl}/api/bills/customer/items/${itemId}`)
        .then((res) => {
          console.log(res.data);
          fetchItems(); // Refetch
          showToast.success("Item deleted successfully!");
        })
        .catch((err) => {
          console.log(err);
          showToast.error(
            "Error deleting item: " +
              (err.response?.data?.message || err.message)
          );
        });
    }
  };

  const handleUpdateItem = (itemId, updatedItem) => {
    axios
      .put(`${backendUrl}/api/bills/customer/items/${itemId}`, {
        name: updatedItem.name,
        price: parseFloat(updatedItem.price),
        masterPrice: parseFloat(updatedItem.masterPrice),
      })
      .then((res) => {
        console.log(res.data);
        fetchItems(); // Refetch
        showToast.success("Item updated successfully!");
      })
      .catch((err) => {
        console.log(err);
        showToast.error(
          "Error updating item: " + (err.response?.data?.message || err.message)
        );
      });
  };

  // Excel Download Handler
  const handleDownloadExcel = () => {
    if (!items.length) return;
    const ws = XLSX.utils.json_to_sheet(
      items.map(({ _id, customerId, ...rest }) => rest)
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Items");
    XLSX.writeFile(wb, `${customer.name}_items.xlsx`);
  };

  // Excel Upload Handler
  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    setExcelFileName(file?.name || "");
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
      setExcelData(data);
      setShowExcelPreview(true);
    };
    reader.readAsBinaryString(file);
  };

  // Save Excel Data to Backend
  const handleSaveExcelData = async () => {
    try {
      console.log("Saving Excel data for customer:", customer._id);
      console.log("Excel data:", excelData);
      const response = await axios.post(
        `${backendUrl}/api/items/bulk-update/${customer._id}`,
        { items: excelData }
      );
      console.log("Excel upload response:", response.data);
      setShowExcelPreview(false);
      setExcelData([]);
      setExcelFileName("");
      await fetchItems();
      showToast.success("Items updated successfully!");
    } catch (err) {
      console.error("Error updating items from Excel:", err);
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Error updating items from Excel";
      if (err.code === "ECONNABORTED" || err.message.includes("timeout")) {
        showToast.error(
          "Connection timeout. Please check your internet connection."
        );
      } else if (err.response) {
        showToast.error(`Backend error: ${err.response.status} - ${errorMsg}`);
      } else if (err.request) {
        showToast.error(
          "Unable to connect to the server. Please check if the backend is running."
        );
      } else {
        showToast.error(errorMsg);
      }
    }
  };

  // Download billing template
  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get(
        `${backendUrl}/api/download-billing-template`,
        {
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "billing_items_template.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast.success("Template downloaded successfully!");
    } catch (err) {
      console.error("Error downloading template:", err);
      showToast.error("Error downloading template");
    }
  };

  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #a855f7 0%, #c084fc 50%, #d8b4fe 100%)",
    padding: "40px 20px",
    color: "white",
    fontSize: "16px",
  };

  const cardStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
    backdropFilter: "blur(10px)",
    borderRadius: "20px",
    padding: "30px",
    margin: "15px 0",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    width: "100%",
    maxWidth: "1000px",
    transition: "all 0.3s ease",
  };

  const searchInputStyle = {
    width: "100%",
    padding: "10px 16px",
    fontSize: "14px",
    borderRadius: "12px",
    border: "none",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    color: "#333",
    marginBottom: "20px",
    outline: "none",
    transition: "all 0.3s ease",
  };

  const buttonStyle = {
    backgroundColor: "rgba(139, 92, 246, 0.8)",
    boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    margin: "5px",
    transition: "all 0.3s ease",
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{...cardStyle, textAlign: "center"}}>
          <p style={{ fontSize: "20px", margin: 0 }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div style={containerStyle}>
        <div style={{...cardStyle, textAlign: "center"}}>
          <p style={{ fontSize: "20px", margin: 0 }}>
            Customer not found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <style>
        {`
          .search-input::placeholder {
            color: #999;
          }

          .search-input:focus {
            background-color: white;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }

          .custom-btn:hover {
            background-color: rgba(124, 58, 237, 0.9);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
          }

          .table-responsive {
            background-color: transparent;
            border-radius: 12px;
            padding: 0;
            overflow-x: auto;
          }

          .table {
            color: white;
            margin-bottom: 0;
          }

          .table th {
            border-color: rgba(255, 255, 255, 0.2);
            background-color: rgba(255, 255, 255, 0.1);
            padding: 16px;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.5px;
          }

          .table td {
            border-color: rgba(255, 255, 255, 0.1);
            padding: 16px;
          }

          .table tbody tr:hover {
            background-color: rgba(255, 255, 255, 0.05);
          }

          .btn {
            border-radius: 8px;
            padding: 8px 16px;
            font-weight: 600;
            transition: all 0.3s ease;
            border: none;
          }

          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          }

          .btn-primary {
            background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
          }

          .btn-success {
            background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
          }

          .btn-danger {
            background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
          }

          .badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 12px;
          }

          .bg-warning {
            background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
            color: white;
          }

          .bg-info {
            background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
            color: white;
          }
        `}
      </style>

      <div style={{ width: "100%", maxWidth: "1000px" }}>
        {/* Customer Information */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "20px" }}>
            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "30px",
              boxShadow: "0 4px 12px rgba(251, 191, 36, 0.4)"
            }}>
              👤
            </div>
            <div>
              <h2 style={{
                margin: 0,
                fontSize: "2rem",
                fontWeight: "bold",
                textShadow: "2px 2px 4px rgba(0, 0, 0, 0.2)",
              }}>
                {customer.name}
              </h2>
            </div>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "15px",
            fontSize: "14px"
          }}>
            <p style={{ margin: "8px 0" }}>
              <span style={{ opacity: 0.8 }}>📍 Address:</span> {customer.address}
            </p>
            <p style={{ margin: "8px 0" }}>
              <span style={{ opacity: 0.8 }}>🏙️ City:</span> {customer.city}
            </p>
            <p style={{ margin: "8px 0" }}>
              <span style={{ opacity: 0.8 }}>🗺️ State:</span> {customer.state}
            </p>
            <p style={{ margin: "8px 0" }}>
              <span style={{ opacity: 0.8 }}>🏢 GST No:</span> {customer.gstNo || "N/A"}
            </p>
            <p style={{ margin: "8px 0" }}>
              <span style={{ opacity: 0.8 }}>📞 Phone:</span> {customer.phoneNumber || "N/A"}
            </p>
          </div>
        </div>

        {/* Excel Download/Upload Buttons */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "20px" }}>
            <span style={{ fontSize: "24px" }}>📊</span>
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600" }}>
              Data Management
            </h3>
          </div>
          <div style={{
            display: "flex",
            justifyContent: "flex-start",
            flexWrap: "wrap",
            gap: "12px",
          }}>
            <button
              style={buttonStyle}
              className="custom-btn"
              onClick={handleDownloadExcel}
              disabled={!items.length}
            >
              📥 Download Excel
            </button>
            <button
              style={buttonStyle}
              className="custom-btn"
              onClick={handleDownloadTemplate}
            >
              📋 Download Template
            </button>
            <label style={{...buttonStyle, display: "inline-block"}} className="custom-btn">
              📤 Upload Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                style={{ display: "none" }}
                onChange={handleExcelUpload}
              />
            </label>
            {excelFileName && (
              <span style={{
                color: "rgba(255, 255, 255, 0.9)",
                alignSelf: "center",
                fontSize: "14px"
              }}>
                {excelFileName}
              </span>
            )}
          </div>
        </div>

        {/* Excel Preview and Save Button */}
        {showExcelPreview && (
          <div style={cardStyle}>
            <h3 style={{ marginBottom: "20px", textAlign: "center" }}>
              📋 Excel Preview
            </h3>
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    {Object.keys(excelData[0] || {}).map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {excelData.map((row, idx) => (
                    <tr key={idx}>
                      {Object.values(row).map((val, i) => (
                        <td key={i}>{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ textAlign: "center", marginTop: "15px" }}>
              <button
                style={buttonStyle}
                className="custom-btn"
                onClick={handleSaveExcelData}
              >
                💾 Save
              </button>
              <button
                style={buttonStyle}
                className="custom-btn"
                onClick={() => setShowExcelPreview(false)}
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        )}

        {/* Add New Item Section */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "20px" }}>
            <span style={{ fontSize: "24px" }}>➕</span>
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600" }}>
              Add New Item
            </h3>
          </div>
          <form onSubmit={handleAddItem} style={{ padding: "0 20px" }}>
            <div style={{ display: "flex", gap: "30px", marginBottom: "15px", alignItems: "flex-end" }}>
              <div style={{ flex: "0 0 280px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", opacity: 0.9 }}>
                  Item Name
                </label>
                <input
                  type="text"
                  placeholder="Item Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "14px",
                    borderRadius: "12px",
                    border: "none",
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                    color: "#333",
                    marginBottom: "0",
                    outline: "none",
                    transition: "all 0.3s ease",
                  }}
                  className="search-input"
                />
              </div>
              <div style={{ flex: "0 0 150px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", opacity: 0.9 }}>
                  Price
                </label>
                <input
                  type="number"
                  placeholder="Price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  step="0.01"
                  required
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "14px",
                    borderRadius: "12px",
                    border: "none",
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                    color: "#333",
                    marginBottom: "0",
                    outline: "none",
                    transition: "all 0.3s ease",
                  }}
                  className="search-input"
                />
              </div>
              <div style={{ flex: "0 0 150px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", opacity: 0.9 }}>
                  Special Price
                </label>
                <input
                  type="number"
                  placeholder="Special Price"
                  value={masterPrice}
                  onChange={(e) => setMasterPrice(e.target.value)}
                  step="0.01"
                  required
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "14px",
                    borderRadius: "12px",
                    border: "none",
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                    color: "#333",
                    marginBottom: "0",
                    outline: "none",
                    transition: "all 0.3s ease",
                  }}
                  className="search-input"
                />
              </div>
            </div>
            <button type="submit" style={{...buttonStyle, width: "auto"}} className="custom-btn">
              ➕ Add Item
            </button>
          </form>
        </div>

        {/* Items Table */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "20px" }}>
            <span style={{ fontSize: "24px" }}>📦</span>
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600" }}>
              Items
            </h3>
          </div>

          {/* Items Search */}
          <input
            type="text"
            placeholder="🔍 Search items by name, price, or special price..."
            value={itemSearchTerm}
            onChange={(e) => setItemSearchTerm(e.target.value)}
            style={searchInputStyle}
            className="search-input"
          />

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>PRICE</th>
                  <th>SPECIAL PRICE</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems && filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <Item
                      item={item}
                      onDelete={handleDeleteItem}
                      onUpdate={handleUpdateItem}
                      key={item._id}
                    />
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="4"
                      style={{ textAlign: "center", padding: "40px", opacity: 0.7 }}
                    >
                      {itemSearchTerm
                        ? `No items found matching "${itemSearchTerm}"`
                        : "No items found. Add items manually or upload via Excel."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bill History Section */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "20px" }}>
            <span style={{ fontSize: "24px" }}>📄</span>
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600" }}>
              Bill History
            </h3>
          </div>

          {/* Bills Search */}
          <input
            type="text"
            placeholder="🔍 Search bills by bill number, amount, price type, or date..."
            value={billSearchTerm}
            onChange={(e) => setBillSearchTerm(e.target.value)}
            style={searchInputStyle}
            className="search-input"
          />

          <BillHistory bills={filteredBills} customer={customer} />
        </div>
      </div>
    </div>
  );
}

export default CustomerDetails;
