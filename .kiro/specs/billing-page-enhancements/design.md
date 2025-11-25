# Design Document

## Overview

This design document outlines the implementation approach for enhancing the billing page with improved terminology and date range selection capabilities. The changes will be implemented in the React-based frontend billing component, maintaining the existing glassmorphism design aesthetic while adding new functionality.

## Architecture

The enhancement will be implemented within the existing `Billing.js` component in the frontend. The changes are primarily UI-focused with minimal backend impact, as the backend already supports the `masterPrice` field which will be relabeled as "Special Price" in the UI.

### Component Structure

```
Billing Component
├── Customer Selection Card
├── Price Type Selection Card (Modified)
│   ├── Regular Price Radio Button
│   └── Special Price Radio Button (renamed from Master Price)
├── Date Range Selector Card (New)
│   ├── Start Date Input
│   └── End Date Input
├── Godown Selection Card
└── ... (existing components)
```

## Components and Interfaces

### Modified Components

#### 1. Price Type Selection
- **Location**: `frontend/src/billing/Billing.js`
- **Changes**: 
  - Update radio button label from "Master Price" to "Special Price"
  - Update display text in bill summary and PDF generation
  - Maintain internal state variable name `priceType` with values `'price'` and `'masterPrice'` for backward compatibility

#### 2. Bill Display and PDF Generation
- **Location**: `frontend/src/billing/Billing.js` (within `downloadPDF` function)
- **Changes**:
  - Update PDF template to display "Special Price" instead of "Master Price"
  - Update bill summary card to show "Special Price" terminology

### New Components

#### Date Range Selector Card
- **Purpose**: Allow users to select a date range for billing operations
- **State Variables**:
  - `startDate`: Date object or null
  - `endDate`: Date object or null
- **Validation Logic**:
  - Start date cannot be in the future
  - End date cannot be before start date
  - Both dates are optional (can be null)

## Data Models

### State Management

```javascript
// Existing state (no changes)
const [priceType, setPriceType] = useState('price'); // 'price' or 'masterPrice'

// New state for date range
const [startDate, setStartDate] = useState(null);
const [endDate, setEndDate] = useState(null);
const [dateRangeError, setDateRangeError] = useState('');
```

### Date Range Data Structure

```javascript
{
  startDate: Date | null,  // Selected start date
  endDate: Date | null,    // Selected end date
  isValid: boolean         // Whether the date range is valid
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Terminology consistency
*For any* billing page render, all references to pricing tiers should use "Special Price" instead of "Master Price" in user-facing text
**Validates: Requirements 1.1, 1.3**

### Property 2: Data field compatibility
*For any* bill creation or update operation, the system should continue to use "masterPrice" as the internal data field name
**Validates: Requirements 1.4**

### Property 3: Date range validation - future dates
*For any* start date selection, if the selected date is in the future, the system should display a validation error
**Validates: Requirements 2.3**

### Property 4: Date range validation - chronological order
*For any* pair of selected dates (start date, end date), if the end date is before the start date, the system should display a validation error
**Validates: Requirements 2.4**

### Property 5: Visual consistency
*For any* new UI component added to the billing page, it should apply the same glassmorphism styling (background color, backdrop filter, border radius, shadow) as existing card components
**Validates: Requirements 3.1, 3.2, 3.3**

## Error Handling

### Date Validation Errors

1. **Future Start Date**
   - Error Message: "Start date cannot be in the future"
   - Display: Below the start date input field
   - Behavior: Prevent bill generation until corrected

2. **Invalid Date Range**
   - Error Message: "End date must be after start date"
   - Display: Below the end date input field
   - Behavior: Prevent bill generation until corrected

3. **Invalid Date Format**
   - Error Message: "Please enter a valid date"
   - Display: Below the respective input field
   - Behavior: Clear invalid input and show error

### Error Display Strategy

- Use inline error messages with red text color
- Display error icon (⚠️) next to error message
- Apply red border to invalid input fields
- Clear errors when user corrects the input

## Testing Strategy

### Unit Tests

1. **Terminology Update Tests**
   - Verify "Special Price" label is rendered in price type selection
   - Verify "Special Price" appears in bill summary
   - Verify "Special Price" appears in generated PDF
   - Verify internal state still uses "masterPrice" value

2. **Date Range Component Tests**
   - Verify date range selector renders when customer is selected
   - Verify date inputs accept valid date formats
   - Verify date range selector is positioned below price type selection

3. **Date Validation Tests**
   - Test future date rejection for start date
   - Test end date before start date rejection
   - Test valid date range acceptance
   - Test empty date fields (should be allowed)

### Property-Based Tests

Property-based testing will use the `fast-check` library for JavaScript/React testing.

1. **Property Test: Terminology Consistency**
   - Generate random billing scenarios
   - Verify all rendered text uses "Special Price" not "Master Price"
   - Check bill summary, PDF content, and UI labels

2. **Property Test: Date Validation**
   - Generate random date pairs
   - Verify validation logic correctly identifies invalid ranges
   - Verify valid ranges are accepted

### Integration Tests

1. **End-to-End Bill Creation**
   - Create bill with Special Price selected
   - Verify bill is created with correct pricing
   - Verify PDF displays "Special Price"

2. **Date Range Selection Flow**
   - Select customer
   - Select date range
   - Verify date range is stored in component state
   - Verify date range can be used in bill generation

### Manual Testing Checklist

- [ ] Visual inspection of "Special Price" label
- [ ] Verify glassmorphism styling matches existing cards
- [ ] Test date picker UI on different browsers
- [ ] Verify responsive design on mobile devices
- [ ] Test keyboard navigation for date inputs
- [ ] Verify accessibility (screen reader compatibility)
