import React, { useState, useEffect } from 'react';
import './ChequeManagement.css';

const ChequeManagement = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(false);

    // State
    const [dashboardData, setDashboardData] = useState({});
    const [chequeBooks, setChequeBooks] = useState([]);
    const [chequeRegister, setChequeRegister] = useState([]);
    const [selectedBook, setSelectedBook] = useState(null);

    // Modals
    const [showNewBookModal, setShowNewBookModal] = useState(false);
    const [showIssueChequeModal, setShowIssueChequeModal] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [selectedCheque, setSelectedCheque] = useState(null);

    // Forms
    const [newBookForm, setNewBookForm] = useState({
        bankAccount: '',
        accountNumber: '',
        bankName: '',
        branchName: '',
        ifscCode: '',
        chequeBookNumber: '',
        startingChequeNumber: '',
        endingChequeNumber: ''
    });

    const [issueChequeForm, setIssueChequeForm] = useState({
        payeeName: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        remarks: ''
    });

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    useEffect(() => {
        if (activeTab === 'dashboard') {
            loadDashboardData();
        } else if (activeTab === 'books') {
            loadChequeBooks();
        } else if (activeTab === 'register') {
            loadChequeRegister();
        }
    }, [activeTab]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${backendUrl}/api/cheques/dashboard/summary`);
            const data = await response.json();
            setDashboardData(data);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadChequeBooks = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${backendUrl}/api/cheques/books`);
            const data = await response.json();
            setChequeBooks(data.chequeBooks || []);
        } catch (error) {
            console.error('Error loading cheque books:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadChequeRegister = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${backendUrl}/api/cheques/register`);
            const data = await response.json();
            setChequeRegister(data.cheques || []);
        } catch (error) {
            console.error('Error loading cheque register:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBook = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${backendUrl}/api/cheques/books`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBookForm)
            });

            if (response.ok) {
                setShowNewBookModal(false);
                resetNewBookForm();
                loadChequeBooks();
                alert('Cheque book created successfully!');
            }
        } catch (error) {
            console.error('Error creating cheque book:', error);
            alert('Error creating cheque book');
        } finally {
            setLoading(false);
        }
    };

    const handleIssueCheque = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${backendUrl}/api/cheques/books/${selectedBook._id}/issue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(issueChequeForm)
            });

            if (response.ok) {
                const data = await response.json();
                setShowIssueChequeModal(false);
                resetIssueChequeForm();
                loadChequeBooks();
                loadChequeRegister();

                // Show print option
                setSelectedCheque(data.cheque);
                setShowPrintModal(true);
            }
        } catch (error) {
            console.error('Error issuing cheque:', error);
            alert('Error issuing cheque');
        } finally {
            setLoading(false);
        }
    };

    const handlePrintCheque = () => {
        // Generate print content
        const printContent = generateChequePrintContent(selectedCheque, selectedBook);

        // Open print window
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();

        setShowPrintModal(false);
        setSelectedCheque(null);
    };

    const generateChequePrintContent = (cheque, book) => {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Cheque Print - ${cheque.chequeNumber}</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        margin: 0; 
                        padding: 20mm;
                        font-size: 12pt;
                    }
                    .cheque {
                        width: 200mm;
                        height: 85mm;
                        border: 1px solid #000;
                        position: relative;
                        padding: 10mm;
                        box-sizing: border-box;
                    }
                    .bank-name {
                        font-size: 14pt;
                        font-weight: bold;
                        text-align: center;
                        margin-bottom: 5mm;
                    }
                    .cheque-number {
                        position: absolute;
                        top: 5mm;
                        right: 10mm;
                        font-weight: bold;
                    }
                    .date {
                        position: absolute;
                        top: 15mm;
                        right: 10mm;
                    }
                    .payee {
                        position: absolute;
                        top: 25mm;
                        left: 20mm;
                        width: 120mm;
                    }
                    .amount-words {
                        position: absolute;
                        top: 35mm;
                        left: 20mm;
                        width: 120mm;
                    }
                    .amount-figures {
                        position: absolute;
                        top: 25mm;
                        right: 10mm;
                        font-weight: bold;
                    }
                    .signature {
                        position: absolute;
                        bottom: 10mm;
                        right: 30mm;
                        border-top: 1px solid #000;
                        width: 40mm;
                        text-align: center;
                        padding-top: 2mm;
                    }
                    @media print {
                        body { margin: 0; padding: 0; }
                        .cheque { border: none; }
                    }
                </style>
            </head>
            <body>
                <div class="cheque">
                    <div class="bank-name">${book.bankName}</div>
                    <div class="cheque-number">Cheque No: ${cheque.chequeNumber}</div>
                    <div class="date">Date: ${new Date(cheque.date).toLocaleDateString('en-IN')}</div>
                    <div class="payee">Pay: ${cheque.payeeName}</div>
                    <div class="amount-figures">₹ ${cheque.amount.toLocaleString('en-IN')}</div>
                    <div class="amount-words">Rupees: ${cheque.amountInWords}</div>
                    <div class="signature">Authorized Signatory</div>
                </div>
            </body>
            </html>
        `;
    };

    const resetNewBookForm = () => {
        setNewBookForm({
            bankAccount: '',
            accountNumber: '',
            bankName: '',
            branchName: '',
            ifscCode: '',
            chequeBookNumber: '',
            startingChequeNumber: '',
            endingChequeNumber: ''
        });
    };

    const resetIssueChequeForm = () => {
        setIssueChequeForm({
            payeeName: '',
            amount: '',
            date: new Date().toISOString().split('T')[0],
            remarks: ''
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount || 0);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-IN');
    };

    const renderDashboard = () => (
        <div className="cheque-dashboard">
            <div className="dashboard-header">
                <h3>Cheque Management Dashboard</h3>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowNewBookModal(true)}
                >
                    + New Cheque Book
                </button>
            </div>

            <div className="summary-cards">
                <div className="summary-card">
                    <div className="card-icon">📚</div>
                    <div className="card-content">
                        <h4>{dashboardData.summary?.totalBooks || 0}</h4>
                        <p>Total Cheque Books</p>
                    </div>
                </div>
                <div className="summary-card">
                    <div className="card-icon">✅</div>
                    <div className="card-content">
                        <h4>{dashboardData.summary?.activeBooks || 0}</h4>
                        <p>Active Books</p>
                    </div>
                </div>
                <div className="summary-card">
                    <div className="card-icon">📝</div>
                    <div className="card-content">
                        <h4>{dashboardData.chequeStats?.find(s => s._id === 'Issued')?.count || 0}</h4>
                        <p>Cheques Issued</p>
                    </div>
                </div>
                <div className="summary-card">
                    <div className="card-icon">💰</div>
                    <div className="card-content">
                        <h4>{formatCurrency(dashboardData.chequeStats?.find(s => s._id === 'Issued')?.totalAmount || 0)}</h4>
                        <p>Total Amount</p>
                    </div>
                </div>
            </div>

            <div className="recent-cheques">
                <h4>Recent Cheques</h4>
                <div className="cheques-list">
                    {dashboardData.recentCheques?.map(cheque => (
                        <div key={cheque.chequeNumber} className="cheque-item">
                            <div className="cheque-info">
                                <h5>Cheque #{cheque.chequeNumber}</h5>
                                <p>{cheque.payeeName} - {formatCurrency(cheque.amount)}</p>
                                <small>{formatDate(cheque.date)} - {cheque.bankAccount}</small>
                            </div>
                            <div className="cheque-status">
                                <span className={`status-badge ${cheque.status.toLowerCase()}`}>
                                    {cheque.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderChequeBooks = () => (
        <div className="cheque-books-section">
            <div className="section-header">
                <h3>Cheque Books</h3>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowNewBookModal(true)}
                >
                    + New Cheque Book
                </button>
            </div>

            <div className="books-grid">
                {chequeBooks.map(book => (
                    <div key={book._id} className="book-card">
                        <div className="book-header">
                            <h4>{book.bankName}</h4>
                            <span className={`status-badge ${book.status.toLowerCase()}`}>
                                {book.status}
                            </span>
                        </div>
                        <div className="book-details">
                            <p><strong>Account:</strong> {book.accountNumber}</p>
                            <p><strong>Book No:</strong> {book.chequeBookNumber}</p>
                            <p><strong>Range:</strong> {book.startingChequeNumber} - {book.endingChequeNumber}</p>
                            <p><strong>Remaining:</strong> {book.remainingCheques} / {book.totalCheques}</p>
                        </div>
                        <div className="book-actions">
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    setSelectedBook(book);
                                    setShowIssueChequeModal(true);
                                }}
                                disabled={book.status !== 'Active' || book.remainingCheques <= 0}
                            >
                                Issue Cheque
                            </button>
                            <button className="btn btn-secondary">View Details</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="cheque-management">
            <div className="page-header">
                <h2>🏦 Cheque Management</h2>
            </div>

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    📊 Dashboard
                </button>
                <button
                    className={`tab ${activeTab === 'books' ? 'active' : ''}`}
                    onClick={() => setActiveTab('books')}
                >
                    📚 Cheque Books
                </button>
                <button
                    className={`tab ${activeTab === 'register' ? 'active' : ''}`}
                    onClick={() => setActiveTab('register')}
                >
                    📋 Cheque Register
                </button>
            </div>

            <div className="tab-content">
                {loading ? (
                    <div className="loading">Loading...</div>
                ) : (
                    <>
                        {activeTab === 'dashboard' && renderDashboard()}
                        {activeTab === 'books' && renderChequeBooks()}
                        {activeTab === 'register' && (
                            <div className="cheque-register-section">
                                <h3>Cheque Register</h3>
                                {/* Register implementation */}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* New Book Modal */}
            {showNewBookModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Create New Cheque Book</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowNewBookModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Bank Name *</label>
                                    <input
                                        type="text"
                                        value={newBookForm.bankName}
                                        onChange={(e) => setNewBookForm({
                                            ...newBookForm,
                                            bankName: e.target.value
                                        })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Branch Name *</label>
                                    <input
                                        type="text"
                                        value={newBookForm.branchName}
                                        onChange={(e) => setNewBookForm({
                                            ...newBookForm,
                                            branchName: e.target.value
                                        })}
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Account Number *</label>
                                    <input
                                        type="text"
                                        value={newBookForm.accountNumber}
                                        onChange={(e) => setNewBookForm({
                                            ...newBookForm,
                                            accountNumber: e.target.value
                                        })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>IFSC Code *</label>
                                    <input
                                        type="text"
                                        value={newBookForm.ifscCode}
                                        onChange={(e) => setNewBookForm({
                                            ...newBookForm,
                                            ifscCode: e.target.value
                                        })}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Bank Account Name *</label>
                                <input
                                    type="text"
                                    value={newBookForm.bankAccount}
                                    onChange={(e) => setNewBookForm({
                                        ...newBookForm,
                                        bankAccount: e.target.value
                                    })}
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Cheque Book Number *</label>
                                    <input
                                        type="text"
                                        value={newBookForm.chequeBookNumber}
                                        onChange={(e) => setNewBookForm({
                                            ...newBookForm,
                                            chequeBookNumber: e.target.value
                                        })}
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Starting Cheque Number *</label>
                                    <input
                                        type="text"
                                        value={newBookForm.startingChequeNumber}
                                        onChange={(e) => setNewBookForm({
                                            ...newBookForm,
                                            startingChequeNumber: e.target.value
                                        })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Ending Cheque Number *</label>
                                    <input
                                        type="text"
                                        value={newBookForm.endingChequeNumber}
                                        onChange={(e) => setNewBookForm({
                                            ...newBookForm,
                                            endingChequeNumber: e.target.value
                                        })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowNewBookModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleCreateBook}
                                disabled={loading}
                            >
                                Create Cheque Book
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Issue Cheque Modal */}
            {showIssueChequeModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Issue New Cheque</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowIssueChequeModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Payee Name *</label>
                                <input
                                    type="text"
                                    value={issueChequeForm.payeeName}
                                    onChange={(e) => setIssueChequeForm({
                                        ...issueChequeForm,
                                        payeeName: e.target.value
                                    })}
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Amount *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={issueChequeForm.amount}
                                        onChange={(e) => setIssueChequeForm({
                                            ...issueChequeForm,
                                            amount: e.target.value
                                        })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Date *</label>
                                    <input
                                        type="date"
                                        value={issueChequeForm.date}
                                        onChange={(e) => setIssueChequeForm({
                                            ...issueChequeForm,
                                            date: e.target.value
                                        })}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Remarks</label>
                                <textarea
                                    value={issueChequeForm.remarks}
                                    onChange={(e) => setIssueChequeForm({
                                        ...issueChequeForm,
                                        remarks: e.target.value
                                    })}
                                    rows="3"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowIssueChequeModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleIssueCheque}
                                disabled={!issueChequeForm.payeeName || !issueChequeForm.amount}
                            >
                                Issue Cheque
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Modal */}
            {showPrintModal && selectedCheque && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Print Cheque</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowPrintModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>Cheque #{selectedCheque.chequeNumber} has been issued successfully.</p>
                            <p><strong>Payee:</strong> {selectedCheque.payeeName}</p>
                            <p><strong>Amount:</strong> {formatCurrency(selectedCheque.amount)}</p>
                            <p><strong>Date:</strong> {formatDate(selectedCheque.date)}</p>
                            <p>Would you like to print the cheque now?</p>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowPrintModal(false)}
                            >
                                Skip Printing
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handlePrintCheque}
                            >
                                🖨️ Print Cheque
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChequeManagement;