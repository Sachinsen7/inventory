import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { showToast } from '../utils/toastNotifications';
import './CustomersList.css';

const Customer = props => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCustomer, setEditedCustomer] = useState({
    name: props.customer.name,
    address: props.customer.address,
    city: props.customer.city,
    state: props.customer.state,
    gstNo: props.customer.gstNo || '',
    phoneNumber: props.customer.phoneNumber || ''
  });

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete customer "${props.customer.name}"? This action cannot be undone.`)) {
      try {
        await axios.delete(`${backendUrl}/api/customers/${props.customer._id}`);
        showToast.success(`Customer "${props.customer.name}" deleted successfully!`);
        props.onDelete(props.customer._id);
      } catch (error) {
        console.error('Error deleting customer:', error);
        showToast.error('Failed to delete customer. Please try again.');
      }
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedCustomer({
      name: props.customer.name,
      address: props.customer.address,
      city: props.customer.city,
      state: props.customer.state,
      gstNo: props.customer.gstNo || '',
      phoneNumber: props.customer.phoneNumber || ''
    });
  };

  const handleSaveEdit = async () => {
    try {
      const response = await axios.put(`${backendUrl}/api/customers/${props.customer._id}`, editedCustomer);
      showToast.success(`Customer "${editedCustomer.name}" updated successfully!`);
      props.onUpdate(response.data);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating customer:', error);
      showToast.error('Failed to update customer. Please try again.');
    }
  };

  const cardStyle = {
    backgroundColor: 'rgba(218, 216, 224, 0.6)',
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
    backdropFilter: 'blur(10px)',
    borderRadius: '15px',
    padding: '20px',
    margin: '10px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    transition: 'all 0.3s ease',
  };

  const linkStyle = {
    color: 'white',
    textDecoration: 'none',
    fontSize: '1.4rem',
    fontWeight: 'bold',
    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)',
  };

  const textStyle = {
    margin: '8px 0',
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.9)',
  };

  const buttonStyle = {
    padding: '8px 16px',
    margin: '5px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
  };

  const editButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#4CAF50',
    color: 'white',
  };

  const deleteButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#f44336',
    color: 'white',
  };

  const saveButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#2196F3',
    color: 'white',
  };

  const cancelButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#9E9E9E',
    color: 'white',
  };

  const inputStyle = {
    width: '100%',
    padding: '8px',
    margin: '5px 0',
    borderRadius: '5px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    fontSize: '14px',
  };

  if (isEditing) {
    return (
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 15px 0', color: 'white' }}>✏️ Edit Customer</h3>
        <div>
          <label style={{ color: 'white', fontSize: '12px' }}>Name:</label>
          <input
            type="text"
            value={editedCustomer.name}
            onChange={(e) => setEditedCustomer({ ...editedCustomer, name: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ color: 'white', fontSize: '12px' }}>Address:</label>
          <input
            type="text"
            value={editedCustomer.address}
            onChange={(e) => setEditedCustomer({ ...editedCustomer, address: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ color: 'white', fontSize: '12px' }}>City:</label>
          <input
            type="text"
            value={editedCustomer.city}
            onChange={(e) => setEditedCustomer({ ...editedCustomer, city: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ color: 'white', fontSize: '12px' }}>State:</label>
          <input
            type="text"
            value={editedCustomer.state}
            onChange={(e) => setEditedCustomer({ ...editedCustomer, state: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ color: 'white', fontSize: '12px' }}>GST No:</label>
          <input
            type="text"
            value={editedCustomer.gstNo}
            onChange={(e) => setEditedCustomer({ ...editedCustomer, gstNo: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ color: 'white', fontSize: '12px' }}>Phone:</label>
          <input
            type="text"
            value={editedCustomer.phoneNumber}
            onChange={(e) => setEditedCustomer({ ...editedCustomer, phoneNumber: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div style={{ marginTop: '15px', textAlign: 'center' }}>
          <button
            onClick={handleSaveEdit}
            style={saveButtonStyle}
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            💾 Save
          </button>
          <button
            onClick={handleCancelEdit}
            style={cancelButtonStyle}
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            ❌ Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={cardStyle}
      className="customer-card-hover"
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)';
        e.currentTarget.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.3)';
        e.currentTarget.style.backgroundColor = 'rgba(218, 216, 224, 0.8)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)';
        e.currentTarget.style.backgroundColor = 'rgba(218, 216, 224, 0.6)';
      }}
    >
      <h3 style={{ margin: '0 0 15px 0' }}>
        <Link to={`/customer/${props.customer._id}`} style={linkStyle}>
          👤 {props.customer.name}
        </Link>
      </h3>
      <p style={textStyle}>📍 <strong>Address:</strong> {props.customer.address}</p>
      <p style={textStyle}>🏙️ <strong>City:</strong> {props.customer.city}</p>
      <p style={textStyle}>🗺️ <strong>State:</strong> {props.customer.state}</p>
      <p style={textStyle}>🏢 <strong>GST No:</strong> {props.customer.gstNo || 'N/A'}</p>
      <p style={textStyle}>📞 <strong>Phone:</strong> {props.customer.phoneNumber || 'N/A'}</p>

      <div style={{ marginTop: '15px', textAlign: 'center' }}>
        <button
          onClick={handleEdit}
          style={editButtonStyle}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.05)';
            e.target.style.backgroundColor = '#45a049';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.backgroundColor = '#4CAF50';
          }}
        >
          ✏️ Edit
        </button>
        <button
          onClick={handleDelete}
          style={deleteButtonStyle}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.05)';
            e.target.style.backgroundColor = '#da190b';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.backgroundColor = '#f44336';
          }}
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  );
};

function CustomersList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState([]);

  // Backend URL from environment variable
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    axios.get(`${backendUrl}/api/customers/`)
      .then(response => {
        setCustomers(response.data);
        setFilteredCustomers(response.data);
        setLoading(false);
        if (response.data.length === 0) {
          showToast.info('No customers found');
        }
      })
      .catch((error) => {
        console.log(error);
        setLoading(false);
        const errorMsg = error.response?.data?.message || error.message || 'Error fetching customers';
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          showToast.error('Connection timeout. Please check your internet connection.');
        } else if (error.response) {
          showToast.error(`Backend error: ${error.response.status} - ${errorMsg}`);
        } else if (error.request) {
          showToast.error('Unable to connect to the server. Please check if the backend is running.');
        } else {
          showToast.error(errorMsg);
        }
      })
  }, []);

  // Filter customers based on search term
  useEffect(() => {
    if (searchTerm === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.gstNo && customer.gstNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.phoneNumber && customer.phoneNumber.includes(searchTerm))
      );
      setFilteredCustomers(filtered);
    }
  }, [searchTerm, customers]);

  const handleDeleteCustomer = (customerId) => {
    setCustomers(customers.filter(c => c._id !== customerId));
    setFilteredCustomers(filteredCustomers.filter(c => c._id !== customerId));
  };

  const handleUpdateCustomer = (updatedCustomer) => {
    setCustomers(customers.map(c => c._id === updatedCustomer._id ? updatedCustomer : c));
    setFilteredCustomers(filteredCustomers.map(c => c._id === updatedCustomer._id ? updatedCustomer : c));
  };

  function customerList() {
    return filteredCustomers.map(currentcustomer => {
      return (
        <Customer
          customer={currentcustomer}
          key={currentcustomer._id}
          onDelete={handleDeleteCustomer}
          onUpdate={handleUpdateCustomer}
        />
      );
    })
  }

  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "linear-gradient(-45deg, #fcb900, #9900ef, #ff6900, #00ff07)",
    backgroundSize: "400% 400%",
    animation: "gradientAnimation 10s ease infinite",
    padding: "20px",
    color: 'white',
    fontSize: '20px',
  };

  const searchInputStyle = {
    width: '100%',
    maxWidth: '500px',
    padding: '12px 20px',
    fontSize: '16px',
    borderRadius: '25px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(218, 216, 224, 0.6)',
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
    color: 'white',
    marginBottom: '20px',
    outline: 'none',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease',
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '30px',
    fontSize: '3rem',
    fontWeight: 'bold',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
  };

  const buttonStyle = {
    backgroundColor: 'rgba(218, 216, 224, 0.6)',
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
    color: 'white',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    padding: '12px 24px',
    borderRadius: '25px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textDecoration: 'none',
    display: 'inline-block',
    marginBottom: '20px',
    backdropFilter: 'blur(10px)',
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <style>
          {`
            @keyframes gradientAnimation {
              0% { background-position: 0% 50%; }
              25% { background-position: 50% 100%; }
              50% { background-position: 100% 50%; }
              75% { background-position: 50% 0%; }
              100% { background-position: 0% 50%; }
            }
          `}
        </style>
        <h3 style={headerStyle}>Customers</h3>
        <p>Loading customers...</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <style>
        {`
          @keyframes gradientAnimation {
            0% { background-position: 0% 50%; }
            25% { background-position: 50% 100%; }
            50% { background-position: 100% 50%; }
            75% { background-position: 50% 0%; }
            100% { background-position: 0% 50%; }
          }

          .search-input::placeholder {
            color: rgba(255, 255, 255, 0.7);
          }

          .search-input:focus {
            border-color: rgba(255, 255, 255, 0.6);
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
            transform: scale(1.02);
          }

          .create-btn:hover {
            background-color: rgba(218, 216, 224, 0.8);
            transform: translateY(-3px) scale(1.05);
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
          }
        `}
      </style>

      <h3 style={headerStyle}>Customers</h3>

      <div style={{ width: '100%', maxWidth: '1200px', textAlign: 'center' }}>
        <input
          type="text"
          placeholder="🔍 Search customers by name, city, state, GST, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={searchInputStyle}
          className="search-input"
        />

        <div style={{ margin: '30px 0' }}></div>

        <Link
          to="/billing/create-customer"
          style={buttonStyle}
          className="create-btn"
        >
          ➕ Create New Customer
        </Link>

        {filteredCustomers.length === 0 ? (
          <p style={{ textAlign: 'center', marginTop: '50px', fontSize: '18px' }}>
            {searchTerm ? `No customers found matching "${searchTerm}"` : 'No customers found. Create your first customer!'}
          </p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
            marginTop: '20px'
          }}>
            {customerList()}
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomersList; 