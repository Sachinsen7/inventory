import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SettingsPage.css';

function SettingsPage() {
    const [settings, setSettings] = useState({
        invoiceFormat: 'INV/{YY}-{MM}/{####}',
        nextInvoiceNumber: 1,
        invoicePrefix: 'INV',
        financialYearStart: '04-01',
        companyName: '',
        companyGSTIN: '',
        companyAddress: '',
        companyPhone: '',
        companyEmail: ''
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [previewInvoice, setPreviewInvoice] = useState('');

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    useEffect(() => {
        fetchSettings();
    }, []);

    useEffect(() => {
        generatePreview();
    }, [settings.invoiceFormat, settings.nextInvoiceNumber]);

    const fetchSettings = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/settings`);
            setSettings(response.data);
        } catch (error) {
            console.error('Error fetching settings:', error);
            setMessage('Error loading settings');
        }
    };

    const generatePreview = () => {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const fullYear = now.getFullYear().toString();

        const fyMonth = parseInt(settings.financialYearStart.split('-')[0]);
        let fyStartYear, fyEndYear;

        if (now.getMonth() + 1 >= fyMonth) {
            fyStartYear = now.getFullYear();
            fyEndYear = now.getFullYear() + 1;
        } else {
            fyStartYear = now.getFullYear() - 1;
            fyEndYear = now.getFullYear();
        }

        const preview = settings.invoiceFormat
            .replace('{YY}', year)
            .replace('{YYYY}', fullYear)
            .replace('{MM}', month)
            .replace('{FY}', `${fyStartYear.toString().slice(-2)}-${fyEndYear.toString().slice(-2)}`)
            .replace('{####}', String(settings.nextInvoiceNumber).padStart(4, '0'))
            .replace('{#####}', String(settings.nextInvoiceNumber).padStart(5, '0'))
            .replace('{######}', String(settings.nextInvoiceNumber).padStart(6, '0'));

        setPreviewInvoice(preview);
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            await axios.put(`${backendUrl}/api/settings`, settings);
            setMessage('✅ Settings saved successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error saving settings:', error);
            setMessage('❌ Error saving settings');
        } finally {
            setLoading(false);
        }
    };

    const handleResetCounter = async () => {
        if (!window.confirm('Are you sure you want to reset the invoice counter? This cannot be undone.')) {
            return;
        }

        try {
            setLoading(true);
            await axios.post(`${backendUrl}/api/settings/reset-invoice-counter`, {
                nextInvoiceNumber: settings.nextInvoiceNumber
            });
            setMessage('✅ Invoice counter reset successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error resetting counter:', error);
            setMessage('❌ Error resetting counter');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="settings-page">
            <div className="settings-header">
                <h1>⚙️ System Settings</h1>
                <p>Configure invoice numbering and company details</p>
            </div>

            {message && (
                <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
                    {message}
                </div>
            )}

            <div className="settings-container">
                {/* Invoice Numbering Settings */}
                <div className="settings-card">
                    <h2>📄 Invoice Numbering</h2>

                    <div className="form-group">
                        <label>Invoice Format *</label>
                        <input
                            type="text"
                            value={settings.invoiceFormat}
                            onChange={(e) => setSettings({ ...settings, invoiceFormat: e.target.value })}
                            placeholder="INV/{YY}-{MM}/{####}"
                        />
                        <small>
                            Available placeholders: {'{YY}'} (year), {'{YYYY}'} (full year), {'{MM}'} (month),
                            {'{FY}'} (financial year), {'{####}'} (4-digit number), {'{#####}'} (5-digit), {'{######}'} (6-digit)
                        </small>
                    </div>

                    <div className="form-group">
                        <label>Next Invoice Number *</label>
                        <input
                            type="number"
                            value={settings.nextInvoiceNumber}
                            onChange={(e) => setSettings({ ...settings, nextInvoiceNumber: parseInt(e.target.value) || 1 })}
                            min="1"
                        />
                        <small>This number will be used for the next invoice and auto-incremented</small>
                    </div>

                    <div className="form-group">
                        <label>Financial Year Start</label>
                        <input
                            type="text"
                            value={settings.financialYearStart}
                            onChange={(e) => setSettings({ ...settings, financialYearStart: e.target.value })}
                            placeholder="04-01"
                        />
                        <small>Format: MM-DD (e.g., 04-01 for April 1st)</small>
                    </div>

                    <div className="preview-box">
                        <h3>Preview:</h3>
                        <div className="preview-invoice">{previewInvoice}</div>
                        <p>Next invoice will be: <strong>{previewInvoice}</strong></p>
                    </div>

                    <button className="btn-warning" onClick={handleResetCounter}>
                        🔄 Reset Invoice Counter
                    </button>
                </div>

                {/* Company Settings */}
                <div className="settings-card">
                    <h2>🏢 Company Details</h2>

                    <div className="form-group">
                        <label>Company Name</label>
                        <input
                            type="text"
                            value={settings.companyName}
                            onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                            placeholder="Your Company Name"
                        />
                    </div>

                    <div className="form-group">
                        <label>Company GSTIN</label>
                        <input
                            type="text"
                            value={settings.companyGSTIN}
                            onChange={(e) => setSettings({ ...settings, companyGSTIN: e.target.value })}
                            placeholder="27XXXXX1234X1Z5"
                        />
                    </div>

                    <div className="form-group">
                        <label>Company Address</label>
                        <textarea
                            value={settings.companyAddress}
                            onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                            placeholder="Full company address"
                            rows="3"
                        />
                    </div>

                    <div className="form-group">
                        <label>Phone Number</label>
                        <input
                            type="text"
                            value={settings.companyPhone}
                            onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                            placeholder="+91 1234567890"
                        />
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={settings.companyEmail}
                            onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                            placeholder="company@example.com"
                        />
                    </div>
                </div>
            </div>

            <div className="settings-actions">
                <button
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={loading}
                >
                    {loading ? '⏳ Saving...' : '💾 Save Settings'}
                </button>
            </div>
        </div>
    );
}

export default SettingsPage;
