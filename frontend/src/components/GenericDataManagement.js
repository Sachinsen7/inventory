import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { showToast } from '../utils/toastNotifications';
import './GenericDataManagement.css';

const GenericDataManagement = () => {
    const navigate = useNavigate();
    const { collectionType } = useParams();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    const collectionConfig = {
        despatch: {
            name: 'Despatch',
            icon: '📦',
            endpoint: '/api/despatch',
            deleteEndpoint: '/api/despatch',
            idField: '_id'
        },
        delivery: {
            name: 'Delivery',
            icon: '🚚',
            endpoint: '/api/products3',
            deleteEndpoint: '/api/products3',
            idField: '_id'
        },
        select: {
            name: 'Select',
            icon: '✅',
            endpoint: '/api/products2',
            deleteEndpoint: '/api/products2',
            idField: '_id'
        },
        transit: {
            name: 'Transit',
            icon: '🚛',
            endpoint: '/api/transits',
            deleteEndpoint: '/api/transits',
            idField: '_id'
        },
        sales: {
            name: 'Sales',
            icon: '💰',
            endpoint: '/api/sales',
            deleteEndpoint: '/api/sales',
            idField: '_id'
        }
    };

    const config = collectionConfig[collectionType];

    useEffect(() => {
        if (config) {
            fetchItems();
        }
    }, [collectionType]);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${backendUrl}${config.endpoint}`);
            setItems(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching items:', error);
            showToast.error('Failed to load items');
            setLoading(false);
        }
    };

    const handleSelectItem = (itemId) => {
        setSelectedItems(prev =>
            prev.includes(itemId)
                ? prev.filter(id => id !== itemId)
                : [...prev, itemId]
        );
    };

    const handleSelectAll = () => {
        if (selectedItems.length === filteredItems.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(filteredItems.map(item => item[config.idField]));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedItems.length === 0) {
            showToast.warning('Please select items to delete');
            return;
        }

        if (!window.confirm(`Are you sure you want to delete ${selectedItems.length} item(s)?`)) {
            return;
        }

        try {
            for (const itemId of selectedItems) {
                await axios.delete(`${backendUrl}${config.deleteEndpoint}/${itemId}`);
            }
            showToast.success(`Successfully deleted ${selectedItems.length} item(s)`);
            setSelectedItems([]);
            fetchItems();
        } catch (error) {
            console.error('Error deleting items:', error);
            showToast.error('Failed to delete some items');
        }
    };

    const handleDeleteSingle = async (itemId) => {
        if (!window.confirm('Are you sure you want to delete this item?')) {
            return;
        }

        try {
            await axios.delete(`${backendUrl}${config.deleteEndpoint}/${itemId}`);
            showToast.success('Item deleted successfully');
            fetchItems();
        } catch (error) {
            console.error('Error deleting item:', error);
            showToast.error('Failed to delete item');
        }
    };

    const filteredItems = items.filter(item => {
        const searchLower = searchTerm.toLowerCase();
        return JSON.stringify(item).toLowerCase().includes(searchLower);
    });

    if (!config) {
        return (
            <div className="generic-management-container">
                <div className="error-message">Invalid collection type</div>
            </div>
        );
    }

    return (
        <div className="generic-management-container">
            <div className="generic-management-content">
                {/* Header */}
                <div className="page-header">
                    <button className="btn-back" onClick={() => navigate('/data-management')}>
                        ← Back
                    </button>
                    <h1>{config.icon} {config.name} Management</h1>
                    <p>View and delete {config.name.toLowerCase()} items</p>
                </div>

                {/* Stats Bar */}
                <div className="stats-bar">
                    <div className="stat-item">
                        <span className="stat-label">Total Items:</span>
                        <span className="stat-value">{items.length}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Selected:</span>
                        <span className="stat-value">{selectedItems.length}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Filtered:</span>
                        <span className="stat-value">{filteredItems.length}</span>
                    </div>
                </div>

                {/* Search and Actions */}
                <div className="controls-bar">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="🔍 Search items..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="action-buttons">
                        <button
                            className="btn-select-all"
                            onClick={handleSelectAll}
                            disabled={filteredItems.length === 0}
                        >
                            {selectedItems.length === filteredItems.length && filteredItems.length > 0
                                ? '☑️ Deselect All'
                                : '☐ Select All'}
                        </button>
                        <button
                            className="btn-delete-selected"
                            onClick={handleDeleteSelected}
                            disabled={selectedItems.length === 0}
                        >
                            🗑️ Delete Selected ({selectedItems.length})
                        </button>
                    </div>
                </div>

                {/* Items List */}
                {loading ? (
                    <div className="loading">⏳ Loading items...</div>
                ) : filteredItems.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📭</div>
                        <h3>No Items Found</h3>
                        <p>{searchTerm ? 'Try a different search term' : `No ${config.name.toLowerCase()} items available`}</p>
                    </div>
                ) : (
                    <div className="items-grid">
                        {filteredItems.map((item) => (
                            <div
                                key={item[config.idField]}
                                className={`item-card ${selectedItems.includes(item[config.idField]) ? 'selected' : ''}`}
                            >
                                <div className="item-card-header">
                                    <input
                                        type="checkbox"
                                        className="item-checkbox"
                                        checked={selectedItems.includes(item[config.idField])}
                                        onChange={() => handleSelectItem(item[config.idField])}
                                    />
                                    <button
                                        className="btn-delete-card"
                                        onClick={() => handleDeleteSingle(item[config.idField])}
                                        title="Delete this item"
                                    >
                                        🗑️
                                    </button>
                                </div>
                                <div className="item-card-body">
                                    {item.inputValue && (
                                        <div className="item-field">
                                            <span className="field-label">📦 Item Code:</span>
                                            <span className="field-value">{item.inputValue}</span>
                                        </div>
                                    )}
                                    {item.barcode && (
                                        <div className="item-field">
                                            <span className="field-label">� ️ Barcode:</span>
                                            <span className="field-value">{item.barcode}</span>
                                        </div>
                                    )}
                                    {item.productName && (
                                        <div className="item-field">
                                            <span className="field-label">� Produict:</span>
                                            <span className="field-value">{item.productName}</span>
                                        </div>
                                    )}
                                    {item.customerName && (
                                        <div className="item-field">
                                            <span className="field-label">� Crustomer:</span>
                                            <span className="field-value">{item.customerName}</span>
                                        </div>
                                    )}
                                    {item.godownName && (
                                        <div className="item-field">
                                            <span className="field-label">🏢 Godown:</span>
                                            <span className="field-value">{item.godownName}</span>
                                        </div>
                                    )}
                                    {item.quantity !== undefined && (
                                        <div className="item-field">
                                            <span className="field-label">📊 Quantity:</span>
                                            <span className="field-value">{item.quantity}</span>
                                        </div>
                                    )}
                                    {item.price !== undefined && item.price !== 0 && (
                                        <div className="item-field">
                                            <span className="field-label">� APrice:</span>
                                            <span className="field-value">₹{item.price}</span>
                                        </div>
                                    )}
                                    {item.masterPrice !== undefined && item.masterPrice !== 0 && (
                                        <div className="item-field">
                                            <span className="field-label">� UMaster Price:</span>
                                            <span className="field-value">₹{item.masterPrice}</span>
                                        </div>
                                    )}
                                    {item.totalAmount !== undefined && (
                                        <div className="item-field">
                                            <span className="field-label">💵 Total Amount:</span>
                                            <span className="field-value">₹{item.totalAmount}</span>
                                        </div>
                                    )}
                                    {item.selectedOption && item.selectedOption !== 'default' && (
                                        <div className="item-field">
                                            <span className="field-label">⚙️ Option:</span>
                                            <span className="field-value">{item.selectedOption}</span>
                                        </div>
                                    )}
                                    {item.saleDate && (
                                        <div className="item-field">
                                            <span className="field-label">📅 Sale Date:</span>
                                            <span className="field-value">{new Date(item.saleDate).toLocaleString()}</span>
                                        </div>
                                    )}
                                    {item.addedAt && !item.saleDate && (
                                        <div className="item-field">
                                            <span className="field-label">📅 Added:</span>
                                            <span className="field-value">{new Date(item.addedAt).toLocaleString()}</span>
                                        </div>
                                    )}
                                    {item.lastUpdated && (
                                        <div className="item-field">
                                            <span className="field-label">🔄 Updated:</span>
                                            <span className="field-value">{new Date(item.lastUpdated).toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>

                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GenericDataManagement;
