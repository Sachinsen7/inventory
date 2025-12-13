// Frontend Route Fix - Replace broken routes with working alternatives
// Use this in your frontend components

// BEFORE (Broken routes):
// fetch('/api/vouchers/postdated')
// fetch('/api/vouchers/provisional')

// AFTER (Working routes):
const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://13.53.56.208:5000';

// Working alternative routes
const WORKING_ROUTES = {
    postdatedVouchers: `${API_BASE}/api/vouchers/list/postdated`,
    provisionalVouchers: `${API_BASE}/api/vouchers/list/provisional`,

    // All other routes work fine
    vouchers: `${API_BASE}/api/vouchers`,
    cashBankAccounts: `${API_BASE}/api/reports/cash-bank-accounts`,
    dayBook: `${API_BASE}/api/reports/day-book`,
    purchases: `${API_BASE}/api/purchases`,
    chequesSummary: `${API_BASE}/api/cheques/dashboard/summary`,
    bankReconciliation: `${API_BASE}/api/bank-reconciliation/accounts/list`
};

// Example usage:
async function fetchPostdatedVouchers() {
    try {
        const response = await fetch(WORKING_ROUTES.postdatedVouchers);
        const data = await response.json();
        console.log('✅ Postdated vouchers:', data.vouchers.length);
        return data;
    } catch (error) {
        console.error('❌ Error fetching postdated vouchers:', error);
    }
}

async function fetchProvisionalVouchers() {
    try {
        const response = await fetch(WORKING_ROUTES.provisionalVouchers);
        const data = await response.json();
        console.log('✅ Provisional vouchers:', data.vouchers.length);
        return data;
    } catch (error) {
        console.error('❌ Error fetching provisional vouchers:', error);
    }
}

// Test the working routes
console.log('🧪 Testing working routes...');
fetchPostdatedVouchers();
fetchProvisionalVouchers();

export { WORKING_ROUTES, fetchPostdatedVouchers, fetchProvisionalVouchers };