import React, { useState, useEffect } from "react";
import Barcode from "react-barcode";
import axios from "axios";
import { jsPDF } from "jspdf";
import JsBarcode from "jsbarcode";
import * as XLSX from "xlsx";
import { showToast } from "../utils/toastNotifications";

const QRCreater = () => {
  const [product, setProduct] = useState("");
  const [packed, setPacked] = useState("");
  const [batch, setBatch] = useState("");
  const [shift, setShift] = useState("");
  const [numberOfBarcodes, setNumberOfBarcodes] = useState(1);
  const [location, setLocation] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [rewinder, setRewinder] = useState("");
  const [edge, setEdge] = useState("");
  const [winder, setWinder] = useState("");
  const [mixer, setMixer] = useState("");
  const [skuc, setSku] = useState("");
  const [skun, setSKU] = useState("");
  const [barcodeNumbers, setBarcodeNumbers] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [excelData, setExcelData] = useState([]); // To store parsed Excel data
  const [productSuggestions, setProductSuggestions] = useState([]); // For autocomplete

  // Fetch location using OpenCage API or reverse geolocation API
  const fetchLocation = async (lat, long) => {
    const apiKey = "1a49c2f11ba74841bb2b563c7569b33c"; // Replace with your OpenCage API key
    try {
      const response = await axios.get(
        `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${long}&key=${apiKey}`
      );
      const { city, state, country } = response.data.results[0].components;
      setLocation(`${city || ""}, ${state}, ${country || ""}`);
    } catch (error) {
      console.error("Error fetching location:", error);
      setLocation("Location Unavailable");
    }
  };

  // Get current time and location on component mount
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetchLocation(latitude, longitude); // Automatically get location from the device
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocation("Location Unavailable");
      }
    );

    // Set current time
    const date = new Date();
    setCurrentTime(date.toLocaleString());
  }, []);

  // Helper to get and set last used number for a SKU Code No in localStorage
  const getLastUsedNumber = (sku) => {
    const data = localStorage.getItem("barcode_last_number");
    if (!data) return 0;
    try {
      const obj = JSON.parse(data);
      return obj[sku] || 0;
    } catch {
      return 0;
    }
  };
  const setLastUsedNumber = (sku, num) => {
    const data = localStorage.getItem("barcode_last_number");
    let obj = {};
    if (data) {
      try {
        obj = JSON.parse(data);
      } catch {
        obj = {};
      }
    }
    obj[sku] = num;
    localStorage.setItem("barcode_last_number", JSON.stringify(obj));
  };

  // Update barcodeNumbers when SKU Code No or numberOfBarcodes changes
  useEffect(() => {
    if (skuc && numberOfBarcodes > 0) {
      const start = getLastUsedNumber(skuc) + 1;
      const arr = Array.from(
        { length: Number(numberOfBarcodes) },
        (_, i) => `${skuc}${start + i}`
      );
      setBarcodeNumbers(arr);
    } else {
      setBarcodeNumbers([]);
    }
  }, [skuc, numberOfBarcodes]);

  // Fetch and parse Excel file from backend on mount
  useEffect(() => {
    const fetchExcelFile = async () => {
      try {
        const backendUrl =
          process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

        const response = await fetch(`${backendUrl}/api/latest-excel-file`);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to fetch Excel file: ${response.status} ${response.statusText}`
          );
        }

        const blob = await response.blob();

        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: "binary" });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

            // Assuming first row is header: [Product Name, SKU Code No, SKU Name, Packed By, Batch No, Shift, Rewinder, Edge Cut, Winder, Mixer]
            const [header, ...rows] = data;
            const products = rows.map((row) => ({
              productName: row[0],
              skuCode: row[1],
              skuName: row[2],
              packedBy: row[3],
              batchNo: row[4],
              shift: row[5],
              rewinderOperator: row[6],
              edgeCutOperator: row[7],
              winderOperator: row[8],
              mixerOperator: row[9],
            }));
            setExcelData(products);
            console.log("Loaded Excel Data:", products); // Debug log
          } catch (parseError) {
            console.error("Error parsing Excel file:", parseError);
          }
        };
        reader.onerror = (error) => {
          console.error("FileReader error:", error);
        };
        reader.readAsBinaryString(blob);
      } catch (error) {
        console.error("Error fetching Excel file:", error);
      }
    };
    fetchExcelFile();
  }, []);

  // Function to handle PDF creation for individual barcodes (Optimized Version)
  const handleDownloadAllBarcodesPDF = async () => {
    setIsDownloading(true);
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "in",
        format: [4, 6], // 4x6 inches page size
      });

      const barcodeOptions = {
        format: "CODE128",
        width: 1.5, // Width of barcode lines
        height: 40, // Height of barcode lines
        displayValue: true, // Set to true to display the value
        fontSize: 24, // Font size for the value displayed by jsbarcode
        margin: 5, // Margin around the barcode (including text)
      };

      // Create a temporary canvas element
      const canvas = document.createElement("canvas");

      for (let index = 0; index < barcodeNumbers.length; index++) {
        const currentBarcodeNumber = barcodeNumbers[index];

        // Generate barcode on the temporary canvas
        JsBarcode(canvas, `${currentBarcodeNumber}`, barcodeOptions);
        const barcodeDataUrl = canvas.toDataURL("image/png"); // Get barcode as PNG

        // Add new page if not the first barcode
        if (index > 0) {
          doc.addPage();
        }

        // --- Add content to PDF page (adjust coordinates as needed) ---
        const pageW = 4; // inches
        const pageH = 6; // inches
        const margin = 0.5; // inches

        // Add Barcode Image (Scale width to fit, maintain aspect ratio)
        const barcodeImgWidth = 1.8; // Slightly increased width to accommodate text better potentially
        const barcodeImgHeight =
          (canvas.height / canvas.width) * barcodeImgWidth;
        doc.addImage(
          barcodeDataUrl,
          "PNG",
          margin,
          margin,
          barcodeImgWidth,
          barcodeImgHeight
        );

        // Add Text Details below barcode
        const textStartY = margin + barcodeImgHeight + 0.4; // Increased gap to accommodate barcode text
        let currentY = textStartY;
        const lineSpacing = 0.55; // Base spacing between lines
        const fontSize = 19; // Font size for details
        const availableWidth = pageW - 2 * margin; // Max width for text (pageWidth - leftMargin - rightMargin)

        doc.setFontSize(fontSize);
        doc.setFont("helvetica", "bold");

        // Helper function to add text and update Y position correctly
        const addTextLine = (text, y) => {
          const lines = doc.splitTextToSize(text, availableWidth);
          doc.text(lines, margin, y);
          return y + (lines.length * fontSize * 1.15) / 72; // Update Y based on number of lines (adjust multiplier 1.15 if needed)
        };

        currentY = addTextLine(`Barcode No: ${currentBarcodeNumber}`, currentY);
        currentY += lineSpacing / 2; // Add a bit of spacing

        currentY = addTextLine(`SKU code no: ${skuc}`, currentY);
        currentY += lineSpacing / 2;

        currentY = addTextLine(`SKU Name: ${skun}`, currentY); // Wrap SKU Name
        currentY += lineSpacing / 2;

        currentY = addTextLine(`Location: ${location}`, currentY); // Wrap Location
        currentY += lineSpacing / 2;

        currentY = addTextLine(`Packing Date: ${currentTime}`, currentY);

        // You can add other details (packed by, shift, operators) here if needed
        // currentY += lineSpacing;
        // doc.text(`Packed by: ${packed}`, margin, currentY);
        // ... add other fields ...
      }

      doc.save("barcodes.pdf");
    } catch (error) {
      console.error("Error generating PDF:", error);
      if (error.name === "InvalidInputException") {
        showToast.error(
          `Failed to generate PDF. Invalid data for barcode: ${error.message}`
        );
      } else {
        showToast.error("Failed to generate PDF.");
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // Function to handle printing of the final barcode
  const handlePrint = () => {
    const content = document.getElementById("barcode-total");

    if (content) {
      const printWindow = window.open("", "_blank", "width=800,height=600");
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Final Barcode</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                text-align: center;
              }
              .barcode-container {
                width: 4in;
                height: 6in;
                text-align: center;
                margin: auto;
                font-weight: bold; /* Bold font */
                border: 1px solid #000; /* Optional border for the print layout */
              }
            </style>
          </head>
          <body>
            <div class="barcode-container">${content.innerHTML}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Function to handle saving data to the database
  const handleSaveToDatabase = async () => {
    const backendUrl =
      process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

    // First, check if barcodes are unique
    try {
      showToast.info("Checking barcode uniqueness...");
      const uniquenessResponse = await axios.post(
        `${backendUrl}/api/barcodes/check-uniqueness`,
        {
          barcodeNumbers: barcodeNumbers,
        }
      );

      if (!uniquenessResponse.data.isUnique) {
        const duplicates = uniquenessResponse.data.duplicates;
        showToast.error(
          `⚠️ Duplicate barcodes found: ${duplicates.join(
            ", "
          )}. These barcodes already exist in the system!`
        );
        return; // Stop the save process
      }

      showToast.success("✓ All barcodes are unique!");
    } catch (error) {
      console.error("Error checking uniqueness:", error);
      showToast.error("Error checking barcode uniqueness. Please try again.");
      return;
    }

    // Convert barcodeNumbers array to batchNumbers array (extract numeric parts)
    // barcodeNumbers format: ["SKU001", "SKU002"] -> batchNumbers format: [1, 2]
    const batchNumbers = barcodeNumbers
      .map((barcode) => {
        // Extract numeric part from barcode (remove SKU prefix)
        if (skuc && barcode.startsWith(skuc)) {
          const numericPart = barcode.replace(skuc, "");
          return parseInt(numericPart) || 0;
        }
        // If no SKU prefix, try to extract any number from the barcode
        const match = barcode.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
      })
      .filter((num) => num > 0);

    const formData = {
      product,
      packed,
      batch,
      shift,
      numberOfBarcodes,
      location,
      currentTime,
      rewinder,
      edge,
      winder,
      mixer,
      skuc,
      skun,
      batchNumbers,
    };

    try {
      const response = await axios.post(`${backendUrl}/api/saved`, formData);
      showToast.success(response.data.message);
      // Update last used number for this SKU
      if (skuc && barcodeNumbers.length > 0) {
        const lastNum = parseInt(
          barcodeNumbers[barcodeNumbers.length - 1].replace(skuc, "")
        );
        setLastUsedNumber(skuc, lastNum);
      }
    } catch (error) {
      console.error("Error saving data:", error);
      const errorMsg =
        error.response?.data?.message || error.message || "Failed to save data";
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors
          .map((e) => e.message)
          .join(", ");
        showToast.error(`Validation error: ${validationErrors}`);
      } else if (
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
  };

  return (
    <div style={styles.container1}>
      <style>{globalStyles}</style>
      {/* Excel Upload input removed */}
      <div style={styles.container}>
        <h2 style={styles.heading}>Generate Barcodes</h2>

        <div style={styles.form}>
          {/* Product Name Dropdown */}
          <div style={styles.inputGroup}>
            <label htmlFor="product" style={styles.label}>
              1️⃣ Product Name:
            </label>
            <select
              id="product"
              value={product}
              onChange={(e) => {
                const selectedProductName = e.target.value;
                setProduct(selectedProductName);

                // Find the selected product in Excel data and auto-fill ALL fields
                if (selectedProductName && excelData.length > 0) {
                  const selectedProduct = excelData.find(
                    (item) => item.productName === selectedProductName
                  );
                  if (selectedProduct) {
                    // Auto-fill primary fields
                    setSku(selectedProduct.skuCode || "");
                    setSKU(selectedProduct.skuName || selectedProduct.productName);

                    // Auto-fill additional information
                    setPacked(selectedProduct.packedBy || "");
                    setBatch(selectedProduct.batchNo || "");
                    setShift(selectedProduct.shift || "");

                    // Auto-fill operators
                    setRewinder(selectedProduct.rewinderOperator || "");
                    setEdge(selectedProduct.edgeCutOperator || "");
                    setWinder(selectedProduct.winderOperator || "");
                    setMixer(selectedProduct.mixerOperator || "");

                    console.log("Auto-filled all fields:", selectedProduct);
                  }
                } else {
                  // Clear ALL fields if "Select a product" is chosen
                  setSku("");
                  setSKU("");
                  setPacked("");
                  setBatch("");
                  setShift("");
                  setRewinder("");
                  setEdge("");
                  setWinder("");
                  setMixer("");
                }
              }}
              required
              style={{
                ...styles.input,
                cursor: "pointer",
                backgroundColor: product
                  ? "rgba(144, 238, 144, 0.2)"
                  : "rgba(255, 255, 255, 0.8)",
              }}
            >
              <option value="">-- Select a product from Excel --</option>
              {excelData.length === 0 ? (
                <option value="" disabled>
                  No products loaded. Please upload Excel file.
                </option>
              ) : (
                excelData.map((item, idx) => (
                  <option key={idx} value={item.productName}>
                    {item.productName} (SKU: {item.skuCode})
                  </option>
                ))
              )}
            </select>
            {excelData.length === 0 && (
              <small
                style={{
                  color: "#ff6900",
                  fontSize: "12px",
                  marginTop: "5px",
                  display: "block",
                  fontWeight: "bold",
                }}
              >
                ⚠️ No Excel file uploaded. Please ask admin to upload product data.
              </small>
            )}
          </div>

          {/* SKU Code No */}
          <div style={styles.inputGroup}>
            <label htmlFor="skuc" style={styles.label}>
              2️⃣ SKU Code No:
            </label>
            <input
              id="skuc"
              type="text"
              placeholder="SKU code no (auto-filled)"
              value={skuc}
              onChange={(e) => setSku(e.target.value)}
              required
              style={{
                ...styles.input,
                backgroundColor: skuc
                  ? "rgba(144, 238, 144, 0.2)"
                  : "rgba(255, 255, 255, 0.8)",
              }}
            />
          </div>

          {/* SKU Name */}
          <div style={styles.inputGroup}>
            <label htmlFor="skun" style={styles.label}>
              3️⃣ SKU Name:
            </label>
            <input
              id="skun"
              type="text"
              placeholder="SKU Name (auto-filled)"
              value={skun}
              onChange={(e) => setSKU(e.target.value)}
              required
              style={{
                ...styles.input,
                backgroundColor: skun
                  ? "rgba(144, 238, 144, 0.2)"
                  : "rgba(255, 255, 255, 0.8)",
              }}
            />
          </div>

          <div style={styles.divider}></div>
          {/* Number of Barcodes */}
          <div style={styles.inputGroup}>
            <label htmlFor="numberOfBarcodes" style={styles.label}>
              4️⃣ Number of Barcodes:
            </label>
            <input
              id="numberOfBarcodes"
              type="number"
              placeholder="Enter quantity"
              value={numberOfBarcodes}
              onChange={(e) => setNumberOfBarcodes(e.target.value)}
              required
              min="1"
              style={styles.input}
            />
          </div>

          <div style={styles.divider}></div>

          {/* Additional Information Section */}
          <div style={styles.sectionHeader}>📋 Additional Information</div>

          {/* Packed By */}
          <div style={styles.inputGroup}>
            <label htmlFor="packed" style={styles.label}>
              Packed By:
            </label>
            <input
              id="packed"
              type="text"
              placeholder="Enter packer name (auto-filled)"
              value={packed}
              onChange={(e) => setPacked(e.target.value)}
              required
              style={{
                ...styles.input,
                backgroundColor: packed
                  ? "rgba(144, 238, 144, 0.2)"
                  : "rgba(255, 255, 255, 0.8)",
              }}
            />
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="batch" style={styles.label}>
              Batch No:
            </label>
            <input
              id="batch"
              type="number"
              placeholder="Enter batch number (auto-filled)"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              required
              style={{
                ...styles.input,
                backgroundColor: batch
                  ? "rgba(144, 238, 144, 0.2)"
                  : "rgba(255, 255, 255, 0.8)",
              }}
            />
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="shift" style={styles.label}>
              Shift (Day/Night):
            </label>
            <select
              id="shift"
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              required
              style={{
                ...styles.input,
                backgroundColor: shift
                  ? "rgba(144, 238, 144, 0.2)"
                  : "rgba(255, 255, 255, 0.8)",
              }}
            >
              <option value="">Select shift</option>
              <option value="Day">Day</option>
              <option value="Night">Night</option>
            </select>
          </div>

          <div style={styles.divider}></div>

          {/* Operators Section */}
          <div style={styles.sectionHeader}>👷 Operators</div>

          <div style={styles.inputGroup}>
            <label htmlFor="rewinder" style={styles.label}>
              Rewinder Operator:
            </label>
            <input
              id="rewinder"
              type="text"
              placeholder="Rewinder operator name (auto-filled)"
              value={rewinder}
              onChange={(e) => setRewinder(e.target.value)}
              required
              style={{
                ...styles.input,
                backgroundColor: rewinder
                  ? "rgba(144, 238, 144, 0.2)"
                  : "rgba(255, 255, 255, 0.8)",
              }}
            />
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="edge" style={styles.label}>
              Edge Cut Operator:
            </label>
            <input
              id="edge"
              type="text"
              placeholder="Edge cut operator name (auto-filled)"
              value={edge}
              onChange={(e) => setEdge(e.target.value)}
              required
              style={{
                ...styles.input,
                backgroundColor: edge
                  ? "rgba(144, 238, 144, 0.2)"
                  : "rgba(255, 255, 255, 0.8)",
              }}
            />
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="winder" style={styles.label}>
              Winder Operator:
            </label>
            <input
              id="winder"
              type="text"
              placeholder="Winder operator name (auto-filled)"
              value={winder}
              onChange={(e) => setWinder(e.target.value)}
              required
              style={{
                ...styles.input,
                backgroundColor: winder
                  ? "rgba(144, 238, 144, 0.2)"
                  : "rgba(255, 255, 255, 0.8)",
              }}
            />
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="mixer" style={styles.label}>
              Mixer Operator:
            </label>
            <input
              id="mixer"
              type="text"
              placeholder="Mixer operator name (auto-filled)"
              value={mixer}
              onChange={(e) => setMixer(e.target.value)}
              required
              style={{
                ...styles.input,
                backgroundColor: mixer
                  ? "rgba(144, 238, 144, 0.2)"
                  : "rgba(255, 255, 255, 0.8)",
              }}
            />
          </div>

          <div style={styles.divider}></div>

          <div style={styles.fullWidth}>
            <div style={styles.buttonGroup}>
              <button
                className="styled-button"
                onClick={() => {
                  handleSaveToDatabase();
                }}
              >
                💾 Add to Database
              </button>

              <button
                className="styled-button"
                onClick={handleDownloadAllBarcodesPDF}
                disabled={isDownloading}
              >
                {isDownloading ? "⏳ Downloading..." : "📄 Download PDF"}
              </button>

              <button className="styled-button" onClick={handlePrint}>
                🖨️ Print Final Barcode
              </button>
            </div>
          </div>
        </div>

        {/* Generate individual barcodes */}
        {/* Add a flex container for barcode cards with gap */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "0",
            flexWrap: "nowrap",
            marginBottom: "30px",
            width: "100%",
          }}
        >
          {Array.from({ length: barcodeNumbers.length }).map((_, index) => (
            <div
              id={`barcode-div-${index}`}
              key={index}
              style={styles.barcodeContainer}
            >
              {/* Barcode value is SKU Code No + running number */}
              <Barcode
                value={barcodeNumbers[index]}
                width={3}
                height={80}
                fontSize={32}
                margin={0}
              />
              <div style={styles.barcodeDetails}>
                <div style={styles.barcodeInfo}>
                  <strong>Barcode:</strong> {barcodeNumbers[index]}
                </div>
                <div style={styles.barcodeInfo}>
                  <strong>SKU Code:</strong> {skuc}
                </div>
                <div style={styles.barcodeInfo}>
                  <strong>SKU Name:</strong> {skun}
                </div>
                <div style={styles.barcodeInfo}>
                  <strong>Location:</strong> {location}
                </div>
                <div style={styles.barcodeInfo}>
                  <strong>Date:</strong> {currentTime}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Final barcode with the start and end batch numbers */}
        {barcodeNumbers.length > 0 && (
          <div id="barcode-total" style={styles.finalBarcodeContainer}>
            <h3 style={styles.finalBarcodeHeading}>📦 Final Barcode Summary</h3>

            <div style={styles.finalBarcodeContent}>
              {/* Barcode Image */}
              <div style={styles.finalBarcodeImageSection}>
                <Barcode
                  value={`${barcodeNumbers[0]}-${barcodeNumbers[barcodeNumbers.length - 1]}`}
                  width={2.5}
                  height={70}
                  fontSize={28}
                  margin={0}
                />
              </div>

              {/* Details Grid */}
              <div style={styles.finalBarcodeDetailsGrid}>
                <div style={styles.detailRow} className="detail-row">
                  <span style={styles.detailLabel}>📍 Start:</span>
                  <span style={styles.detailValue}>{barcodeNumbers[0]}</span>
                </div>
                <div style={styles.detailRow} className="detail-row">
                  <span style={styles.detailLabel}>🏁 End:</span>
                  <span style={styles.detailValue}>
                    {barcodeNumbers[barcodeNumbers.length - 1]}
                  </span>
                </div>
                <div style={styles.detailRow} className="detail-row">
                  <span style={styles.detailLabel}>🏷️ SKU Code:</span>
                  <span style={styles.detailValue}>{skuc}</span>
                </div>
                <div style={styles.detailRow} className="detail-row">
                  <span style={styles.detailLabel}>📦 SKU Name:</span>
                  <span style={styles.detailValue}>{skun}</span>
                </div>
                <div style={styles.detailRow} className="detail-row">
                  <span style={styles.detailLabel}>📍 Location:</span>
                  <span style={styles.detailValue}>{location}</span>
                </div>
                <div style={styles.detailRow} className="detail-row">
                  <span style={styles.detailLabel}>📅 Packing Date:</span>
                  <span style={styles.detailValue}>{currentTime}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container1: {
    textAlign: "center",
    padding: "30px",
    fontFamily: "'Arial', sans-serif",
    background: "linear-gradient(-45deg, #fcb900, #9900ef, #ff6900, #00ff07)",
    backgroundSize: "400% 400%",
    animation: "gradientAnimation 12s ease infinite",
    // borderRadius: "8px",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    // maxWidth: "1500px",
    margin: "auto",
  },
  container: {
    textAlign: "center",
    padding: "30px 20px",
    fontFamily: "'Arial', sans-serif",
    backgroundColor: "rgba(218, 216, 224, 0.6)",
    borderRadius: "8px",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    maxWidth: "1400px",
    margin: "auto",
  },
  heading: {
    color: "white",
    marginBottom: "30px",
    fontSize: "44px",
    fontWeight: "bold",
    textShadow: "2px 2px 4px rgba(0, 0, 0, 0.3)",
    padding: "0 30px",
  },
  form: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
    gap: "20px",
    marginBottom: "30px",
    padding: "0 30px",
    maxWidth: "1200px",
    margin: "0 auto 30px auto",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    width: "100%",
    maxWidth: "400px",
    marginBottom: "5px",
  },
  label: {
    marginBottom: "5px",
    fontSize: "20px",
    color: "white",
    fontWeight: "bold",
  },
  input: {
    padding: "12px 15px",
    fontSize: "14px",
    border: "1px solid #ccc",
    borderRadius: "25px",
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    transition: "all 0.3s ease",
  },
  divider: {
    height: "2px",
    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
    margin: "20px 0",
    gridColumn: "1 / -1",
  },
  sectionHeader: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: "10px",
    textShadow: "2px 2px 4px rgba(0, 0, 0, 0.3)",
    gridColumn: "1 / -1",
    padding: "10px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: "12px",
  },
  fullWidth: {
    gridColumn: "1 / -1",
  },
  buttonGroup: {
    display: "flex",
    gap: "15px",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: "10px",
  },
  barcodeContainer: {
    margin: "0 0 24px 0",
    padding: "15px",
    border: "none",
    backgroundColor: "transparent",
    textAlign: "left",
    fontSize: "10px",
    fontWeight: "bold",
    display: "inline-block",
    width: "100%",
    maxWidth: "100%",
  },
  barcodeDetails: {
    fontSize: "12px",
    marginTop: "10px",
    color: "#333",
    textAlign: "left",
  },
  barcodeInfo: {
    padding: "4px 0",
    fontSize: "13px",
    color: "#333",
  },

  finalBarcodeContainer: {
    margin: "30px auto",
    padding: "30px",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: "20px",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
    maxWidth: "900px",
    border: "3px solid rgba(153, 0, 239, 0.3)",
  },
  finalBarcodeHeading: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#9900ef",
    textAlign: "center",
    marginBottom: "25px",
    textShadow: "1px 1px 2px rgba(0, 0, 0, 0.1)",
  },
  finalBarcodeContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "25px",
  },
  finalBarcodeImageSection: {
    padding: "20px",
    backgroundColor: "#f8f9fa",
    borderRadius: "12px",
    border: "2px dashed #9900ef",
  },
  finalBarcodeDetailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "15px",
    width: "100%",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 20px",
    backgroundColor: "#f8f9fa",
    borderRadius: "10px",
    border: "1px solid #e0e0e0",
    transition: "all 0.3s ease",
  },
  detailLabel: {
    fontWeight: "bold",
    color: "#555",
    fontSize: "14px",
  },
  detailValue: {
    color: "#333",
    fontSize: "14px",
    fontWeight: "600",
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

/* Input field enhancements */
input:focus, select:focus {
  outline: none;
  border: 2px solid #9900ef !important;
  box-shadow: 0 0 10px rgba(153, 0, 239, 0.3);
  transform: scale(1.02);
}

input:hover, select:hover {
  border-color: #ff6900;
  box-shadow: 0 2px 8px rgba(255, 105, 0, 0.2);
}

/* Detail row hover effect */
.detail-row:hover {
  background-color: #e8f4f8 !important;
  transform: translateX(5px);
  box-shadow: 0 2px 8px rgba(153, 0, 239, 0.2);
}

/* Base button styles */
.styled-button {
  margin: 5px;
  padding: 14px 28px;
  background: linear-gradient(135deg, #9900ef 0%, #ff6900 100%);
  color: white;
  border: none;
  borderRadius: 25px;
  cursor: pointer;
  fontSize: 16px;
  fontWeight: bold;
  transition: all 0.3s ease;
  boxShadow: 0 4px 12px rgba(153, 0, 239, 0.3);
  textAlign: center;
  minWidth: 200px;
}

.styled-button:hover {
  background: linear-gradient(135deg, #8800dd 0%, #ee5800 100%);
  transform: translateY(-2px);
  boxShadow: 0 6px 16px rgba(153, 0, 239, 0.4);
}

.styled-button:active {
  transform: translateY(0);
  boxShadow: 0 2px 8px rgba(153, 0, 239, 0.3);
}

.styled-button:disabled {
  background: linear-gradient(135deg, #ccc 0%, #999 100%);
  cursor: not-allowed;
  opacity: 0.6;
}
`;

export default QRCreater;
