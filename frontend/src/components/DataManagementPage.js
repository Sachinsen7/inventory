import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { showToast } from '../utils/toastNotifications';
import './DataManagementPage.css';

const DataManagementPage = () => {
    const navigate = useNavigate();
    const [collectionCounts, setCollectionCounts] = useState({});
    const [loading, setLoading] = useState(true);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    const collections = [
        {
            id: 'barcodes',
            name: 'Barcodes',
            icon: '🏷️',
            description: 'All generated barcodes',
            viewLink: '/barcode-management'
        },
        {
            id: 'despatch',
            name: 'Despatch',
            icon: '📦',
            description: 'Items in godown storage',
            viewLink: '/data-management/despatch'
        },
        {
            id: 'delevery1',
            name: 'Delivery',
            icon: '🚚',
            description: 'Items ready for delivery',
            viewLink: '/data-management/delivery'
        },
        {
            id: 'select',
            name: 'Select',
            icon: '✅',
            description: 'Selected items',
            viewLink: '/data-management/select'
        },
        {
            id: 'transit',
            name: 'Transit',
            icon: '🚛',
            description: 'Items in transit',
            viewLink: '/data-management/transit'
        },
        {
            id: 'sales',
            name: 'Sales',
            icon: '💰',
            description: 'Sales records',
            viewLink: '/data-management/sales'
        }
    ];

    useEffect(() => {
        fetchCollectionCounts();
    }, []);

    const fetchCollectionCounts = async () => {
        try {
            setLoading(true);
            const counts = {};

            // Fetch counts for each collection
            try {
                const barcodesRes = await axios.get(`${backendUrl}/api/barcodes`);
                counts.barcodes = barcodesRes.data.length;
            } catch (e) { counts.barcodes = 0; }

            try {
                const despatchRes = await axios.get(`${backendUrl}/api/despatch`);
                counts.despatch = despatchRes.data.length;
            } catch (e) { counts.despatch = 0; }

            try {
                const deliveryRes = await axios.get(`${backendUrl}/api/products3`);
                counts.delevery1 = deliveryRes.data.length;
            } catch (e) { counts.delevery1 = 0; }

            try {
                const selectRes = await axios.get(`${backendUrl}/api/products2`);
                counts.select = selectRes.data.length;
            } catch (e) { counts.select = 0; }

            try {
                const transitRes = await axios.get(`${backendUrl}/api/transits`);
                counts.transit = transitRes.data.length;
            } catch (e) { counts.transit = 0; }

            try {
                const salesRes = await axios.get(`${backendUrl}/api/sales`);
                counts.sales = salesRes.data.length;
            } catch (e) { counts.sales = 0; }

            setCollectionCounts(counts);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching counts:', error);
            setLoading(false);
        }
    };

    const handleClearFactoryInventory = async () => {
        if (!window.confirm('⚠️ WARNING: This will delete ALL factory inventory items!\n\nAre you absolutely sure?')) {
            return;
        }

        try {
            const response = await axios.delete(`${backendUrl}/api/factory-inventory/clear-all`);
            alert(`✅ Success: ${response.data.message}\nDeleted ${response.data.deletedCount} items`);
            fetchCollectionCounts();
        } catch (error) {
            console.error('Error clearing factory inventory:', error);
            alert('❌ Error clearing factory inventory');
        }
    };

    const handleClearInTransit = async () => {
        if (!window.confirm('⚠️ WARNING: This will delete ALL in-transit items!\n\nAre you absolutely sure?')) {
            return;
        }

        try {
            const response = await axios.delete(`${backendUrl}/api/in-transit/clear-all`);
            alert(`✅ Success: ${response.data.message}\nDeleted ${response.data.deletedCount} items`);
            fetchCollectionCounts();
        } catch (error) {
            console.error('Error clearing in-transit items:', error);
            alert('❌ Error clearing in-transit items');
        }
    };

    const handleClearAllCollections = async () => {
        if (!window.confirm('🚨 EXTREME DANGER 🚨\n\nThis will DELETE ALL DATA from ALL collections!\n\nType "DELETE ALL" to confirm:')) {
            return;
        }

        const confirmation = prompt('Type "DELETE ALL" to confirm (case sensitive):');
        if (confirmation !== 'DELETE ALL') {
            alert('❌ Confirmation failed. No data was deleted.');
            return;
        }

        try {
            const response = await axios.delete(`${backendUrl}/api/inventory/clear-all-collections`);
            alert(`✅ All collections cleared!\n\nTotal deleted: ${response.data.totalDeleted} items\n\nFactory: ${response.data.details.factory}\nIn-Transit: ${response.data.details.inTransit}\nDespatch: ${response.data.details.despatch}\nTransits: ${response.data.details.transits}\nSales: ${response.data.details.sales}`);
            fetchCollectionCounts();
        } catch (error) {
            console.error('Error clearing all collections:', error);
            alert('❌ Error clearing collections');
        }
    };

    return (
        <div className="data-management-container">
            <div className="data-management-content">
                <div className="page-header">
                    <h1>🗑️ Data Management</h1>
                    <p>View and manage your inventory data</p>
                </div>

                {/* Info Banner */}
                <div className="info-banner">
                    <div className="info-icon">💡</div>
                    <div className="info-content">
                        <h3>How to Delete Items</h3>
                        <p>Click <strong>"View & Delete"</strong> to see items and delete them individually. This is the safest way!</p>
                    </div>
                </div>

                {/* Collections Section */}
                <div className="collections-section">
                    <h2>Data Collections</h2>
                    <p className="section-description">View items in each collection and delete them individually</p>

                    {loading ? (
                        <div className="loading">⏳ Loading collections...</div>
                    ) : (
                        <div className="collections-grid">
                            {collections.map(collection => (
                                <div key={collection.id} className="collection-card">
                                    <div className="collection-icon">{collection.icon}</div>
                                    <h3>{collection.name}</h3>
                                    <p>{collection.description}</p>
                                    <div className="collection-count">
                                        <span className={`count-badge ${collectionCounts[collection.id] > 0 ? 'has-items' : 'empty'}`}>
                                            {collectionCounts[collection.id] || 0} items
                                        </span>
                                    </div>
                                    <div className="collection-actions">
                                        <button
                                            className="btn-view"
                                            onClick={() => navigate(collection.viewLink)}
                                            disabled={collectionCounts[collection.id] === 0}
                                        >
                                            👁️ View & Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Danger Zone */}
                <div className="danger-zone">
                    <h3>⚠️ Danger Zone</h3>
                    <p className="danger-warning">These actions cannot be undone!</p>
                    <div className="danger-actions">
                        <button
                            className="btn-danger"
                            onClick={handleClearFactoryInventory}
                        >
                            🏭 Clear Factory Inventory ({collectionCounts.select || 0} items)
                        </button>
                        <button
                            className="btn-danger"
                            onClick={handleClearInTransit}
                        >
                            🚚 Clear In-Transit ({collectionCounts.delevery1 || 0} items)
                        </button>
                        <button
                            className="btn-danger-extreme"
                            onClick={handleClearAllCollections}
                        >
                            💣 Clear ALL Collections
                        </button>
                    </div>
                </div>

                {/* Help Section */}
                <div className="help-section">
                    <h3>📖 How to Use</h3>
                    <div className="help-steps">
                        <div className="help-step">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <h4>View Items</h4>
                                <p>Click "View & Delete" to see all items in that collection</p>
                            </div>
                        </div>
                        <div className="help-step">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <h4>Select Items</h4>
                                <p>Check boxes next to items you want to delete</p>
                            </div>
                        </div>
                        <div className="help-step">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <h4>Delete Safely</h4>
                                <p>Delete individual items or selected items only</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataManagementPage;
