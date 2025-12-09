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
  const [barcodeCoreWeights, setBarcodeCoreWeights] = useState({}); // Store core weight for each barcode
  const [barcodeGrossWeights, setBarcodeGrossWeights] = useState({}); // Store gross weight for each barcode (renamed from barcodeWeights)
  const [barcodeNetWeights, setBarcodeNetWeights] = useState({}); // Store calculated net weight for each barcode
  const [printedBarcodes, setPrintedBarcodes] = useState({}); // Track which barcodes have been printed
  const [isDownloading, setIsDownloading] = useState(false);
  const [excelData, setExcelData] = useState([]); // To store parsed Excel data
  const [productSuggestions, setProductSuggestions] = useState([]); // For autocomplete

  // Get unique operator names from Excel data
  const [operatorOptions, setOperatorOptions] = useState({
    rewinder: [],
    edgeCut: [],
    winder: [],
    mixer: [],
    packedBy: [],
    batchNo: [],
    shift: []
  });

  // State for "Other" option handling
  const [showRewinderOther, setShowRewinderOther] = useState(false);
  const [showEdgeOther, setShowEdgeOther] = useState(false);
  const [showWinderOther, setShowWinderOther] = useState(false);
  const [showMixerOther, setShowMixerOther] = useState(false);
  const [showPackedOther, setShowPackedOther] = useState(false);
  const [showBatchOther, setShowBatchOther] = useState(false);
  const [showShiftOther, setShowShiftOther] = useState(false);

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

            // Assuming first row is header: [Product Name, SKU Code No, SKU Name, Weight, Packed By, Batch No, Shift, Rewinder, Edge Cut, Winder, Mixer]
            const [header, ...rows] = data;
            const products = rows.map((row) => ({
              productName: row[0],
              skuCode: row[1],
              skuName: row[2],
              weight: row[3],
              packedBy: row[4],
              batchNo: row[5],
              shift: row[6],
              rewinderOperator: row[7],
              edgeCutOperator: row[8],
              winderOperator: row[9],
              mixerOperator: row[10],
            }));
            setExcelData(products);

            // Extract unique operator names for dropdowns
            const uniqueRewinder = [...new Set(products.map(p => p.rewinderOperator).filter(Boolean))];
            const uniqueEdgeCut = [...new Set(products.map(p => p.edgeCutOperator).filter(Boolean))];
            const uniqueWinder = [...new Set(products.map(p => p.winderOperator).filter(Boolean))];
            const uniqueMixer = [...new Set(products.map(p => p.mixerOperator).filter(Boolean))];
            const uniquePackedBy = [...new Set(products.map(p => p.packedBy).filter(Boolean))];
            const uniqueBatchNo = [...new Set(products.map(p => p.batchNo).filter(Boolean))];
            const uniqueShift = [...new Set(products.map(p => p.shift).filter(Boolean))];

            setOperatorOptions({
              rewinder: uniqueRewinder,
              edgeCut: uniqueEdgeCut,
              winder: uniqueWinder,
              mixer: uniqueMixer,
              packedBy: uniquePackedBy,
              batchNo: uniqueBatchNo,
              shift: uniqueShift
            });

            console.log("Loaded Excel Data:", products); // Debug log
            console.log("Operator Options:", {
              rewinder: uniqueRewinder,
              edgeCut: uniqueEdgeCut,
              winder: uniqueWinder,
              mixer: uniqueMixer,
              packedBy: uniquePackedBy,
              batchNo: uniqueBatchNo,
              shift: uniqueShift
            });
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

  // Function to handle printing of individual barcode
  const handlePrintIndividualBarcode = async (index) => {
    const barcodeNumber = barcodeNumbers[index];
    const coreWeight = barcodeCoreWeights[barcodeNumber] || "";
    const grossWeight = barcodeGrossWeights[barcodeNumber];
    const netWeight = barcodeNetWeights[barcodeNumber] || "";

    // Check if already printed (prevent duplicates)
    if (printedBarcodes[barcodeNumber]) {
      showToast.warning("⚠️ This barcode has already been printed and saved!");
      return;
    }

    // Check if gross weight is entered (required)
    if (!grossWeight) {
      showToast.error("⚠️ Please enter Gross Weight before printing!");
      return;
    }

    // Save to database first
    try {
      showToast.info("Saving barcode data...");
      const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

      const singleBarcodeData = {
        product,
        packed,
        batch,
        shift,
        numberOfBarcodes: 1,
        location,
        currentTime,
        rewinder,
        edge,
        winder,
        mixer,
        skuc,
        skun,
        batchNumbers: [parseInt(barcodeNumber.replace(skuc, "")) || 0],
        coreWeight: coreWeight,
        grossWeight: grossWeight,
        netWeight: netWeight
      };

      await axios.post(`${backendUrl}/api/saved`, singleBarcodeData);

      // DO NOT save to inventory yet - only save when scanned in SelectForm
      // The barcode is now in the database and will appear in SelectForm as "unscanned"

      showToast.success(`✅ Barcode ${barcodeNumber} saved to database!`);

      // Print using browser's native print (works better in production)
      // Create custom print content showing ONLY Gross Weight
      const printWindow = document.createElement('iframe');
      printWindow.style.position = 'absolute';
      printWindow.style.width = '0';
      printWindow.style.height = '0';
      printWindow.style.border = 'none';

      document.body.appendChild(printWindow);

      const doc = printWindow.contentWindow.document;
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>Print Barcode ${barcodeNumber}</title>
            <style>
              @media print {
                @page { size: 4in 6in; margin: 0; }
                body { margin: 0; padding: 20px; }
              }
              body {
                font-family: Arial, sans-serif;
                width: 4in;
                height: 6in;
              }
              .barcode-container {
                text-align: left;
                font-weight: bold;
                border: 1px solid #000;
                padding: 20px;
              }
              .barcode-info {
                padding: 4px 0;
                font-size: 13px;
              }
            </style>
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          </head>
          <body>
            <div class="barcode-container">
              <svg id="barcode"></svg>
              <div class="barcode-info"><strong>Barcode:</strong> ${barcodeNumber}</div>
              <div class="barcode-info"><strong>SKU Code:</strong> ${skuc}</div>
              <div class="barcode-info"><strong>SKU Name:</strong> ${skun}</div>
              <div class="barcode-info"><strong>Gross Weight:</strong> ${grossWeight}</div>
              <div class="barcode-info"><strong>Location:</strong> ${location}</div>
              <div class="barcode-info"><strong>Date:</strong> ${currentTime}</div>
            </div>
            <script>
              JsBarcode("#barcode", "${barcodeNumber}", {
                format: "CODE128",
                width: 3,
                height: 80,
                fontSize: 32,
                margin: 0,
                displayValue: true
              });
            </script>
          </body>
        </html>
      `);
      doc.close();

      // Wait for content to load, then print ONCE
      setTimeout(() => {
        printWindow.contentWindow.print();
        // Remove iframe after printing
        setTimeout(() => {
          if (document.body.contains(printWindow)) {
            document.body.removeChild(printWindow);
          }
        }, 1000);
      }, 500);

      // Mark this barcode as printed instead of removing it
      setPrintedBarcodes(prev => ({
        ...prev,
        [barcodeNumber]: {
          printedAt: new Date().toLocaleTimeString(),
          serialNumber: index + 1
        }
      }));

      showToast.success(`✅ Barcode #${index + 1} (${barcodeNumber}) saved & printed!`);

    } catch (error) {
      console.error("Error saving barcode:", error);
      showToast.error("Failed to save. Please try again.");
      return; // Don't print if save failed
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
      // Send all three weight types
      barcodeCoreWeights,
      barcodeGrossWeights,
      barcodeNetWeights
    };

    try {
      // Save to barcodes collection
      const response = await axios.post(`${backendUrl}/api/saved`, formData);
      showToast.success(response.data.message);

      // DO NOT save to inventory yet - barcodes will appear in SelectForm as "unscanned"
      // They will only be added to inventory when actually scanned in SelectForm
      showToast.success(`✓ ${barcodeNumbers.length} barcodes saved! They will appear in SelectForm.`);

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
            {!showPackedOther ? (
              <select
                id="packed"
                value={packed}
                onChange={(e) => {
                  if (e.target.value === "__other__") {
                    setShowPackedOther(true);
                    setPacked("");
                  } else {
                    setPacked(e.target.value);
                  }
                }}
                required
                style={{
                  ...styles.input,
                  cursor: "pointer",
                  backgroundColor: packed
                    ? "rgba(144, 238, 144, 0.2)"
                    : "rgba(255, 255, 255, 0.8)",
                }}
              >
                <option value="">-- Select Packer --</option>
                {operatorOptions.packedBy.map((name, idx) => (
                  <option key={idx} value={name}>{name}</option>
                ))}
                <option value="__other__">✏️ Enter Manually</option>
              </select>
            ) : (
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Enter packer name"
                  value={packed}
                  onChange={(e) => setPacked(e.target.value)}
                  required
                  style={{
                    ...styles.input,
                    flex: 1,
                    backgroundColor: packed
                      ? "rgba(144, 238, 144, 0.2)"
                      : "rgba(255, 255, 255, 0.8)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowPackedOther(false);
                    setPacked("");
                  }}
                  style={{
                    padding: "10px 15px",
                    backgroundColor: "#ff6900",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "12px"
                  }}
                >
                  ↩️ Back
                </button>
              </div>
            )}
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="batch" style={styles.label}>
              Batch No:
            </label>
            {!showBatchOther ? (
              <select
                id="batch"
                value={batch}
                onChange={(e) => {
                  if (e.target.value === "__other__") {
                    setShowBatchOther(true);
                    setBatch("");
                  } else {
                    setBatch(e.target.value);
                  }
                }}
                required
                style={{
                  ...styles.input,
                  cursor: "pointer",
                  backgroundColor: batch
                    ? "rgba(144, 238, 144, 0.2)"
                    : "rgba(255, 255, 255, 0.8)",
                }}
              >
                <option value="">-- Select Batch No --</option>
                {operatorOptions.batchNo.map((num, idx) => (
                  <option key={idx} value={num}>{num}</option>
                ))}
                <option value="__other__">✏️ Enter Manually</option>
              </select>
            ) : (
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Enter batch number"
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  required
                  style={{
                    ...styles.input,
                    flex: 1,
                    backgroundColor: batch
                      ? "rgba(144, 238, 144, 0.2)"
                      : "rgba(255, 255, 255, 0.8)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowBatchOther(false);
                    setBatch("");
                  }}
                  style={{
                    padding: "10px 15px",
                    backgroundColor: "#ff6900",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "12px"
                  }}
                >
                  ↩️ Back
                </button>
              </div>
            )}
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="shift" style={styles.label}>
              Shift (Day/Night):
            </label>
            {!showShiftOther ? (
              <select
                id="shift"
                value={shift}
                onChange={(e) => {
                  if (e.target.value === "__other__") {
                    setShowShiftOther(true);
                    setShift("");
                  } else {
                    setShift(e.target.value);
                  }
                }}
                required
                style={{
                  ...styles.input,
                  cursor: "pointer",
                  backgroundColor: shift
                    ? "rgba(144, 238, 144, 0.2)"
                    : "rgba(255, 255, 255, 0.8)",
                }}
              >
                <option value="">-- Select Shift --</option>
                <option value="Day">Day</option>
                <option value="Night">Night</option>
                {operatorOptions.shift.filter(s => s !== "Day" && s !== "Night").map((s, idx) => (
                  <option key={idx} value={s}>{s}</option>
                ))}
                <option value="__other__">✏️ Enter Manually</option>
              </select>
            ) : (
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Enter shift"
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                  required
                  style={{
                    ...styles.input,
                    flex: 1,
                    backgroundColor: shift
                      ? "rgba(144, 238, 144, 0.2)"
                      : "rgba(255, 255, 255, 0.8)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowShiftOther(false);
                    setShift("");
                  }}
                  style={{
                    padding: "10px 15px",
                    backgroundColor: "#ff6900",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "12px"
                  }}
                >
                  ↩️ Back
                </button>
              </div>
            )}
          </div>

          <div style={styles.divider}></div>

          {/* Operators Section */}
          <div style={styles.sectionHeader}>👷 Operators</div>

          <div style={styles.inputGroup}>
            <label htmlFor="rewinder" style={styles.label}>
              Rewinder Operator:
            </label>
            {!showRewinderOther ? (
              <select
                id="rewinder"
                value={rewinder}
                onChange={(e) => {
                  if (e.target.value === "__other__") {
                    setShowRewinderOther(true);
                    setRewinder("");
                  } else {
                    setRewinder(e.target.value);
                  }
                }}
                required
                style={{
                  ...styles.input,
                  cursor: "pointer",
                  backgroundColor: rewinder
                    ? "rgba(144, 238, 144, 0.2)"
                    : "rgba(255, 255, 255, 0.8)",
                }}
              >
                <option value="">-- Select Rewinder Operator --</option>
                {operatorOptions.rewinder.map((name, idx) => (
                  <option key={idx} value={name}>{name}</option>
                ))}
                <option value="__other__">✏️ Enter Manually</option>
              </select>
            ) : (
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Enter rewinder operator"
                  value={rewinder}
                  onChange={(e) => setRewinder(e.target.value)}
                  required
                  style={{
                    ...styles.input,
                    flex: 1,
                    backgroundColor: rewinder
                      ? "rgba(144, 238, 144, 0.2)"
                      : "rgba(255, 255, 255, 0.8)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowRewinderOther(false);
                    setRewinder("");
                  }}
                  style={{
                    padding: "10px 15px",
                    backgroundColor: "#ff6900",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "12px"
                  }}
                >
                  ↩️ Back
                </button>
              </div>
            )}
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="edge" style={styles.label}>
              Edge Cut Operator:
            </label>
            {!showEdgeOther ? (
              <select
                id="edge"
                value={edge}
                onChange={(e) => {
                  if (e.target.value === "__other__") {
                    setShowEdgeOther(true);
                    setEdge("");
                  } else {
                    setEdge(e.target.value);
                  }
                }}
                required
                style={{
                  ...styles.input,
                  cursor: "pointer",
                  backgroundColor: edge
                    ? "rgba(144, 238, 144, 0.2)"
                    : "rgba(255, 255, 255, 0.8)",
                }}
              >
                <option value="">-- Select Edge Cut Operator --</option>
                {operatorOptions.edgeCut.map((name, idx) => (
                  <option key={idx} value={name}>{name}</option>
                ))}
                <option value="__other__">✏️ Enter Manually</option>
              </select>
            ) : (
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Enter edge cut operator"
                  value={edge}
                  onChange={(e) => setEdge(e.target.value)}
                  required
                  style={{
                    ...styles.input,
                    flex: 1,
                    backgroundColor: edge
                      ? "rgba(144, 238, 144, 0.2)"
                      : "rgba(255, 255, 255, 0.8)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowEdgeOther(false);
                    setEdge("");
                  }}
                  style={{
                    padding: "10px 15px",
                    backgroundColor: "#ff6900",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "12px"
                  }}
                >
                  ↩️ Back
                </button>
              </div>
            )}
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="winder" style={styles.label}>
              Winder Operator:
            </label>
            {!showWinderOther ? (
              <select
                id="winder"
                value={winder}
                onChange={(e) => {
                  if (e.target.value === "__other__") {
                    setShowWinderOther(true);
                    setWinder("");
                  } else {
                    setWinder(e.target.value);
                  }
                }}
                required
                style={{
                  ...styles.input,
                  cursor: "pointer",
                  backgroundColor: winder
                    ? "rgba(144, 238, 144, 0.2)"
                    : "rgba(255, 255, 255, 0.8)",
                }}
              >
                <option value="">-- Select Winder Operator --</option>
                {operatorOptions.winder.map((name, idx) => (
                  <option key={idx} value={name}>{name}</option>
                ))}
                <option value="__other__">✏️ Enter Manually</option>
              </select>
            ) : (
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Enter winder operator"
                  value={winder}
                  onChange={(e) => setWinder(e.target.value)}
                  required
                  style={{
                    ...styles.input,
                    flex: 1,
                    backgroundColor: winder
                      ? "rgba(144, 238, 144, 0.2)"
                      : "rgba(255, 255, 255, 0.8)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowWinderOther(false);
                    setWinder("");
                  }}
                  style={{
                    padding: "10px 15px",
                    backgroundColor: "#ff6900",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "12px"
                  }}
                >
                  ↩️ Back
                </button>
              </div>
            )}
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="mixer" style={styles.label}>
              Mixer Operator:
            </label>
            {!showMixerOther ? (
              <select
                id="mixer"
                value={mixer}
                onChange={(e) => {
                  if (e.target.value === "__other__") {
                    setShowMixerOther(true);
                    setMixer("");
                  } else {
                    setMixer(e.target.value);
                  }
                }}
                required
                style={{
                  ...styles.input,
                  cursor: "pointer",
                  backgroundColor: mixer
                    ? "rgba(144, 238, 144, 0.2)"
                    : "rgba(255, 255, 255, 0.8)",
                }}
              >
                <option value="">-- Select Mixer Operator --</option>
                {operatorOptions.mixer.map((name, idx) => (
                  <option key={idx} value={name}>{name}</option>
                ))}
                <option value="__other__">✏️ Enter Manually</option>
              </select>
            ) : (
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Enter mixer operator"
                  value={mixer}
                  onChange={(e) => setMixer(e.target.value)}
                  required
                  style={{
                    ...styles.input,
                    flex: 1,
                    backgroundColor: mixer
                      ? "rgba(144, 238, 144, 0.2)"
                      : "rgba(255, 255, 255, 0.8)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowMixerOther(false);
                    setMixer("");
                  }}
                  style={{
                    padding: "10px 15px",
                    backgroundColor: "#ff6900",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "12px"
                  }}
                >
                  ↩️ Back
                </button>
              </div>
            )}
          </div>

          <div style={styles.divider}></div>

          <div style={styles.fullWidth}>
            <div style={styles.buttonGroup}>
              <button className="styled-button" onClick={handlePrint}>
                🖨️ Print Final Barcode Summary
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
            gap: "20px",
            flexWrap: "nowrap",
            marginBottom: "30px",
            width: "100%",
          }}
        >
          {Array.from({ length: barcodeNumbers.length }).map((_, index) => {
            const barcodeNumber = barcodeNumbers[index];
            const isPrinted = printedBarcodes[barcodeNumber];

            return (
              <div
                id={`barcode-div-${index}`}
                key={index}
                style={{
                  ...styles.barcodeContainer,
                  backgroundColor: isPrinted ? "rgba(16, 185, 129, 0.05)" : "rgba(255, 255, 255, 0.95)",
                  borderRadius: "15px",
                  padding: "20px",
                  boxShadow: isPrinted
                    ? "0 4px 12px rgba(16, 185, 129, 0.3)"
                    : "0 4px 12px rgba(0, 0, 0, 0.1)",
                  border: isPrinted
                    ? "2px solid rgba(16, 185, 129, 0.5)"
                    : "2px solid rgba(153, 0, 239, 0.2)",
                  position: "relative"
                }}
              >
                {/* Printed Status Badge */}
                {isPrinted && (
                  <div style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    zIndex: 10
                  }}>
                    <span>✅ SAVED & PRINTED</span>
                    <span style={{
                      background: "rgba(255, 255, 255, 0.2)",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontSize: "11px"
                    }}>
                      #{isPrinted.serialNumber}
                    </span>
                  </div>
                )}

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
                  {/* Weight Fields Section */}
                  <div style={{
                    ...styles.barcodeInfo,
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    marginTop: "15px",
                    padding: "15px",
                    backgroundColor: "rgba(153, 0, 239, 0.05)",
                    borderRadius: "8px",
                    border: "1px solid rgba(153, 0, 239, 0.2)"
                  }}>
                    <div style={{ fontWeight: "bold", color: "#9900ef", marginBottom: "5px" }}>
                      ⚖️ Weight Information
                    </div>

                    {/* Core Weight */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <strong style={{ minWidth: "120px" }}>Core Weight:</strong>
                      <input
                        type="text"
                        placeholder="Enter core weight (optional)"
                        value={barcodeCoreWeights[barcodeNumbers[index]] || ""}
                        onChange={(e) => {
                          const newCoreWeight = e.target.value;
                          setBarcodeCoreWeights({
                            ...barcodeCoreWeights,
                            [barcodeNumbers[index]]: newCoreWeight
                          });

                          // Auto-calculate net weight if both core and gross weights exist
                          const grossWeight = barcodeGrossWeights[barcodeNumbers[index]];
                          if (grossWeight && newCoreWeight) {
                            const gross = parseFloat(grossWeight) || 0;
                            const core = parseFloat(newCoreWeight) || 0;
                            const net = gross - core;
                            setBarcodeNetWeights({
                              ...barcodeNetWeights,
                              [barcodeNumbers[index]]: net >= 0 ? net.toString() : "0"
                            });
                          }
                        }}
                        style={{
                          padding: "8px 12px",
                          fontSize: "14px",
                          border: "2px solid #9900ef",
                          borderRadius: "8px",
                          flex: 1,
                          backgroundColor: "white"
                        }}
                      />
                    </div>

                    {/* Gross Weight */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <strong style={{ minWidth: "120px" }}>Gross Weight:</strong>
                      <input
                        type="text"
                        placeholder="Enter gross weight (required)"
                        value={barcodeGrossWeights[barcodeNumbers[index]] || ""}
                        onChange={(e) => {
                          const newGrossWeight = e.target.value;
                          setBarcodeGrossWeights({
                            ...barcodeGrossWeights,
                            [barcodeNumbers[index]]: newGrossWeight
                          });

                          // Auto-calculate net weight if both core and gross weights exist
                          const coreWeight = barcodeCoreWeights[barcodeNumbers[index]];
                          if (coreWeight && newGrossWeight) {
                            const gross = parseFloat(newGrossWeight) || 0;
                            const core = parseFloat(coreWeight) || 0;
                            const net = gross - core;
                            setBarcodeNetWeights({
                              ...barcodeNetWeights,
                              [barcodeNumbers[index]]: net >= 0 ? net.toString() : "0"
                            });
                          }
                        }}
                        style={{
                          padding: "8px 12px",
                          fontSize: "14px",
                          border: "2px solid #10b981",
                          borderRadius: "8px",
                          flex: 1,
                          backgroundColor: "white"
                        }}
                      />
                      <span style={{
                        color: barcodeGrossWeights[barcodeNumbers[index]] ? "#10b981" : "#ef4444",
                        fontWeight: "bold"
                      }}>
                        {barcodeGrossWeights[barcodeNumbers[index]] ? "✓" : "⚠️ Required"}
                      </span>
                    </div>

                    {/* Net Weight (Calculated) */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <strong style={{ minWidth: "120px" }}>Net Weight:</strong>
                      <input
                        type="text"
                        placeholder="Auto-calculated"
                        value={barcodeNetWeights[barcodeNumbers[index]] || ""}
                        readOnly
                        style={{
                          padding: "8px 12px",
                          fontSize: "14px",
                          border: "2px solid #6b7280",
                          borderRadius: "8px",
                          flex: 1,
                          backgroundColor: "#f3f4f6",
                          color: "#374151",
                          cursor: "not-allowed"
                        }}
                      />
                      <span style={{ color: "#6b7280", fontSize: "12px" }}>
                        (Gross - Core)
                      </span>
                    </div>
                  </div>
                  <div style={styles.barcodeInfo}>
                    <strong>Location:</strong> {location}
                  </div>
                  <div style={styles.barcodeInfo}>
                    <strong>Date:</strong> {currentTime}
                  </div>

                  {/* Print Button */}
                  <div style={{ marginTop: "15px", textAlign: "center" }}>
                    <button
                      className="styled-button"
                      onClick={() => handlePrintIndividualBarcode(index)}
                      disabled={isPrinted}
                      style={{
                        padding: "12px 24px",
                        background: isPrinted
                          ? "linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)"
                          : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        color: "white",
                        border: "none",
                        borderRadius: "12px",
                        cursor: isPrinted ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        fontWeight: "bold",
                        boxShadow: isPrinted
                          ? "0 2px 6px rgba(107, 114, 128, 0.2)"
                          : "0 4px 12px rgba(16, 185, 129, 0.3)",
                        transition: "all 0.3s ease",
                        minWidth: "auto",
                        width: "100%",
                        opacity: isPrinted ? 0.6 : 1
                      }}
                      onMouseOver={(e) => {
                        if (!isPrinted) {
                          e.target.style.background = "linear-gradient(135deg, #059669 0%, #047857 100%)";
                          e.target.style.transform = "translateY(-2px)";
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!isPrinted) {
                          e.target.style.background = "linear-gradient(135deg, #10b981 0%, #059669 100%)";
                          e.target.style.transform = "translateY(0)";
                        }
                      }}
                    >
                      {isPrinted ? "✅ Already Printed" : `🖨️ Print & Save Barcode #${index + 1}`}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
                  <span style={styles.detailLabel}>⚖️ Total Barcodes:</span>
                  <span style={styles.detailValue}>{barcodeNumbers.length}</span>
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
