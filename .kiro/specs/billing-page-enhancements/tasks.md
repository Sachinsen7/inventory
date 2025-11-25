# Implementation Plan

- [x] 1. Update price type terminology from "Master Price" to "Special Price"





  - Update the radio button label in the price type selection card
  - Update the badge display in the bill items table
  - Update the PDF generation template to show "Special Price"
  - Update the bill summary card text
  - Ensure internal state variable `priceType` continues to use 'masterPrice' value for backend compatibility
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Implement date range selector component





  - Add state variables for startDate, endDate, and dateRangeError
  - Create a new card component for date range selection positioned below price type selection
  - Apply glassmorphism styling consistent with existing cards (rgba background, backdrop-filter, border-radius, box-shadow)
  - Add date input fields with labels "Start Date" and "End Date"
  - Implement conditional rendering to show date range selector only when customer is selected
  - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.4_

- [x] 3. Implement date validation logic





  - Create validation function to check if start date is in the future
  - Create validation function to check if end date is before start date
  - Add error state management for date validation errors
  - Display inline error messages below date inputs when validation fails
  - Apply red border styling to invalid date inputs
  - Clear errors when user corrects invalid input
  - _Requirements: 2.3, 2.4_

- [x] 4. Integrate date range with bill generation





  - Store selected date range in component state
  - Pass date range data to bill creation API call (if needed for future features)
  - Ensure date range is included in bill metadata
  - _Requirements: 2.5_
- [x] 5. Update CSS styling for date inputs














- [ ] 5. Update CSS styling for date inputs

  - Apply focus effects to date inputs matching other form inputs
  - Ensure date inputs have consistent styling with existing form controls
  - Add hover effects for better user interaction feedback
  - _Requirements: 3.3_

- [x] 6. Write unit tests for terminology updates





  - Test that "Special Price" label renders correctly in price type selection
  - Test that "Special Price" appears in bill summary when selected
  - Test that PDF generation includes "Special Price" text
  - Test that internal state uses "masterPrice" value
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 7. Write unit tests for date range component
  - Test that date range selector renders when customer is selected
  - Test that date range selector is hidden when no customer is selected
  - Test that date inputs accept valid date values
  - Test that date range selector is positioned correctly
  - _Requirements: 2.1, 2.2, 3.2_

- [ ] 8. Write unit tests for date validation
  - Test future date rejection for start date
  - Test end date before start date rejection
  - Test valid date range acceptance
  - Test that empty date fields are allowed
  - Test error message display
  - Test error clearing on valid input
  - _Requirements: 2.3, 2.4_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
