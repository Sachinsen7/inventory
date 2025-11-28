import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import Barcode from "react-barcode";

const ProductDetails = () => {
    const { sku } = useParams();
    const [searchParams] = useSearchParams();
    const skuFromQuery = searchParams.get('sku');
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
    const actualSku = sku || skuFromQuery;

    useEffect(() => {
        if (actualSku) {
            fetchProductDetails(actualSku);
        }
    }, [actualSku]);

    const fetchProductDetails = async (skuCode) => {
        try {
            setLoading(true);
            const response = await axios.get(`${backendUrl}/api/barcodes`);

            // Find the product that contains this SKU in its batch numbers
            let foundProduct = null;

            response.data.forEach((barcode) => {
                if (barcode.batchNumbers && Array.isArray(barcode.batchNumbers)) {
                    barcode.batchNumbers.forEach((bn) => {
                        if (barcode.skuc && bn) {
                            const fullSkuCode = String(barcode.skuc) + String(bn);
                            if (fullSkuCode === skuCode) {
                                foundProduct = {
                                    sku: fullSkuCode,
                                    product: barcode.product || "Unknown Product",
                                    skuName: barcode.skun || "",
                                    packed: barcode.packed || "",
                                    batch: barcode.batch || "",
                                    weight: barcode.weight || "",
                                    shift: barcode.shift || "",
                                    location: barcode.location || "",
                                    currentTime: barcode.currentTime || "",
                                    rewinder: barcode.rewinder || "",
                                    edge: barcode.edge || "",
                                    winder: barcode.winder || "",
                                    mixer: barcode.mixer || "",
                                };
                            }
                        }
                    });
                }
            });

            if (foundProduct) {
                setProduct(foundProduct);
                setError(null);
            } else {
                setError("Product not found");
            }
            setLoading(false);
        } catch (err) {
            console.error("Error fetching product:", err);
            setError("Error loading product details");
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const styles = {
        container: {
            minHeight: "100vh",
            background: "linear-gradient(-45deg, #fcb900, #9900ef, #ff6900, #00ff07)",
            backgroundSize: "400% 400%",
            animation: "gradientAnimation 12s ease infinite",
            padding: "20px",
            fontFamily: "'Roboto', sans-serif",
        },
        card: {
            backgroundColor: "white",
            borderRadius: "20px",
            padding: "30px",
            maxWidth: "800px",
            margin: "0 auto",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        },
        header: {
            textAlign: "center",
            marginBottom: "30px",
            borderBottom: "3px solid #4CAF50",
            paddingBottom: "20px",
        },
        title: {
            color: "#4CAF50",
            fontSize: "32px",
            fontWeight: "bold",
            margin: "0 0 10px 0",
        },
        subtitle: {
            color: "#666",
            fontSize: "16px",
            margin: 0,
        },
        barcodeSection: {
            textAlign: "center",
            margin: "30px 0",
            padding: "20px",
            background: "#f5f5f5",
            borderRadius: "12px",
        },
        detailsGrid: {
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "12px",
            margin: "20px 0",
        },
        detailRow: {
            padding: "15px",
            background: "#f9f9f9",
            borderLeft: "4px solid #4CAF50",
            borderRadius: "8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
        },
        detailLabel: {
            fontWeight: "bold",
            color: "#4CAF50",
            fontSize: "16px",
            minWidth: "140px",
        },
        detailValue: {
            color: "#333",
            fontSize: "18px",
            fontWeight: "600",
            flex: 1,
            textAlign: "right",
        },
        buttonContainer: {
            display: "flex",
            gap: "15px",
            justifyContent: "center",
            marginTop: "30px",
            flexWrap: "wrap",
        },
        button: {
            padding: "15px 30px",
            fontSize: "18px",
            fontWeight: "bold",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
            transition: "all 0.3s ease",
            minWidth: "150px",
        },
        printButton: {
            background: "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)",
            color: "white",
        },
        backButton: {
            background: "linear-gradient(135deg, #9900ef 0%, #7700cc 100%)",
            color: "white",
        },
        loading: {
            textAlign: "center",
            padding: "50px",
            fontSize: "24px",
            color: "#666",
        },
        error: {
            textAlign: "center",
            padding: "50px",
            fontSize: "20px",
            color: "#f44336",
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

    @media print {
      body { background: white !important; }
      .no-print { display: none !important; }
    }

    @media (max-width: 768px) {
      .detail-row {
        flex-direction: column !important;
        align-items: flex-start !important;
      }
      .detail-label {
        margin-bottom: 8px !important;
      }
      .detail-value {
        text-align: left !important;
        font-size: 20px !important;
      }
    }
  `;

    if (loading) {
        return (
            <div style={styles.container}>
                <style>{globalStyles}</style>
                <div style={styles.card}>
                    <div style={styles.loading}>
                        <div style={{ fontSize: "48px", marginBottom: "20px" }}>⏳</div>
                        Loading product details...
                    </div>
                </div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div style={styles.container}>
                <style>{globalStyles}</style>
                <div style={styles.card}>
                    <div style={styles.error}>
                        <div style={{ fontSize: "48px", marginBottom: "20px" }}>❌</div>
                        {error || "Product not found"}
                        <div style={{ marginTop: "20px" }}>
                            <p style={{ fontSize: "16px", color: "#666" }}>
                                SKU Code: {actualSku}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <style>{globalStyles}</style>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h1 style={styles.title}>📦 Product Details</h1>
                    <p style={styles.subtitle}>Complete Product Information</p>
                </div>

                <div style={styles.barcodeSection}>
                    <h2 style={{ margin: "0 0 15px 0", color: "#333", fontSize: "24px" }}>
                        {product.product}
                    </h2>
                    <Barcode
                        value={product.sku}
                        width={2}
                        height={80}
                        fontSize={20}
                        margin={10}
                    />
                </div>

                <div style={styles.detailsGrid}>
                    <div style={styles.detailRow} className="detail-row">
                        <span style={styles.detailLabel} className="detail-label">🏷️ SKU Code</span>
                        <span style={styles.detailValue} className="detail-value">{product.sku}</span>
                    </div>

                    {product.skuName && (
                        <div style={styles.detailRow} className="detail-row">
                            <span style={styles.detailLabel} className="detail-label">📦 SKU Name</span>
                            <span style={styles.detailValue} className="detail-value">{product.skuName}</span>
                        </div>
                    )}

                    {product.weight && (
                        <div style={styles.detailRow} className="detail-row">
                            <span style={styles.detailLabel} className="detail-label">⚖️ Weight</span>
                            <span style={styles.detailValue} className="detail-value">{product.weight}</span>
                        </div>
                    )}

                    {product.packed && (
                        <div style={styles.detailRow} className="detail-row">
                            <span style={styles.detailLabel} className="detail-label">👤 Packed By</span>
                            <span style={styles.detailValue} className="detail-value">{product.packed}</span>
                        </div>
                    )}

                    {product.batch && (
                        <div style={styles.detailRow} className="detail-row">
                            <span style={styles.detailLabel} className="detail-label">🔢 Batch No</span>
                            <span style={styles.detailValue} className="detail-value">{product.batch}</span>
                        </div>
                    )}

                    {product.shift && (
                        <div style={styles.detailRow} className="detail-row">
                            <span style={styles.detailLabel} className="detail-label">🌓 Shift</span>
                            <span style={styles.detailValue} className="detail-value">{product.shift}</span>
                        </div>
                    )}

                    {product.location && (
                        <div style={styles.detailRow} className="detail-row">
                            <span style={styles.detailLabel} className="detail-label">📍 Location</span>
                            <span style={styles.detailValue} className="detail-value">{product.location}</span>
                        </div>
                    )}

                    {product.currentTime && (
                        <div style={styles.detailRow} className="detail-row">
                            <span style={styles.detailLabel} className="detail-label">📅 Packing Date</span>
                            <span style={styles.detailValue} className="detail-value">{product.currentTime}</span>
                        </div>
                    )}

                    {product.rewinder && (
                        <div style={styles.detailRow} className="detail-row">
                            <span style={styles.detailLabel} className="detail-label">👷 Rewinder</span>
                            <span style={styles.detailValue} className="detail-value">{product.rewinder}</span>
                        </div>
                    )}

                    {product.edge && (
                        <div style={styles.detailRow} className="detail-row">
                            <span style={styles.detailLabel} className="detail-label">✂️ Edge Cut</span>
                            <span style={styles.detailValue} className="detail-value">{product.edge}</span>
                        </div>
                    )}

                    {product.winder && (
                        <div style={styles.detailRow} className="detail-row">
                            <span style={styles.detailLabel} className="detail-label">🔄 Winder</span>
                            <span style={styles.detailValue} className="detail-value">{product.winder}</span>
                        </div>
                    )}

                    {product.mixer && (
                        <div style={styles.detailRow} className="detail-row">
                            <span style={styles.detailLabel} className="detail-label">🥣 Mixer</span>
                            <span style={styles.detailValue} className="detail-value">{product.mixer}</span>
                        </div>
                    )}
                </div>

                <div style={styles.buttonContainer} className="no-print">
                    <button
                        style={{ ...styles.button, ...styles.printButton }}
                        onClick={handlePrint}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.05)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                        }}
                    >
                        🖨️ Print
                    </button>
                    <button
                        style={{ ...styles.button, ...styles.backButton }}
                        onClick={() => window.history.back()}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.05)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                        }}
                    >
                        ← Back
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductDetails;
