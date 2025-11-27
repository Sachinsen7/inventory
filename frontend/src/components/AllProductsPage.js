import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Barcode from 'react-barcode';
import { showToast } from '../utils/toastNotifications';

function AllProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [expandedCard, setExpandedCard] = useState(null);
  const [barcodeDetails, setBarcodeDetails] = useState({});
  const [loadingBarcode, setLoadingBarcode] = useState({});

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product =>
        (product.inputValue && product.inputValue.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.godownName && product.godownName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.itemName && product.itemName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  const toggleCard = async (productId, product) => {
    const newExpandedCard = expandedCard === productId ? null : productId;
    setExpandedCard(newExpandedCard);
    
    // Fetch barcode details when expanding a card
    if (newExpandedCard && product.inputValue && !barcodeDetails[productId]) {
      await fetchBarcodeDetails(productId, product.inputValue);
    }
  };

  const fetchBarcodeDetails = async (productId, inputValue) => {
    setLoadingBarcode(prev => ({ ...prev, [productId]: true }));
    try {
      // Fetch all barcodes
      const response = await axios.get(`${backendUrl}/api/barcodes`);
      const allBarcodes = response.data;
      
      console.log('All Barcodes:', allBarcodes);
      console.log('Looking for inputValue:', inputValue);
      
      // Try multiple matching strategies
      let matchingBarcode = null;
      
      // Strategy 1: Check if any batchNumber combined with skuc matches inputValue
      matchingBarcode = allBarcodes.find(barcode => {
        if (!barcode.skuc || !barcode.batchNumbers) return false;
        
        return barcode.batchNumbers.some(batchNum => {
          const fullCode = `${barcode.skuc}${batchNum}`;
          console.log('Checking:', fullCode, 'against', inputValue);
          return fullCode === inputValue;
        });
      });
      
      // Strategy 2: If not found, try partial match with SKU code
      if (!matchingBarcode) {
        matchingBarcode = allBarcodes.find(barcode => {
          if (!barcode.skuc) return false;
          // Check if inputValue starts with the SKU code
          return inputValue.startsWith(barcode.skuc);
        });
      }
      
      // Strategy 3: If still not found, just show the first barcode (for testing)
      // This will help us see if the display is working
      if (!matchingBarcode && allBarcodes.length > 0) {
        console.log('No exact match found, using first barcode for display');
        matchingBarcode = allBarcodes[0];
      }
      
      console.log('Matching Barcode:', matchingBarcode);
      
      if (matchingBarcode) {
        setBarcodeDetails(prev => ({
          ...prev,
          [productId]: matchingBarcode
        }));
      } else {
        console.log('No barcode found for product:', productId);
      }
    } catch (error) {
      console.error('Error fetching barcode details:', error);
    } finally {
      setLoadingBarcode(prev => ({ ...prev, [productId]: false }));
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/delevery1`);
      setProducts(response.data);
      setFilteredProducts(response.data);
      showToast.success(`Loaded ${response.data.length} products`);
    } catch (error) {
      console.error('Error fetching products:', error);
      showToast.error('Error fetching products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await axios.delete(`${backendUrl}/api/delevery1/${productId}`);
        showToast.success('Product deleted successfully');
        fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        showToast.error('Error deleting product');
      }
    }
  };

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #a855f7 0%, #c084fc 50%, #d8b4fe 100%)',
    padding: '40px 20px',
    color: 'white',
    fontSize: '16px',
  };

  const cardStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '30px',
    margin: '15px 0',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    width: '100%',
    maxWidth: '1200px',
    transition: 'all 0.3s ease',
  };

  const searchInputStyle = {
    width: '100%',
    padding: '12px 20px',
    fontSize: '14px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    color: '#333',
    marginBottom: '20px',
    outline: 'none',
    transition: 'all 0.3s ease',
  };

  const detailBoxStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  };

  const detailLabelStyle = {
    fontSize: '0.85rem',
    opacity: 0.8,
    marginBottom: '6px',
    fontWeight: '500',
  };

  const detailValueStyle = {
    fontSize: '1.05rem',
    fontWeight: 'bold',
    wordBreak: 'break-word',
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <p style={{ fontSize: '20px', margin: 0 }}>Loading products...</p>
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

          .product-card {
            transition: all 0.3s ease;
          }

          .product-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
            background-color: rgba(255, 255, 255, 0.2);
          }

          .btn {
            border-radius: 8px;
            padding: 8px 16px;
            font-weight: 600;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
          }

          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }

          .btn-danger {
            background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
            color: white;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>

      <div style={{ width: '100%', maxWidth: '1200px' }}>
        {/* Header */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '30px',
              boxShadow: '0 4px 12px rgba(251, 191, 36, 0.4)'
            }}>
              📦
            </div>
            <div>
              <h2 style={{
                margin: 0,
                fontSize: '2rem',
                fontWeight: 'bold',
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)',
              }}>
                All Products Created by Staff
              </h2>
              <p style={{ margin: '5px 0 0 0', opacity: 0.8, fontSize: '14px' }}>
                Total Products: {filteredProducts.length}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={cardStyle}>
          <input
            type="text"
            placeholder="🔍 Search by product name, godown, or staff name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={searchInputStyle}
            className="search-input"
          />
        </div>

        {/* Products Cards */}
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <div
              key={product._id}
              style={{
                ...cardStyle,
                cursor: 'pointer',
                marginBottom: '15px',
              }}
              onClick={() => toggleCard(product._id, product)}
              className="product-card"
            >
              {/* Card Header - Always Visible */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: expandedCard === product._id ? '20px' : '0',
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    margin: '0 0 8px 0',
                    fontSize: '1.4rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}>
                    <span style={{
                      background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                      padding: '4px 12px',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                    }}>
                      {product.inputValue || 'N/A'}
                    </span>
                    {product.itemName && (
                      <span style={{ fontSize: '1.2rem' }}>{product.itemName}</span>
                    )}
                  </h3>
                  <p style={{
                    margin: '0',
                    opacity: 0.8,
                    fontSize: '0.95rem',
                  }}>
                    📍 {product.godownName || 'N/A'}
                    {product.category && ` • 🏷️ ${product.category}`}
                  </p>
                </div>
                <div style={{
                  fontSize: '1.5rem',
                  transition: 'transform 0.3s ease',
                  transform: expandedCard === product._id ? 'rotate(180deg)' : 'rotate(0deg)',
                }}>
                  ▼
                </div>
              </div>

              {/* Expanded Details - ONLY Barcode Information */}
              {expandedCard === product._id && (
                <div
                  style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                    paddingTop: '20px',
                    animation: 'fadeIn 0.3s ease',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Barcode Creation Details */}
                  {loadingBarcode[product._id] ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '40px',
                    }}>
                      <div style={{ fontSize: '1.2rem', opacity: 0.8 }}>
                        🔄 Loading barcode details...
                      </div>
                    </div>
                  ) : barcodeDetails[product._id] ? (
                    <div>
                      {/* Barcode Display */}
                      <div style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        padding: '30px',
                        borderRadius: '15px',
                        marginBottom: '25px',
                        textAlign: 'center',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      }}>
                        <h4 style={{
                          margin: '0 0 20px 0',
                          fontSize: '1.4rem',
                          fontWeight: 'bold',
                          color: '#333',
                        }}>
                          Barcode: {product.inputValue}
                        </h4>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                          <Barcode 
                            value={product.inputValue} 
                            width={2}
                            height={80}
                            fontSize={20}
                            background="#ffffff"
                            lineColor="#000000"
                          />
                        </div>
                      </div>

                      {/* Barcode Creation Details */}
                      <h4 style={{
                        margin: '0 0 20px 0',
                        fontSize: '1.3rem',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}>
                        <span style={{ fontSize: '1.5rem' }}>📋</span>
                        Barcode Creation Details
                      </h4>
                      
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '15px',
                        marginBottom: '20px',
                      }}>
                        <div style={detailBoxStyle}>
                          <div style={detailLabelStyle}>📦 Product Name</div>
                          <div style={detailValueStyle}>{barcodeDetails[product._id].product || 'N/A'}</div>
                        </div>

                        <div style={detailBoxStyle}>
                          <div style={detailLabelStyle}>🔢 SKU Code</div>
                          <div style={detailValueStyle}>{barcodeDetails[product._id].skuc || 'N/A'}</div>
                        </div>

                        <div style={detailBoxStyle}>
                          <div style={detailLabelStyle}>🏷️ SKU Name</div>
                          <div style={detailValueStyle}>{barcodeDetails[product._id].skun || 'N/A'}</div>
                        </div>

                        <div style={detailBoxStyle}>
                          <div style={detailLabelStyle}>👤 Packed By</div>
                          <div style={detailValueStyle}>{barcodeDetails[product._id].packed || 'N/A'}</div>
                        </div>

                        <div style={detailBoxStyle}>
                          <div style={detailLabelStyle}>📦 Batch No</div>
                          <div style={detailValueStyle}>{barcodeDetails[product._id].batch || 'N/A'}</div>
                        </div>

                        <div style={detailBoxStyle}>
                          <div style={detailLabelStyle}>🌓 Shift</div>
                          <div style={detailValueStyle}>{barcodeDetails[product._id].shift || 'N/A'}</div>
                        </div>

                        <div style={detailBoxStyle}>
                          <div style={detailLabelStyle}>📍 Location</div>
                          <div style={detailValueStyle}>{barcodeDetails[product._id].location || 'N/A'}</div>
                        </div>

                        <div style={detailBoxStyle}>
                          <div style={detailLabelStyle}>⏰ Packing Time</div>
                          <div style={detailValueStyle}>{barcodeDetails[product._id].currentTime || 'N/A'}</div>
                        </div>

                        <div style={detailBoxStyle}>
                          <div style={detailLabelStyle}>🔄 Rewinder Operator</div>
                          <div style={detailValueStyle}>{barcodeDetails[product._id].rewinder || 'N/A'}</div>
                        </div>

                        <div style={detailBoxStyle}>
                          <div style={detailLabelStyle}>✂️ Edge Cut Operator</div>
                          <div style={detailValueStyle}>{barcodeDetails[product._id].edge || 'N/A'}</div>
                        </div>

                        <div style={detailBoxStyle}>
                          <div style={detailLabelStyle}>🎯 Winder Operator</div>
                          <div style={detailValueStyle}>{barcodeDetails[product._id].winder || 'N/A'}</div>
                        </div>

                        <div style={detailBoxStyle}>
                          <div style={detailLabelStyle}>🔀 Mixer Operator</div>
                          <div style={detailValueStyle}>{barcodeDetails[product._id].mixer || 'N/A'}</div>
                        </div>

                        <div style={detailBoxStyle}>
                          <div style={detailLabelStyle}>🔢 Total Barcodes</div>
                          <div style={detailValueStyle}>{barcodeDetails[product._id].numberOfBarcodes || 0}</div>
                        </div>

                        <div style={detailBoxStyle}>
                          <div style={detailLabelStyle}>📋 Batch Numbers</div>
                          <div style={detailValueStyle}>
                            {barcodeDetails[product._id].batchNumbers && barcodeDetails[product._id].batchNumbers.length > 0
                              ? barcodeDetails[product._id].batchNumbers.join(', ')
                              : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '40px',
                      opacity: 0.7,
                    }}>
                      <div style={{ fontSize: '1.1rem' }}>
                        ℹ️ No barcode details found for this product
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{
                    display: 'flex',
                    gap: '10px',
                    justifyContent: 'flex-end',
                  }}>
                    <button
                      className="btn btn-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(product._id);
                      }}
                      style={{
                        padding: '10px 20px',
                        fontSize: '1rem',
                      }}
                    >
                      🗑️ Delete Product
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div style={cardStyle}>
            <div style={{ textAlign: 'center', padding: '40px', opacity: 0.7 }}>
              {searchTerm
                ? `No products found matching "${searchTerm}"`
                : 'No products found'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AllProductsPage;
