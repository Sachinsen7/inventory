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

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product =>
        (product.product && product.product.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.skuc && String(product.skuc).toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.skun && product.skun.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.batch && String(product.batch).toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  const toggleCard = (productId) => {
    setExpandedCard(expandedCard === productId ? null : productId);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // Changed to fetch barcodes directly as per user request
      const response = await axios.get(`${backendUrl}/api/barcodes`);
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
    // Note: The backend might not have a delete endpoint for barcodes yet, 
    // but keeping the function structure in case it's needed.
    // For now, we'll just show a message or implement if endpoint exists.
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        // Assuming there might be an endpoint, or we just remove from UI for now if API missing
        // await axios.delete(`${backendUrl}/api/barcodes/${productId}`); 
        // showToast.success('Product deleted successfully');
        // fetchProducts();
        showToast.info('Delete functionality not available for historical records');
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
                All Products (Barcode History)
              </h2>
              <p style={{ margin: '5px 0 0 0', opacity: 0.8, fontSize: '14px' }}>
                Total Records: {filteredProducts.length}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={cardStyle}>
          <input
            type="text"
            placeholder="🔍 Search by product name, SKU, or batch..."
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
              onClick={() => toggleCard(product._id)}
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
                      {product.skuc || 'N/A'}
                    </span>
                    <span style={{ fontSize: '1.2rem' }}>{product.product || 'Unknown Product'}</span>
                  </h3>
                  <p style={{
                    margin: '0',
                    opacity: 0.8,
                    fontSize: '0.95rem',
                  }}>
                    🏷️ SKU Name: {product.skun || 'N/A'}
                    {product.batch && ` • 📦 Batch: ${product.batch}`}
                    {product.currentTime && ` • 🕒 ${product.currentTime}`}
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

              {/* Expanded Details */}
              {expandedCard === product._id && (
                <div
                  style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                    paddingTop: '20px',
                    animation: 'fadeIn 0.3s ease',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
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
                        Master SKU: {product.skuc}
                      </h4>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                        <Barcode
                          value={product.skuc || '000000'}
                          width={2}
                          height={80}
                          fontSize={20}
                          background="#ffffff"
                          lineColor="#000000"
                        />
                      </div>
                    </div>

                    {/* Details Grid */}
                    <h4 style={{
                      margin: '0 0 20px 0',
                      fontSize: '1.3rem',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}>
                      <span style={{ fontSize: '1.5rem' }}>📋</span>
                      Product Details
                    </h4>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                      gap: '15px',
                      marginBottom: '20px',
                    }}>
                      <div style={detailBoxStyle}>
                        <div style={detailLabelStyle}>📦 Product Name</div>
                        <div style={detailValueStyle}>{product.product || 'N/A'}</div>
                      </div>

                      <div style={detailBoxStyle}>
                        <div style={detailLabelStyle}>🔢 SKU Code</div>
                        <div style={detailValueStyle}>{product.skuc || 'N/A'}</div>
                      </div>

                      <div style={detailBoxStyle}>
                        <div style={detailLabelStyle}>🏷️ SKU Name</div>
                        <div style={detailValueStyle}>{product.skun || 'N/A'}</div>
                      </div>

                      <div style={detailBoxStyle}>
                        <div style={detailLabelStyle}>👤 Packed By</div>
                        <div style={detailValueStyle}>{product.packed || 'N/A'}</div>
                      </div>

                      <div style={detailBoxStyle}>
                        <div style={detailLabelStyle}>📦 Batch No</div>
                        <div style={detailValueStyle}>{product.batch || 'N/A'}</div>
                      </div>

                      <div style={detailBoxStyle}>
                        <div style={detailLabelStyle}>🌓 Shift</div>
                        <div style={detailValueStyle}>{product.shift || 'N/A'}</div>
                      </div>

                      <div style={detailBoxStyle}>
                        <div style={detailLabelStyle}>📍 Location</div>
                        <div style={detailValueStyle}>{product.location || 'N/A'}</div>
                      </div>

                      <div style={detailBoxStyle}>
                        <div style={detailLabelStyle}>⏰ Packing Time</div>
                        <div style={detailValueStyle}>{product.currentTime || 'N/A'}</div>
                      </div>

                      <div style={detailBoxStyle}>
                        <div style={detailLabelStyle}>🔄 Rewinder Operator</div>
                        <div style={detailValueStyle}>{product.rewinder || 'N/A'}</div>
                      </div>

                      <div style={detailBoxStyle}>
                        <div style={detailLabelStyle}>✂️ Edge Cut Operator</div>
                        <div style={detailValueStyle}>{product.edge || 'N/A'}</div>
                      </div>

                      <div style={detailBoxStyle}>
                        <div style={detailLabelStyle}>🎯 Winder Operator</div>
                        <div style={detailValueStyle}>{product.winder || 'N/A'}</div>
                      </div>

                      <div style={detailBoxStyle}>
                        <div style={detailLabelStyle}>🔀 Mixer Operator</div>
                        <div style={detailValueStyle}>{product.mixer || 'N/A'}</div>
                      </div>

                      <div style={detailBoxStyle}>
                        <div style={detailLabelStyle}>🔢 Total Barcodes</div>
                        <div style={detailValueStyle}>{product.numberOfBarcodes || 0}</div>
                      </div>

                      <div style={detailBoxStyle}>
                        <div style={detailLabelStyle}>📋 Batch Numbers</div>
                        <div style={detailValueStyle}>
                          {product.batchNumbers && product.batchNumbers.length > 0
                            ? product.batchNumbers.join(', ')
                            : 'N/A'}
                        </div>
                      </div>
                    </div>

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
                        🗑️ Delete Record
                      </button>
                    </div>
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
