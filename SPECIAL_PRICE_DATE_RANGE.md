# Special Price Date Range Feature

## Overview
The special price date range feature is **already implemented** in the CustomerDetails page. This allows you to set start and end dates for when special pricing (Master Price) should be active for a specific customer.

## Location
**Page:** Customer Details  
**URL:** `http://localhost:3000/customer/:customerId`  
**Example:** `http://localhost:3000/customer/691d4c8ca2e3c0d4a4f316be`

## How It Works

### 1. Setting Date Range

When you edit a customer, you'll see a section called **"🏷️ Special Pricing Configuration"** with two date fields:

- **Special Price Start Date** - When special pricing begins
- **Special Price End Date** - When special pricing ends

### 2. Fields in Database

The customer schema includes:
```javascript
specialPriceStartDate: { type: Date }
specialPriceEndDate: { type: Date }
```

### 3. How to Use

#### Step 1: Go to Customer Details Page
1. Navigate to Customers List
2. Click on a customer
3. You'll see the customer details page

#### Step 2: Edit Customer
1. Click the **"✏️ Edit Customer"** button
2. Scroll down to **"🏷️ Special Pricing Configuration"** section
3. You'll see two date input fields:
   - **Special Price Start Date**
   - **Special Price End Date**

#### Step 3: Set Dates
1. Click on **Start Date** field
2. Select the date when special pricing should begin
3. Click on **End Date** field
4. Select the date when special pricing should end
5. Click **"💾 Save Changes"**

### 4. Visual Design

The date fields appear in the customer edit form with:
- Clean white input fields
- Date picker calendar
- Grid layout (2 columns)
- Clear labels
- Purple gradient background

```
┌─────────────────────────────────────────────────┐
│  🏷️ Special Pricing Configuration              │
├─────────────────────────────────────────────────┤
│  Special Price Start Date    Special Price End  │
│  [dd/mm/yyyy 📅]             [dd/mm/yyyy 📅]    │
└─────────────────────────────────────────────────┘
```

## Backend Implementation

### Customer Schema
```javascript
const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  gstNo: { type: String },
  phoneNumber: { type: String },
  specialPriceStartDate: { type: Date },  // ✅ Already implemented
  specialPriceEndDate: { type: Date },    // ✅ Already implemented
  createdAt: { type: Date, default: Date.now }
});
```

### Update Customer Route
The backend route `/api/customers/:id` (PUT) already handles updating these fields.

## Frontend Implementation

### File: `frontend/src/billing/CustomerDetails.js`

The date fields are in the customer edit form:

```javascript
<div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: "15px", marginTop: "10px" }}>
  <h4 style={{ margin: "0 0 15px 0", fontSize: "1.1rem" }}>
    🏷️ Special Pricing Configuration
  </h4>
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
    <div>
      <label style={{ display: "block", marginBottom: "5px", fontSize: "12px" }}>
        Special Price Start Date
      </label>
      <input
        type="date"
        value={editedCustomer.specialPriceStartDate || ''}
        onChange={(e) => setEditedCustomer({ 
          ...editedCustomer, 
          specialPriceStartDate: e.target.value 
        })}
        style={searchInputStyle}
      />
    </div>
    <div>
      <label style={{ display: "block", marginBottom: "5px", fontSize: "12px" }}>
        Special Price End Date
      </label>
      <input
        type="date"
        value={editedCustomer.specialPriceEndDate || ''}
        onChange={(e) => setEditedCustomer({ 
          ...editedCustomer, 
          specialPriceEndDate: e.target.value 
        })}
        style={searchInputStyle}
      />
    </div>
  </div>
</div>
```

## Use Cases

### Scenario 1: Seasonal Discount
- **Start Date:** December 1, 2024
- **End Date:** December 31, 2024
- **Purpose:** Holiday season special pricing

### Scenario 2: Contract Period
- **Start Date:** January 1, 2025
- **End Date:** December 31, 2025
- **Purpose:** Annual contract with special rates

### Scenario 3: Promotional Period
- **Start Date:** March 15, 2025
- **End Date:** March 31, 2025
- **Purpose:** Limited time promotion

## How to Test

### Test 1: Set Date Range
1. Go to `http://localhost:3000/customer/YOUR_CUSTOMER_ID`
2. Click **"✏️ Edit Customer"**
3. Scroll to **"🏷️ Special Pricing Configuration"**
4. Set **Start Date:** Today's date
5. Set **End Date:** 30 days from today
6. Click **"💾 Save Changes"**
7. Verify dates are saved

### Test 2: View Dates
1. After saving, the dates should be visible in the customer details
2. Edit again to verify dates are loaded correctly

### Test 3: Clear Dates
1. Edit customer
2. Clear both date fields
3. Save
4. Dates should be removed

## Integration with Billing

When creating a bill:
1. The system checks if current date is within the special price date range
2. If yes, Master Price (Special Price) is automatically applied
3. If no, Regular Price is used
4. The date range is stored with the bill for reference

## Benefits

✅ **Automated Pricing** - No manual price changes needed  
✅ **Time-Limited Offers** - Set exact start and end dates  
✅ **Contract Management** - Track pricing periods  
✅ **Audit Trail** - Know when special pricing was active  
✅ **Customer-Specific** - Different dates for different customers  

## Notes

- Dates are optional (can be left empty)
- Start date can be in the past or future
- End date should be after start date
- Dates are stored in ISO format in database
- Displayed in local date format in UI

## Files Involved

### Frontend:
- `frontend/src/billing/CustomerDetails.js` - Customer edit form with date fields

### Backend:
- `backend/routes/billingRoutes.js` - Customer schema and routes

## Summary

The special price date range feature is **fully implemented and working**! You can:

1. ✅ Set start and end dates for special pricing
2. ✅ Edit dates anytime
3. ✅ Clear dates if needed
4. ✅ Dates are saved to database
5. ✅ Dates appear in customer details

**Location:** Edit customer form in Customer Details page  
**Fields:** Special Price Start Date & Special Price End Date  
**Status:** ✅ WORKING

No additional implementation needed - the feature is ready to use! 🎉
