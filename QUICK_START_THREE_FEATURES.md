# 🚀 Quick Start Guide - Three New Features

## ⚡ Installation (5 minutes)

### Step 1: Install Backend Dependencies
```bash
cd backend
npm install multer csv-parser
```

### Step 2: Restart Backend
```bash
npm start
```

### Step 3: Restart Frontend
```bash
cd ../frontend
npm start
```

---

## 🎯 Feature 1: Invoice Numbering (2 minutes)

### Setup:
1. Go to: `http://localhost:3000/settings`
2. Set **Invoice Format**: `INV/{FY}/{#####}`
3. Set **Next Invoice Number**: `1001` (or your starting number)
4. Click **"Save Settings"**

### Test:
1. Create a new bill
2. Invoice number will be: `INV/25-26/01001`
3. Next bill will be: `INV/25-26/01002`

✅ **Done!** Invoices now use your custom format.

---

## 💰 Feature 2: Opening Balances (5 minutes)

### Manual Entry:
1. Go to: `http://localhost:3000/opening-balances`
2. Click **"Customers"** tab
3. Click **"Set Balance"** for any customer
4. Enter:
   - Amount: `10000`
   - Type: `debit`
   - Date: `2024-04-01`
5. Check **Closing Balance** (auto-calculated)

### CSV Upload (Faster):
1. Click **"Download Sample CSV"**
2. Edit CSV with your data:
   ```csv
   name,openingBalance,balanceType,date
   Customer A,10000,debit,2024-04-01
   Customer B,5000,debit,2024-04-01
   ```
3. Click **"Choose CSV File"** → Select file
4. Click **"Upload CSV"**

✅ **Done!** All balances are set.

---

## 📊 Feature 3: GSTR-2 Reconciliation (10 minutes)

### Get GSTR-2 JSON:
1. Login to: https://www.gst.gov.in
2. Go to: **Returns → GSTR-2A/2B**
3. Select period (e.g., December 2024)
4. Click: **Download → JSON**
5. Save the file

### Upload & Match:
1. Go to: `http://localhost:3000/gstr2`
2. Click **"Upload"** tab
3. Enter **Period**: `122024` (MMYYYY format)
4. Click **"Choose JSON File"** → Select downloaded file
5. Click **"Upload & Parse"**
6. Wait for processing (shows progress)

### View Results:
1. Click **"Summary"** tab
2. See:
   - ✅ Matched invoices
   - ⚠️ Mismatched invoices
   - ❌ Missing in books
   - 💰 ITC summary
3. Click **"Entries"** tab to see details

✅ **Done!** GSTR-2 reconciliation complete.

---

## 🎨 Add to Navigation Menu

Update your navigation component (e.g., `Navbar.js`):

```jsx
<Link to="/settings">⚙️ Settings</Link>
<Link to="/opening-balances">💰 Balances</Link>
<Link to="/gstr2">📊 GSTR-2</Link>
```

---

## 🧪 Quick Test Checklist

### Invoice Numbering:
- [ ] Settings page loads
- [ ] Can set custom format
- [ ] Preview shows correctly
- [ ] New bills use custom format
- [ ] Number auto-increments

### Opening Balances:
- [ ] Page loads with customer/supplier list
- [ ] Can set opening balance manually
- [ ] CSV upload works
- [ ] Closing balance auto-calculates
- [ ] Recalculate button works

### GSTR-2:
- [ ] Upload page loads
- [ ] Can upload JSON file
- [ ] Parsing completes successfully
- [ ] Summary shows correct counts
- [ ] ITC summary displays
- [ ] Entries list shows data
- [ ] Filters work

---

## 💡 Pro Tips

### Invoice Numbering:
- Use `{FY}` for financial year compliance
- Set next number to continue from old software
- Don't change format mid-year

### Opening Balances:
- Use CSV for bulk import (much faster)
- Set at start of financial year
- Recalculate if balances look wrong

### GSTR-2:
- Upload every month
- Review mismatches immediately
- Create missing purchase bills
- Only claim matched ITC

---

## ⚠️ Common Issues

### "Settings not found"
**Fix:** Just refresh page, settings auto-create

### "Customer not found" 
**Fix:** Create customer first in billing section

### "File upload error"
**Fix:** Run `npm install multer csv-parser` in backend

### "Matching failed"
**Fix:** Ensure you have purchase bills in system

---

## 📞 Need Help?

Check the detailed documentation: `THREE_FEATURES_COMPLETE.md`

---

**Total Setup Time:** ~15 minutes
**Status:** ✅ Ready to use
**Date:** December 6, 2025

---

*You're all set! Start using the new features now.* 🎉
