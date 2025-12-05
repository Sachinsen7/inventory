import React, { useState } from 'react';
import axios from 'axios';
import { showToast } from '../utils/toastNotifications';
import './EWayBillGenerator.css';

function EWayBillGenerator({ bill, onClose, onSuccess }) {
    const [step, setStep] = useState(1);
    const [transporterName, setTransporterName] = useState('');
    const [transporterId, setTransporterId] = useState('');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [transportMode, setTransportMode] = useState('Road');
    const [distance, setDistance] = useState('');
    const [loading, setLoading] = useState(false);

    // JSON editor state
    const [jsonData, setJsonData] = useState(null);
    const [jsonString, setJsonString] = useState('');
    const [jsonError, setJsonError] = useState('');

    // E-Way Bill details (after manual upload to portal)
    const [eWayBillNo, setEWayBillNo] = useState('');
    const [eWayBillDate, setEWayBillDate] = useState('');
    const [validUpto, setValidUpto] = useState('');

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    const validateVehicleNumber = (value) => {
        // Format: XX00XX0000
        const regex = /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/;
        return regex.test(value.toUpperCase().replace(/\s/g, ''));
    };

    const handleGenerateJSON = async () => {
        // Validation
        if (!transporterName) {
            showToast.error('Please enter transporter name');
            return;
        }

        if (!vehicleNumber) {
            showToast.error('Please enter vehicle number');
            return;
        }

        if (!validateVehicleNumber(vehicleNumber)) {
            showToast.error('Invalid vehicle number format. Use: MH12AB1234');
            return;
        }

        if (!distance || distance <= 0) {
            showToast.error('Please enter valid distance');
            return;
        }

        try {
            setLoading(true);

            const response = await axios.post(
                `${backendUrl}/api/bills/${bill._id}/generate-eway-json`,
                {
                    transporterName,
                    transporterId,
                    vehicleNumber: vehicleNumber.toUpperCase().replace(/\s/g, ''),
                    transportMode,
                    distance: parseInt(distance)
                }
            );

            // Store JSON data for editing
            setJsonData(response.data);
            setJsonString(JSON.stringify(response.data, null, 2));
            setJsonError('');
            setStep(1.5); // Go to JSON editor

            showToast.success('JSON generated! You can now edit it before downloading.');

        } catch (error) {
            console.error('Error generating E-Way Bill JSON:', error);
            showToast.error('Failed to generate E-Way Bill JSON');
        } finally {
            setLoading(false);
        }
    };

    const handleJsonChange = (value) => {
        setJsonString(value);
        try {
            const parsed = JSON.parse(value);
            setJsonData(parsed);
            setJsonError('');
        } catch (error) {
            setJsonError('Invalid JSON: ' + error.message);
        }
    };

    const handleDownloadJSON = () => {
        console.log('=== Download JSON Started ===');
        console.log('jsonError:', jsonError);
        console.log('jsonData exists:', !!jsonData);

        if (jsonError) {
            console.log('Blocked: JSON has errors');
            showToast.error('Please fix JSON errors before downloading');
            return;
        }

        if (!jsonData) {
            console.log('Blocked: No JSON data');
            showToast.error('No JSON data available');
            return;
        }

        try {
            console.log('Creating JSON string...');
            const dataStr = JSON.stringify(jsonData, null, 2);
            console.log('JSON string length:', dataStr.length);

            console.log('Creating blob...');
            const blob = new Blob([dataStr], { type: 'application/json' });
            console.log('Blob size:', blob.size);

            console.log('Creating download URL...');
            const url = URL.createObjectURL(blob);

            console.log('Creating link element...');
            const link = document.createElement('a');
            const filename = `eway-bill-${bill.invoiceNumber.replace(/\//g, '-')}.json`;

            link.href = url;
            link.download = filename;
            link.style.visibility = 'hidden';

            console.log('Appending link to body...');
            document.body.appendChild(link);

            console.log('Clicking link...');
            link.click();

            console.log('Cleaning up...');
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                console.log('=== Download Complete ===');
            }, 200);

            showToast.success('JSON downloaded! Check your Downloads folder.');

            setTimeout(() => {
                setStep(2);
            }, 1000);

        } catch (error) {
            console.error('=== Download Error ===', error);
            showToast.error('Download failed: ' + error.message);
        }
    };

    const handleUploadDetails = async () => {
        if (!eWayBillNo) {
            showToast.error('Please enter E-Way Bill number');
            return;
        }

        if (!eWayBillDate) {
            showToast.error('Please enter E-Way Bill date');
            return;
        }

        if (!validUpto) {
            showToast.error('Please enter validity date');
            return;
        }

        try {
            setLoading(true);

            await axios.put(`${backendUrl}/api/bills/${bill._id}/eway-bill`, {
                eWayBillNo,
                eWayBillDate,
                validUpto,
                status: 'Active'
            });

            showToast.success('E-Way Bill details saved successfully!');
            if (onSuccess) onSuccess();
            onClose();

        } catch (error) {
            console.error('Error saving E-Way Bill details:', error);
            showToast.error('Failed to save E-Way Bill details');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="eway-modal-overlay" onClick={onClose}>
            <div className="eway-modal-content" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="eway-header">
                    <h2>🚛 E-Way Bill Generator</h2>
                    <button onClick={onClose} className="btn-close-x">✕</button>
                </div>

                {/* Progress Steps */}
                <div className="eway-steps">
                    <div className={`step ${step >= 1 ? 'active' : ''}`}>
                        <div className="step-number">1</div>
                        <div className="step-label">Transport Details</div>
                    </div>
                    <div className="step-line"></div>
                    <div className={`step ${step >= 1.5 ? 'active' : ''}`}>
                        <div className="step-number">📝</div>
                        <div className="step-label">Edit JSON</div>
                    </div>
                    <div className="step-line"></div>
                    <div className={`step ${step >= 2 ? 'active' : ''}`}>
                        <div className="step-number">2</div>
                        <div className="step-label">Upload to Portal</div>
                    </div>
                    <div className="step-line"></div>
                    <div className={`step ${step >= 3 ? 'active' : ''}`}>
                        <div className="step-number">3</div>
                        <div className="step-label">Enter E-Way Bill No</div>
                    </div>
                </div>

                {/* Invoice Info */}
                <div className="eway-invoice-info">
                    <h3>Invoice Details</h3>
                    <div className="info-grid">
                        <div><strong>Invoice No:</strong> {bill.invoiceNumber}</div>
                        <div><strong>Date:</strong> {new Date(bill.invoiceDate || bill.createdAt).toLocaleDateString()}</div>
                        <div><strong>Customer:</strong> {bill.customerName}</div>
                        <div><strong>Amount:</strong> ₹{bill.totalAmount?.toLocaleString()}</div>
                    </div>
                </div>

                {/* Step 1: Transport Details */}
                {step === 1 && (
                    <div className="eway-form">
                        <h3>Step 1: Enter Transport Details</h3>

                        <div className="form-group">
                            <label>Transporter Name *</label>
                            <input
                                type="text"
                                value={transporterName}
                                onChange={(e) => setTransporterName(e.target.value)}
                                placeholder="Enter transporter name"
                            />
                        </div>

                        <div className="form-group">
                            <label>Transporter ID (Optional)</label>
                            <input
                                type="text"
                                value={transporterId}
                                onChange={(e) => setTransporterId(e.target.value)}
                                placeholder="Enter transporter GSTIN (if applicable)"
                            />
                        </div>

                        <div className="form-group">
                            <label>Vehicle Number *</label>
                            <input
                                type="text"
                                value={vehicleNumber}
                                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                                placeholder="MH12AB1234"
                                maxLength="13"
                            />
                            <small>Format: XX00XX0000 (e.g., MH12AB1234)</small>
                        </div>

                        <div className="form-group">
                            <label>Transport Mode *</label>
                            <select value={transportMode} onChange={(e) => setTransportMode(e.target.value)}>
                                <option value="Road">Road</option>
                                <option value="Rail">Rail</option>
                                <option value="Air">Air</option>
                                <option value="Ship">Ship</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Approximate Distance (KM) *</label>
                            <input
                                type="number"
                                value={distance}
                                onChange={(e) => setDistance(e.target.value)}
                                placeholder="Enter distance in kilometers"
                                min="1"
                            />
                        </div>

                        <div className="eway-actions">
                            <button className="btn-secondary" onClick={onClose}>Cancel</button>
                            <button
                                className="btn-primary"
                                onClick={handleGenerateJSON}
                                disabled={loading}
                            >
                                {loading ? 'Generating...' : '� Generate &  Edit JSON'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 1.5: JSON Editor */}
                {step === 1.5 && (
                    <div className="eway-form json-editor-container">
                        <h3>Step 1.5: Edit JSON Data</h3>

                        <div className="json-editor-info">
                            <p>✏️ Edit the JSON below to customize any field. Changes are validated in real-time.</p>
                            {jsonError && (
                                <div className="json-error-message">
                                    ❌ {jsonError}
                                </div>
                            )}
                        </div>

                        <textarea
                            className={`json-textarea ${jsonError ? 'has-error' : ''}`}
                            value={jsonString}
                            onChange={(e) => handleJsonChange(e.target.value)}
                            rows={20}
                            placeholder="JSON data will appear here..."
                        />

                        <div className="json-tips">
                            <h4>💡 Quick Edit Tips:</h4>
                            <ul>
                                <li><strong>Company:</strong> Edit "fromTrdName", "fromAddr1", "fromGstin"</li>
                                <li><strong>Customer:</strong> Edit "toTrdName", "toAddr1", "toGstin"</li>
                                <li><strong>Items:</strong> Change "productName", "hsnCode", "quantity"</li>
                                <li><strong>Transport:</strong> Modify "transporterName", "vehicleNo", "transDistance"</li>
                                <li><strong>Values:</strong> Update "totalValue", "cgstValue", "sgstValue", "igstValue"</li>
                            </ul>
                        </div>

                        <div className="eway-actions">
                            <button className="btn-secondary" onClick={() => setStep(1)}>
                                ← Back to Transport Details
                            </button>
                            <button
                                className="btn-secondary"
                                onClick={() => {
                                    if (!jsonError && jsonData) {
                                        navigator.clipboard.writeText(jsonString);
                                        showToast.success('JSON copied to clipboard!');
                                    }
                                }}
                                disabled={!!jsonError}
                                title="Copy JSON to clipboard"
                            >
                                📋 Copy JSON
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleDownloadJSON}
                                disabled={!!jsonError}
                            >
                                📥 Download JSON
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Upload Instructions */}
                {step === 2 && (
                    <div className="eway-instructions">
                        <h3>Step 2: Upload JSON to Government Portal</h3>

                        <div className="instruction-box">
                            <h4>📋 Instructions:</h4>
                            <ol>
                                <li>Go to <a href="https://ewaybillgst.gov.in" target="_blank" rel="noopener noreferrer">ewaybillgst.gov.in</a></li>
                                <li>Login with your credentials</li>
                                <li>Navigate to: <strong>Generate → Bulk → Generate New</strong></li>
                                <li>Upload the downloaded JSON file</li>
                                <li>Submit and generate E-Way Bill</li>
                                <li>Download the E-Way Bill PDF from portal</li>
                                <li>Note down the E-Way Bill number</li>
                            </ol>
                        </div>

                        <div className="eway-actions">
                            <button className="btn-secondary" onClick={() => setStep(1.5)}>← Back to JSON Editor</button>
                            <button className="btn-primary" onClick={() => setStep(3)}>
                                I've Uploaded → Enter E-Way Bill No
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Enter E-Way Bill Details */}
                {step === 3 && (
                    <div className="eway-form">
                        <h3>Step 3: Enter E-Way Bill Details</h3>

                        <div className="form-group">
                            <label>E-Way Bill Number *</label>
                            <input
                                type="text"
                                value={eWayBillNo}
                                onChange={(e) => setEWayBillNo(e.target.value)}
                                placeholder="Enter 12-digit E-Way Bill number"
                                maxLength="12"
                            />
                        </div>

                        <div className="form-group">
                            <label>E-Way Bill Date *</label>
                            <input
                                type="date"
                                value={eWayBillDate}
                                onChange={(e) => setEWayBillDate(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label>Valid Upto *</label>
                            <input
                                type="date"
                                value={validUpto}
                                onChange={(e) => setValidUpto(e.target.value)}
                            />
                        </div>

                        <div className="eway-actions">
                            <button className="btn-secondary" onClick={() => setStep(2)}>← Back</button>
                            <button
                                className="btn-primary"
                                onClick={handleUploadDetails}
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : '✅ Save E-Way Bill Details'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default EWayBillGenerator;
