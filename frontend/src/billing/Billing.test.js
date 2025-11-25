import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import Billing from './Billing';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Mock dependencies
jest.mock('axios');
jest.mock('jspdf');
jest.mock('html2canvas');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

// Mock toast notifications
jest.mock('../utils/toastNotifications', () => ({
  showToast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Billing Component - Terminology Updates', () => {
  const mockCustomers = [
    {
      _id: 'customer1',
      name: 'Test Customer',
      gstNo: 'GST123',
      address: '123 Test St',
      city: 'Test City',
      state: 'Test State',
      phoneNumber: '1234567890',
    },
  ];

  const mockItems = [
    {
      _id: 'item1',
      name: '001-Test Item',
      itemName: '001-Test Item',
      price: 100,
      masterPrice: 80,
    },
  ];

  const mockGodowns = {
    matchingGodowns: [
      {
        _id: 'godown1',
        name: 'Test Godown',
        city: 'Test City',
        state: 'Test State',
      },
    ],
    nonMatchingGodowns: [],
    customerLocation: {
      city: 'Test City',
      state: 'Test State',
    },
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default axios responses
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/customers/')) {
        return Promise.resolve({ data: mockCustomers });
      }
      if (url.includes('/items')) {
        return Promise.resolve({ data: mockItems });
      }
      if (url.includes('/godowns/sorted/')) {
        return Promise.resolve({ data: mockGodowns });
      }
      return Promise.resolve({ data: [] });
    });
  });

  /**
   * Test 1: Verify "Special Price" label renders correctly in price type selection
   * Validates: Requirements 1.1
   */
  test('should display "Special Price" label in price type selection', async () => {
    render(
      <BrowserRouter>
        <Billing />
      </BrowserRouter>
    );

    // Wait for customers to load and appear in the select
    await waitFor(() => {
      expect(screen.getByText(/Test Customer/)).toBeInTheDocument();
    });

    // Select a customer to show price type options
    const customerSelect = screen.getByRole('combobox');
    fireEvent.change(customerSelect, { target: { value: 'customer1' } });

    // Wait for price type section to appear
    await waitFor(() => {
      const specialPriceLabel = screen.getByText(/Special Price/i);
      expect(specialPriceLabel).toBeInTheDocument();
    });

    // Verify "Master Price" is NOT present
    const masterPriceLabels = screen.queryAllByText(/Master Price/i);
    expect(masterPriceLabels).toHaveLength(0);
  });

  /**
   * Test 2: Verify "Special Price" appears in bill summary when selected
   * Validates: Requirements 1.2
   */
  test('should display "Special Price" in bill summary when masterPrice is selected', async () => {
    render(
      <BrowserRouter>
        <Billing />
      </BrowserRouter>
    );

    // Wait for customers to load
    await waitFor(() => {
      expect(screen.getByText(/Test Customer/)).toBeInTheDocument();
    });

    // Select a customer
    const customerSelect = screen.getByRole('combobox');
    fireEvent.change(customerSelect, { target: { value: 'customer1' } });

    // Wait for price type section and select Special Price
    await waitFor(() => {
      const specialPriceButton = screen.getByText(/Special Price/i).closest('.price-type-btn');
      fireEvent.click(specialPriceButton);
    });

    // Add an item to the bill
    await waitFor(() => {
      const addButton = screen.getAllByText(/Add to Bill/i)[0];
      fireEvent.click(addButton);
    });

    // Check that the bill summary shows "Special Price"
    await waitFor(() => {
      const specialPriceBadges = screen.getAllByText(/Special Price/i);
      // Should appear in: price type selector, bill items table badge, and bill summary
      expect(specialPriceBadges.length).toBeGreaterThan(1);
    });

    // Verify the badge in the bill items table
    const billItemsTable = screen.getByRole('table');
    expect(billItemsTable).toHaveTextContent('Special Price');
  });

  /**
   * Test 3: Verify PDF generation includes "Special Price" text
   * Validates: Requirements 1.3
   */
  test('should include "Special Price" in PDF generation', async () => {
    // Mock html2canvas and jsPDF
    const mockCanvas = {
      toDataURL: jest.fn(() => 'data:image/png;base64,mock'),
      height: 1000,
      width: 800,
    };
    html2canvas.mockResolvedValue(mockCanvas);

    const mockPdf = {
      addImage: jest.fn(),
      addPage: jest.fn(),
      save: jest.fn(),
    };
    jsPDF.mockImplementation(() => mockPdf);

    render(
      <BrowserRouter>
        <Billing />
      </BrowserRouter>
    );

    // Wait for customers to load
    await waitFor(() => {
      expect(screen.getByText(/Test Customer/)).toBeInTheDocument();
    });

    // Select a customer
    const customerSelect = screen.getByRole('combobox');
    fireEvent.change(customerSelect, { target: { value: 'customer1' } });

    // Select Special Price
    await waitFor(() => {
      const specialPriceButton = screen.getByText(/Special Price/i).closest('.price-type-btn');
      fireEvent.click(specialPriceButton);
    });

    // Add an item to the bill
    await waitFor(() => {
      const addButton = screen.getAllByText(/Add to Bill/i)[0];
      fireEvent.click(addButton);
    });

    // Click download PDF button
    await waitFor(() => {
      const downloadButton = screen.getByText(/Download PDF/i);
      fireEvent.click(downloadButton);
    });

    // Wait for PDF generation
    await waitFor(() => {
      expect(html2canvas).toHaveBeenCalled();
    });

    // Verify that the PDF content includes "Special Price"
    const html2canvasCall = html2canvas.mock.calls[0];
    const pdfContent = html2canvasCall[0];
    expect(pdfContent.innerHTML).toContain('Special Price');
    expect(pdfContent.innerHTML).not.toContain('Master Price');
  });

  /**
   * Test 4: Verify internal state uses "masterPrice" value
   * Validates: Requirements 1.4
   */
  test('should use "masterPrice" as internal state value for backend compatibility', async () => {
    // Mock godown items response
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/customers/')) {
        return Promise.resolve({ data: mockCustomers });
      }
      if (url.includes('/items')) {
        return Promise.resolve({ data: mockItems });
      }
      if (url.includes('/godowns/sorted/')) {
        return Promise.resolve({ data: mockGodowns });
      }
      if (url.includes('/godowns/godown1/items')) {
        return Promise.resolve({
          data: {
            godown: mockGodowns.matchingGodowns[0],
            items: mockItems,
          },
        });
      }
      if (url.includes('/godowns/godown1')) {
        return Promise.resolve({ data: mockGodowns.matchingGodowns[0] });
      }
      if (url.includes('/delevery1')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    axios.post.mockResolvedValue({
      data: {
        success: true,
        deletionResults: [],
      },
    });

    render(
      <BrowserRouter>
        <Billing />
      </BrowserRouter>
    );

    // Wait for customers to load
    await waitFor(() => {
      expect(screen.getByText(/Test Customer/)).toBeInTheDocument();
    });

    // Select a customer
    const customerSelect = screen.getByRole('combobox');
    fireEvent.change(customerSelect, { target: { value: 'customer1' } });

    // Wait for godown select to appear and select a godown
    await waitFor(() => {
      const godownSelects = screen.getAllByRole('combobox');
      expect(godownSelects.length).toBeGreaterThan(1);
      const godownSelect = godownSelects[1]; // Second combobox is the godown select
      fireEvent.change(godownSelect, { target: { value: 'godown1' } });
    });

    // Select Special Price
    await waitFor(() => {
      const specialPriceButton = screen.getByText(/Special Price/i).closest('.price-type-btn');
      fireEvent.click(specialPriceButton);
    });

    // Add an item to the bill
    await waitFor(() => {
      const addButtons = screen.getAllByText(/Add to Bill/i);
      expect(addButtons.length).toBeGreaterThan(0);
      fireEvent.click(addButtons[0]);
    });

    // Mock inventory check
    axios.post.mockResolvedValueOnce({
      data: [
        {
          itemName: '001-Test Item',
          requestedQuantity: 1,
          availableQuantity: 10,
          isAvailableInSelectedGodown: true,
          status: 'Available',
        },
      ],
    });

    // Check inventory
    await waitFor(() => {
      const checkInventoryButton = screen.getByText(/Check Inventory/i);
      fireEvent.click(checkInventoryButton);
    });

    // Wait for inventory check to complete
    await waitFor(() => {
      expect(screen.getByText(/Inventory Checked/i)).toBeInTheDocument();
    });

    // Submit the bill
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        deletionResults: [],
      },
    });

    const generateBillButton = screen.getByText(/Generate Bill/i);
    fireEvent.click(generateBillButton);

    // Verify that the API call includes priceType: 'masterPrice'
    await waitFor(() => {
      const billCreationCall = axios.post.mock.calls.find(
        (call) => call[0].includes('/api/bills/add')
      );
      expect(billCreationCall).toBeDefined();
      expect(billCreationCall[1].priceType).toBe('masterPrice');
    });
  });
});
