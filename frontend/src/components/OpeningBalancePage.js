import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './OpeningBalancePage.css';

function OpeningBalancePage() {
    const [activeTab, setActiveTab] = useState('customers');
    const [customers, setCustomers] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [uploadFile, setUploadFile] = useState(null);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        try {
            setLoading(true);
            if (activeTab === 'customers') {
                const response = await axios.get(`${backendUrl}/api/ledger/customers`);
                setCustomers(response.data);
            } else {
                const response = await axios.get(`${backendUrl}/api/ledger/suppliers`);
                setSuppliers(response.data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setMessage('❌ Error loading data');
        } finally {
            setLoading(false);
        }
    };

    const handleSetOpeningBalance = async (id, type) => {
        const balance = prompt('Enter opening balance amount:');
        if (!balance) return;

        const balanceType = prompt('Enter balance type (debit/credit):', type === 'customer' ? 'debit' : 'credit');
        if (!balanceType) return;

        const date = prompt('Enter opening balance date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
        if (!date) return;

        try {
            setLoading(true);
            const endpoint = type === 'customer'
                ? `${backendUrl}/api/ledger/customers/${id}/opening-balance`
                : `${backendUrl}/api/ledger/suppliers/${id}/opening-balance`;

            await axios.post(endpoint, {
                openingBalance: parseFloat(balance),
                openingBalanceType: balanceType.toLowerCase(),
                openingBalanceDate: date
            });

            setMessage('✅ Opening balance set successfully!');
            setTimeout(() => setMessage(''), 3000);
            fetchData();
        } catch (error) {
            console.error('Error setting opening balance:', error);
            setMessage('❌ Error setting opening balance');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async () => {
        if (!uploadFile) {
            setMessage('❌ Please select a file');
            return;
        }

        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('type', activeTab === 'customers' ? 'customer' : 'supplier');

        try {
            setLoading(true);
            const response = await axios.post(
                `${backendUrl}/api/ledger/opening-balances/upload`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            setMessage(`✅ ${response.data.message}`);
            if (response.data.errors) {
                console.log('Errors:', response.data.errors);
            }
            setTimeout(() => setMessage(''), 5000);
            setUploadFile(null);
            fetchData();
        } catch (error) {
            console.error('Error uploading file:', error);
            setMessage('❌ Error uploading file');
        } finally {
            setLoading(false);
        }
    };

    const handleRecalculateBalances = async () => {
        if (!window.confirm('Recalculate all closing balances? This may take a moment.')) {
            return;
        }

        try {
            setLoading(true);
            const response = await axios.post(`${backendUrl}/api/ledger/recalculate-balances`);
            setMessage(`✅ ${response.data.message}`);
            setTimeout(() => setMessage(''), 3000);
            fetchData();
        } catch (error) {
            console.error('Error recalculating balances:', error);
            setMessage('❌ Error recalculating balances');
        } finally {
            setLoading(false);
        }
    };

    const downloadSampleCSV = () => {
        const csvContent = activeTab === 'customers'
            ? 'name,openingBalance,balanceType,date\nCustomer Name,10000,debit,2024-04-01\n'
            : 'name,openingBalance,balanceType,date\nSupplier Name,5000,credit,2024-04-01\n';

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `opening-balance-${activeTab}-sample.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const data = activeTab === 'customers' ? customers : suppliers;

    return (
        <div className="opening-balance-page">
            <div className="page-header">
                <h1>💰 Opening & Closing Balances</h1>
                <p>Manage opening balances for customers and suppliers</p>
            </div>

            {message && (
                <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
                    {message}
                </div>
            )}

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'customers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('customers')}
                >
                    👥 Customers
                </button>
                <button
                    className={`tab ${activeTab === 'suppliers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('suppliers')}
                >
                    🏭 Suppliers
                </button>
            </div>

            <div className="actions-bar">
                <div className="upload-section">
                    <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setUploadFile(e.target.files[0])}
                        id="csv-upload"
                        style={{ display: 'none' }}
                    />
                    <label htmlFor="csv-upload" className="btn-secondary">
                        📁 Choose CSV File
                    </label>
                    {uploadFile && <span className="file-name">{uploadFile.name}</span>}
                    <button
                        className="btn-primary"
                        onClick={handleFileUpload}
                        disabled={!uploadFile || loading}
                    >
                        📤 Upload CSV
                    </button>
                    <button className="btn-link" onClick={downloadSampleCSV}>
                        📥 Download Sample CSV
                    </button>
                </div>

                <button className="btn-warning" onClick={handleRecalculateBalances} disabled={loading}>
                    🔄 Recalculate All Balances
                </button>
            </div>

            <div className="data-table-container">
                {loading ? (
                    <div className="loading">⏳ Loading...</div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>GSTIN</th>
                                <th>Opening Balance</th>
                                <th>Type</th>
                                <th>Closing Balance</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                                        No {activeTab} found
                                    </td>
                                </tr>
                            ) : (
                                data.map((item) => (
                                    <tr key={item._id}>
                                        <td>{item.name}</td>
                                        <td>{item.gstNo || item.gstin || '-'}</td>
                                        <td className="amount">
                                            ₹{(item.openingBalance || 0).toLocaleString()}
                                        </td>
                                        <td>
                                            <span className={`badge ${item.openingBalanceType === 'debit' ? 'debit' : 'credit'}`}>
                                                {item.openingBalanceType || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="amount">
                                            ₹{(item.closingBalance || 0).toLocaleString()}
                                        </td>
                                        <td>
                                            <button
                                                className="btn-small"
                                                onClick={() => handleSetOpeningBalance(item._id, activeTab === 'customers' ? 'customer' : 'supplier')}
                                            >
                                                ✏️ Set Balance
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="info-box">
                <h3>ℹ️ How to Use:</h3>
                <ul>
                    <li><strong>Manual Entry:</strong> Click "Set Balance" button for each customer/supplier</li>
                    <li><strong>CSV Upload:</strong> Upload a CSV file with columns: name, openingBalance, balanceType, date</li>
                    <li><strong>Balance Types:</strong> Use "debit" for customers (they owe you) and "credit" for suppliers (you owe them)</li>
                    <li><strong>Closing Balance:</strong> Auto-calculated as: Opening + Invoices - Payments - Credit/Debit Notes</li>
                    <li><strong>Recalculate:</strong> Use this if balances seem incorrect after data changes</li>
                </ul>
            </div>
        </div>
    );
}

export default OpeningBalancePage;
