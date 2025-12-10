import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { showToast } from '../utils/toastNotifications';
import './BarcodeManagementPage.css';

const BarcodeManagementPage = () => {
    const [barcodes, setBarcodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBarcodes, setSelectedBarcodes] = useState(new Set());
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [barcodeToDelete, setBarcodeToDelete] = useState(null);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    useEffect(() => {
        fetchBarcodes();
    }, []);

    const fetchBarcodes = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${backendUrl}/api/barcodes`);
            setBarcodes(response.data);
            showToast.success(`Loaded ${response.data.length} barcodes`);
        } catch (error) {
            console.error('Error fetching barcodes:', error);
            showToast.error('Failed to load barcodes');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSingle = (barcode) => {
        setBarcodeToDelete(barcode);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        try {
            await axios.delete(`${backendUrl}/api/barcodes/${barcodeToDelete._id}`);
            showToast.success(`✅ Barcode deleted: ${barcodeToDelete.skuc}`);
            setBarcodes(barcodes.filter(b => b._id !== barcodeToDelete._id));
            setShowDeleteModal(false);
            setBarcodeToDelete(null);
        } catch (error) {
            console.error('Error deleting barcode:', error);
            showToast.error('Failed to delete barcode');
        }
    };

    const handleSelectBarcode = (barcodeId) => {
        const newSelected = new Set(selectedBarcodes);
        if (newSelected.has(barcodeId)) {
            newSelected.delete(barcodeId);
        } else {
            newSelected.add(barcodeId);
        }
        setSelectedBarcodes(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedBarcodes.size === filteredBarcodes.length) {
            setSelectedBarcodes(new Set());
        } else {
            setSelectedBarcodes(new Set(filteredBarcodes.map(b => b._id)));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedBarcodes.size === 0) {
            showToast.warning('No barcodes selected');
            return;
        }

        if (!window.confirm(`Delete ${selectedBarcodes.size} selected barcodes?`)) {
            return;
        }

        try {
            const deletePromises = Array.from(selectedBarcodes).map(id =>
                axios.delete(`${backendUrl}/api/barcodes/${id}`)
            );

            await Promise.all(deletePromises);

            showToast.success(`✅ Deleted ${selectedBarcodes.size} barcodes`);
            setBarcodes(barcodes.filter(b => !selectedBarcodes.has(b._id)));
            setSelectedBarcodes(new Set());
        } catch (error) {
            console.error('Error deleting barcodes:', error);
            showToast.error('Failed to delete some barcodes');
        }
    };

    const filteredBarcodes = barcodes.filter(barcode => {
        const searchLower = searchTerm.toLowerCase();
        return (
            barcode.product?.toLowerCase().includes(searchLower) ||
            barcode.skuc?.toLowerCase().includes(searchLower) ||
            barcode.skun?.toLowerCase().includes(searchLower) ||
            barcode.batch?.toLowerCase().includes(searchLower)
        );
    });

    return (
        <div className="barcode-management-container">
            <div className="barcode-management-content">
                <div className="page-header">
                    <h1>🏷️ Barcode Management</h1>
                    <p>View and delete individual barcodes</p>
                </div>

                {/* Search and Actions */}
                <div className="controls-section">
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="🔍 Search by product, SKU, or batch..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="action-buttons">
                        <button
                            className="btn-secondary"
                            onClick={handleSelectAll}
                            disabled={filteredBarcodes.length === 0}
                        >
                            {selectedBarcodes.size === filteredBarcodes.length ? '☐ Deselect All' : '☑ Select All'}
                        </button>
                        {selectedBarcodes.size > 0 && (
                            <button
                                className="btn-danger"
                                onClick={handleDeleteSelected}
                            >
                                🗑️ Delete Selected ({selectedBarcodes.size})
                            </button>
                        )}
                        <button
                            className="btn-primary"
                            onClick={fetchBarcodes}
                        >
                            🔄 Refresh
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="stats-bar">
                    <div className="stat">
                        <span className="stat-label">Total:</span>
                        <span className="stat-value">{barcodes.length}</span>
                    </div>
                    <div className="stat">
                        <span className="stat-label">Filtered:</span>
                        <span className="stat-value">{filteredBarcodes.length}</span>
                    </div>
                    <div className="stat">
                        <span className="stat-label">Selected:</span>
                        <span className="stat-value">{selectedBarcodes.size}</span>
                    </div>
                </div>

                {/* Barcodes List */}
                {loading ? (
                    <div className="loading">⏳ Loading barcodes...</div>
                ) : filteredBarcodes.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📭</div>
                        <h3>No barcodes found</h3>
                        <p>{searchTerm ? 'Try a different search term' : 'No barcodes in the system'}</p>
                    </div>
                ) : (
                    <div className="barcodes-table-container">
                        <table className="barcodes-table">
                            <thead>
                                <tr>
                                    <th width="50">
                                        <input
                                            type="checkbox"
                                            checked={selectedBarcodes.size === filteredBarcodes.length && filteredBarcodes.length > 0}
                                            onChange={handleSelectAll}
                                        />
                                    </th>
                                    <th>Product</th>
                                    <th>SKU Code</th>
                                    <th>SKU Name</th>
                                    <th>Batch</th>
                                    <th>Barcodes</th>
                                    <th>Weight</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBarcodes.map((barcode) => (
                                    <tr key={barcode._id} className={selectedBarcodes.has(barcode._id) ? 'selected' : ''}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedBarcodes.has(barcode._id)}
                                                onChange={() => handleSelectBarcode(barcode._id)}
                                            />
                                        </td>
                                        <td><strong>{barcode.product || 'N/A'}</strong></td>
                                        <td>{barcode.skuc || 'N/A'}</td>
                                        <td>{barcode.skun || 'N/A'}</td>
                                        <td>{barcode.batch || 'N/A'}</td>
                                        <td>{barcode.numberOfBarcodes || 0}</td>
                                        <td>{barcode.grossWeight || 'N/A'}</td>
                                        <td>
                                            <button
                                                className="btn-delete-small"
                                                onClick={() => handleDeleteSingle(barcode)}
                                                title="Delete this barcode"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && barcodeToDelete && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>⚠️ Confirm Delete</h2>
                            <button className="modal-close" onClick={() => setShowDeleteModal(false)}>×</button>
                        </div>

                        <div className="modal-body">
                            <div className="modal-warning">
                                <p>Delete this barcode?</p>
                                <div className="barcode-details">
                                    <p><strong>Product:</strong> {barcodeToDelete.product}</p>
                                    <p><strong>SKU:</strong> {barcodeToDelete.skuc}</p>
                                    <p><strong>Batch:</strong> {barcodeToDelete.batch}</p>
                                </div>
                                <p className="warning-text">This action cannot be undone.</p>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn-secondary"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-danger"
                                onClick={confirmDelete}
                            >
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BarcodeManagementPage;
