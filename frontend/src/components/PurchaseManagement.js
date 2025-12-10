import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { showToast } from '../utils/toastNotifications';
import './PurchaseManagement.css';

function PurchaseManagement() {
    const [view, setView] = useState('list'); // 'list' or 'add'
    const [purchases, setPurchases] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Form states
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [items, setItems] = useState([{ itemName: '', quantity: 0, price: 0, total: 0 }]);
    const [notes, setNotes] = useState('');

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    useEffect(() => {
        fetchPurchases();
        fetchSuppliers();
    }, []);

    const fetchPurchases = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${backendUrl}/api/purchases`);
            setPurchases(response.data);
        } catch (error) {
            console.error('Error fetching purchases:', error);
            showToast.error('Failed to load purchases');
        } finally {
            setLoading(false);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/purchases/suppliers/all`);
            setSuppliers(response.data);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        }
    };

    const addItem = () => {
        setItems([...items, { itemName: '', quantity: 0, price: 0, total: 0 }]);
    };

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;

        if (field === 'quantity' || field === 'price') {
            newItems[index].total = newItems[index].quantity * newItems[index].price;
        }

        setItems(newItems);
    };

    const removeItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + item.total, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedSupplier) {
            showToast.error('Please select a supplier');
            return;
        }

        if (items.length === 0 || items.every(item => !item.itemName)) {
            showToast.error('Please add at least one item');
            return;
        }

        try {
            await axios.post(`${backendUrl}/api/purchases/add`, {
                supplierId: selectedSupplier,
                purchaseDate,
                invoiceNumber,
                items: items.filter(item => item.itemName),
                totalAmount: calculateTotal(),
                notes
            });

            showToast.success('Purchase recorded successfully!');

            // Reset form
            setSelectedSupplier('');
            setItems([{ itemName: '', quantity: 0, price: 0, total: 0 }]);
            setInvoiceNumber('');
            setNotes('');
            setView('list');
            fetchPurchases();
        } catch (error) {
            console.error('Error recording purchase:', error);
            showToast.error('Error recording purchase');
        }
    };

    return (
        <div className="purchase-management">
            <div className="header">
                <h2>📦 Purchase Management</h2>
                <button
                    className="btn-toggle-view"
                    onClick={() => setView(view === 'list' ? 'add' : 'list')}
                >
                    {view === 'list' ? '+ New Purchase' : '← Back to List'}
                </button>
            </div>

            {view === 'list' ? (
                <div className="purchase-list">
                    <div className="summary-card">
                        <h3>Total Purchases</h3>
                        <p className="amount">₹{purchases.reduce((sum, p) => sum + p.totalAmount, 0).toLocaleString()}</p>
                        <p className="count">{purchases.length} purchases</p>
                    </div>

                    {loading ? (
                        <p>Loading...</p>
                    ) : (
                        <table className="purchases-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Invoice #</th>
                                    <th>Supplier</th>
                                    <th>Items</th>
                                    <th>Total Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchases.map(purchase => (
                                    <tr key={purchase._id}>
                                        <td>{new Date(purchase.purchaseDate).toLocaleDateString()}</td>
                                        <td>{purchase.invoiceNumber}</td>
                                        <td>{purchase.supplierName}</td>
                                        <td>{purchase.items?.length || 0} items</td>
                                        <td>₹{purchase.totalAmount.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="purchase-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label>Supplier *</label>
                            <select
                                value={selectedSupplier}
                                onChange={(e) => setSelectedSupplier(e.target.value)}
                                required
                            >
                                <option value="">Select Supplier...</option>
                                {suppliers.map(supplier => (
                                    <option key={supplier._id} value={supplier._id}>
                                        {supplier.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Purchase Date *</label>
                            <input
                                type="date"
                                value={purchaseDate}
                                onChange={(e) => setPurchaseDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Invoice Number *</label>
                            <input
                                type="text"
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                placeholder="Supplier invoice number"
                                required
                            />
                        </div>
                    </div>

                    <div className="items-section">
                        <div className="items-header">
                            <h3>Items</h3>
                            <button type="button" onClick={addItem} className="btn-add-item">
                                + Add Item
                            </button>
                        </div>

                        <table className="items-table">
                            <thead>
                                <tr>
                                    <th>Item Name</th>
                                    <th>Quantity</th>
                                    <th>Price</th>
                                    <th>Total</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={index}>
                                        <td>
                                            <input
                                                type="text"
                                                value={item.itemName}
                                                onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                                                placeholder="Item name"
                                                required
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                min="0"
                                                required
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                value={item.price}
                                                onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                                                min="0"
                                                step="0.01"
                                                required
                                            />
                                        </td>
                                        <td>₹{item.total.toFixed(2)}</td>
                                        <td>
                                            {items.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(index)}
                                                    className="btn-remove"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan="3"><strong>Total</strong></td>
                                    <td><strong>₹{calculateTotal().toFixed(2)}</strong></td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div className="form-group">
                        <label>Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Additional notes..."
                            rows="3"
                        />
                    </div>

                    <button type="submit" className="btn-submit">
                        💾 Record Purchase
                    </button>
                </form>
            )}
        </div>
    );
}

export default PurchaseManagement;
