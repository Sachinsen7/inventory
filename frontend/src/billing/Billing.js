import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { showToast } from '../utils/toastNotifications';
import './Billing.css'; // Import the new stylesheet
import CustomerHistory from '../components/CustomerHistory';
import LedgerManagement from '../components/LedgerManagement';


function Billing() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerItems, setCustomerItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [inventoryStatus, setInventoryStatus] = useState([]);
  const [showInventoryStatus, setShowInventoryStatus] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeData, setQrCodeData] = useState('');
  const [qrCodeImage, setQrCodeImage] = useState('');
  const [priceType, setPriceType] = useState('price'); // 'price' or 'masterPrice'
  const [upiId, setUpiId] = useState('your-upi-id@bank'); // Default UPI ID
  const [showUpiInput, setShowUpiInput] = useState(false);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [godowns, setGodowns] = useState({ matchingGodowns: [], nonMatchingGodowns: [] });
  const [selectedGodown, setSelectedGodown] = useState('');
  const [showGodowns, setShowGodowns] = useState(false);
  const [godownItems, setGodownItems] = useState([]);
  const [selectedGodownData, setSelectedGodownData] = useState(null);
  const [availableItems, setAvailableItems] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateRangeError, setDateRangeError] = useState({ startDate: '', endDate: '' });

  // GST-related states
  const [companyState, setCompanyState] = useState(''); // Your business state
  const [subtotal, setSubtotal] = useState(0);
  const [sgst, setSgst] = useState(0);
  const [cgst, setCgst] = useState(0);
  const [igst, setIgst] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);

  // Stock dialog state
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [stockDialogItems, setStockDialogItems] = useState([]);
  const [stockSearchTerm, setStockSearchTerm] = useState('');

  // Ledger states
  const [showCustomerHistory, setShowCustomerHistory] = useState(false);
  const [showLedgerManagement, setShowLedgerManagement] = useState(false);

  const navigate = useNavigate();
  const billRef = useRef();

  // Backend URL from environment variable
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

  // Date validation functions
  const validateStartDate = (dateValue) => {
    if (!dateValue) {
      setDateRangeError(prev => ({ ...prev, startDate: '' }));
      return true;
    }

    const selectedDate = new Date(dateValue);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

    if (selectedDate > today) {
      setDateRangeError(prev => ({ ...prev, startDate: 'Start date cannot be in the future' }));
      return false;
    }

    setDateRangeError(prev => ({ ...prev, startDate: '' }));
    return true;
  };

  const validateEndDate = (dateValue) => {
    if (!dateValue) {
      setDateRangeError(prev => ({ ...prev, endDate: '' }));
      return true;
    }

    if (!startDate) {
      setDateRangeError(prev => ({ ...prev, endDate: '' }));
      return true;
    }

    const selectedEndDate = new Date(dateValue);
    const selectedStartDate = new Date(startDate);

    if (selectedEndDate < selectedStartDate) {
      setDateRangeError(prev => ({ ...prev, endDate: 'End date must be after start date' }));
      return false;
    }

    setDateRangeError(prev => ({ ...prev, endDate: '' }));
    return true;
  };

  const handleStartDateChange = (e) => {
    const dateValue = e.target.value;
    setStartDate(dateValue);
    validateStartDate(dateValue);

    // Re-validate end date if it exists
    if (endDate) {
      validateEndDate(endDate);
    }
  };

  const handleEndDateChange = (e) => {
    const dateValue = e.target.value;
    setEndDate(dateValue);
    validateEndDate(dateValue);
  };

  // Fetch all customers
  useEffect(() => {
    axios.get(`${backendUrl}/api/customers/`)
      .then(response => {
        setCustomers(response.data);
      })
      .catch((error) => {
        console.log(error);
        const errorMsg = error.response?.data?.message || error.message || 'Error fetching customers';
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          showToast.error('Connection timeout. Please check your internet connection.');
        } else if (error.response) {
          showToast.error(`Backend error: ${error.response.status} - ${errorMsg}`);
        } else if (error.request) {
          showToast.error('Unable to connect to the server. Please check if the backend is running.');
        } else {
          showToast.error(errorMsg);
        }
      });
  }, []);

  // Fetch items when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      console.log('Fetching items for billing customer:', selectedCustomer);
      axios.get(`${backendUrl}/api/bills/customer/${selectedCustomer}/items`)
        .then(response => {
          console.log('Billing items received:', response.data);
          setCustomerItems(response.data);
        })
        .catch((error) => {
          console.log('Error fetching billing items:', error);
          const errorMsg = error.response?.data?.message || error.message || 'Error fetching billing items';
          showToast.error(`Error fetching items: ${errorMsg}`);
        });

      // Fetch godowns sorted by location matching
      axios.get(`${backendUrl}/api/godowns/sorted/${selectedCustomer}`)
        .then(response => {
          console.log('Godowns received:', response.data);
          setGodowns(response.data);
          setShowGodowns(true);
        })
        .catch((error) => {
          console.log('Error fetching godowns:', error);
          const errorMsg = error.response?.data?.message || error.message || 'Error fetching godowns';
          showToast.error(`Error fetching godowns: ${errorMsg}`);
        });
    } else {
      setShowGodowns(false);
      setSelectedGodown('');
    }
  }, [selectedCustomer]);

  // Calculate total amount and GST when selected items or customer changes
  useEffect(() => {
    const itemsTotal = selectedItems.reduce((sum, item) => sum + item.total, 0);
    setSubtotal(itemsTotal);

    // Get customer state to determine GST type
    const selectedCustomerData = customers.find(c => c._id === selectedCustomer);
    const customerState = selectedCustomerData?.state || '';

    // Calculate GST based on state match
    // Assuming your company state - you can set this from settings or hardcode your state
    const businessState = companyState || 'Maharashtra'; // Default to Maharashtra, change as needed

    const isWithinState = customerState.toLowerCase() === businessState.toLowerCase();

    if (isWithinState) {
      // Within state: SGST 9% + CGST 9%
      const sgstAmount = itemsTotal * 0.09;
      const cgstAmount = itemsTotal * 0.09;
      setSgst(sgstAmount);
      setCgst(cgstAmount);
      setIgst(0);
      const total = itemsTotal + sgstAmount + cgstAmount;
      setTotalAmount(total);
      setGrandTotal(total);
    } else {
      // Other state: IGST 18%
      const igstAmount = itemsTotal * 0.18;
      setSgst(0);
      setCgst(0);
      setIgst(igstAmount);
      const total = itemsTotal + igstAmount;
      setTotalAmount(total);
      setGrandTotal(total);
    }
  }, [selectedItems, selectedCustomer, customers, companyState]);

  const handleCustomerChange = async (e) => {
    const customerId = e.target.value;
    setSelectedCustomer(customerId);
    setSelectedItems([]);
    setShowInventoryStatus(false);
    setShowQRCode(false);

    // If godown is also selected, fetch and match items
    if (customerId && selectedGodown) {
      await fetchAndMatchItems(customerId, selectedGodown);
    } else {
      setAvailableItems([]);
    }
  };

  const handlePriceTypeChange = (e) => {
    setPriceType(e.target.value);
    // Recalculate totals with new price type
    const updatedItems = selectedItems.map(item => {
      const selectedPrice = e.target.value === 'masterPrice' ? item.masterPrice : item.price;
      return {
        ...item,
        selectedPrice: selectedPrice,
        total: item.quantity * selectedPrice
      };
    });
    setSelectedItems(updatedItems);
  };

  // Function to fetch and match items based on 3-digit prefix
  const fetchAndMatchItems = async (customerId, godownId) => {
    try {
      console.log('Fetching and matching items for customer:', customerId, 'godown:', godownId);

      // Get billing items for customer
      const billingResponse = await axios.get(`${backendUrl}/api/bills/customer/${customerId}/items`);
      const billingItems = billingResponse.data;
      console.log('Billing items:', billingItems);

      // Get delevery1 items for godown
      const delevery1Response = await axios.get(`${backendUrl}/api/delevery1`);
      const delevery1Items = delevery1Response.data;
      console.log('Delevery1 items:', delevery1Items);

      // Get godown details
      const godownResponse = await axios.get(`${backendUrl}/api/godowns/${godownId}`);
      const godownName = godownResponse.data.name;
      console.log('Godown name:', godownName);

      // Filter delevery1 items for this godown
      const godownDelevery1Items = delevery1Items.filter(item => item.godownName === godownName);
      console.log('Godown delevery1 items:', godownDelevery1Items);

      // Match billing items with delevery1 items based on 3-digit prefix
      const matchedItems = billingItems.map(billingItem => {
        const billingItemName = billingItem.name || '';
        const prefix = billingItemName.substring(0, 3); // Get first 3 digits

        console.log(`Matching billing item: ${billingItemName}, prefix: ${prefix}`);

        // Find all delevery1 items that start with this prefix
        const matchingDelevery1Items = godownDelevery1Items.filter(deleveryItem => {
          const inputValue = deleveryItem.inputValue || '';
          return inputValue.startsWith(prefix);
        });

        console.log(`Found ${matchingDelevery1Items.length} matching items for prefix ${prefix}`);

        return {
          ...billingItem,
          itemName: billingItem.name,
          availableQuantity: matchingDelevery1Items.length,
          matchingItems: matchingDelevery1Items,
          prefix: prefix
        };
      });

      console.log('Matched items:', matchedItems);
      setAvailableItems(matchedItems);

    } catch (error) {
      console.error('Error fetching and matching items:', error);
      setAvailableItems([]);
      const errorMsg = error.response?.data?.message || error.message || 'Error fetching and matching items';
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        showToast.error('Connection timeout. Please check your internet connection.');
      } else if (error.response) {
        showToast.error(`Backend error: ${error.response.status} - ${errorMsg}`);
      } else if (error.request) {
        showToast.error('Unable to connect to the server. Please check if the backend is running.');
      } else {
        showToast.error(errorMsg);
      }
    }
  };

  const handleGodownChange = async (e) => {
    const godownId = e.target.value;
    setSelectedGodown(godownId);

    if (godownId) {
      // Fetch items from selected godown
      try {
        const response = await axios.get(`${backendUrl}/api/godowns/${godownId}/items`);
        console.log('Godown items received:', response.data);
        const items = response.data.items || [];
        setGodownItems(items);
        setSelectedGodownData(response.data.godown);

        // Show stock dialog with items
        setStockDialogItems(items);
        setShowStockDialog(true);

        // If customer is also selected, fetch and match items
        if (selectedCustomer) {
          await fetchAndMatchItems(selectedCustomer, godownId);
        }
      } catch (error) {
        console.log('Error fetching godown items:', error);
        setGodownItems([]);
        setSelectedGodownData(null);
        const errorMsg = error.response?.data?.message || error.message || 'Error fetching godown items';
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          showToast.error('Connection timeout. Please check your internet connection.');
        } else if (error.response) {
          showToast.error(`Backend error: ${error.response.status} - ${errorMsg}`);
        } else if (error.request) {
          showToast.error('Unable to connect to the server. Please check if the backend is running.');
        } else {
          showToast.error(errorMsg);
        }
      }
    } else {
      setGodownItems([]);
      setSelectedGodownData(null);
      setAvailableItems([]);
      setShowStockDialog(false);
    }
  };

  const addItemToBill = (item) => {
    const existingItem = selectedItems.find(selected => selected.itemId === item._id);
    const selectedPrice = priceType === 'masterPrice' ? item.masterPrice : item.price;

    if (existingItem) {
      // If item already exists, increase quantity
      const updatedItems = selectedItems.map(selected =>
        selected.itemId === item._id
          ? {
            ...selected,
            quantity: selected.quantity + 1,
            selectedPrice: selectedPrice,
            total: (selected.quantity + 1) * selectedPrice
          }
          : selected
      );
      setSelectedItems(updatedItems);
    } else {
      // Add new item
      const newItem = {
        itemId: item._id,
        itemName: item.itemName || item.name, // Handle both godown items and customer items
        price: item.price,
        masterPrice: item.masterPrice,
        selectedPrice: selectedPrice,
        quantity: 1,
        total: selectedPrice
      };
      setSelectedItems([...selectedItems, newItem]);
    }
  };

  const increaseQuantity = (itemId) => {
    const updatedItems = selectedItems.map(item =>
      item.itemId === itemId
        ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.selectedPrice }
        : item
    );
    setSelectedItems(updatedItems);
  };

  const decreaseQuantity = (itemId) => {
    const updatedItems = selectedItems.map(item => {
      if (item.itemId === itemId) {
        const newQuantity = Math.max(0, item.quantity - 1);
        return { ...item, quantity: newQuantity, total: newQuantity * item.selectedPrice };
      }
      return item;
    }).filter(item => item.quantity > 0); // Remove items with quantity 0
    setSelectedItems(updatedItems);
  };

  const removeItem = (itemId) => {
    setSelectedItems(selectedItems.filter(item => item.itemId !== itemId));
  };

  const checkInventory = async () => {
    if (selectedItems.length === 0) {
      showToast.warning('Please add items to the bill first');
      return;
    }

    if (!selectedGodown) {
      showToast.warning('Please select a godown first');
      return;
    }

    const itemsToCheck = selectedItems.map(item => ({
      itemName: item.itemName,
      quantity: item.quantity
    }));

    console.log('Checking inventory for items:', itemsToCheck);
    console.log('Selected godown:', selectedGodown);

    try {
      const response = await axios.post(`${backendUrl}/api/inventory/check-availability`, {
        items: itemsToCheck,
        godownId: selectedGodown
      });
      console.log('Inventory check response:', response.data);
      setInventoryStatus(response.data);
      setShowInventoryStatus(true);
    } catch (error) {
      console.log(error);
      const errorMsg = error.response?.data?.message || error.message || 'Error checking inventory';
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        showToast.error('Connection timeout. Please check your internet connection.');
      } else if (error.response) {
        showToast.error(`Backend error: ${error.response.status} - ${errorMsg}`);
      } else if (error.request) {
        showToast.error('Unable to connect to the server. Please check if the backend is running.');
      } else {
        showToast.error(errorMsg);
      }
    }
  };

  const downloadPDF = async () => {
    if (selectedItems.length === 0) {
      showToast.warning('Please add items to the bill first');
      return;
    }

    const selectedCustomerData = customers.find(c => c._id === selectedCustomer);

    // Calculate total amount to ensure it's correct
    const calculatedTotal = selectedItems.reduce((sum, item) => sum + item.total, 0);
    console.log('Selected items:', selectedItems);
    console.log('Calculated total:', calculatedTotal);
    console.log('Current totalAmount state:', totalAmount);

    try {
      // Create a temporary div for PDF generation
      const pdfContent = document.createElement('div');
      pdfContent.style.padding = '20px';
      pdfContent.style.fontFamily = 'Arial, sans-serif';
      pdfContent.style.backgroundColor = 'white';
      pdfContent.style.color = 'black';
      pdfContent.style.width = '800px';
      pdfContent.style.minHeight = '600px';
      pdfContent.style.position = 'absolute';
      pdfContent.style.left = '-9999px';
      pdfContent.style.top = '0';

      pdfContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2c3e50; margin-bottom: 10px;">INVOICE</h1>
          <div style="border-bottom: 2px solid #3498db; width: 100px; margin: 0 auto;"></div>
        </div>
        
        <div style="margin-bottom: 30px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div>
              <h3 style="color: #2c3e50; margin-bottom: 10px;">Bill To:</h3>
              <p style="margin: 5px 0;"><strong>Name:</strong> ${selectedCustomerData.name}</p>
              <p style="margin: 5px 0;"><strong>GST No:</strong> ${selectedCustomerData.gstNo || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Address:</strong> ${selectedCustomerData.address}</p>
              <p style="margin: 5px 0;"><strong>City:</strong> ${selectedCustomerData.city}</p>
              <p style="margin: 5px 0;"><strong>State:</strong> ${selectedCustomerData.state}</p>
              <p style="margin: 5px 0;"><strong>Phone:</strong> ${selectedCustomerData.phoneNumber || 'N/A'}</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p style="margin: 5px 0;"><strong>Price Type:</strong> ${priceType === 'masterPrice' ? 'Special Price' : 'Regular Price'}</p>
              ${selectedGodownData ? `<p style="margin: 5px 0;"><strong>Godown:</strong> ${selectedGodownData.name}</p>` : ''}
              ${startDate || endDate ? `<p style="margin: 5px 0;"><strong>Date Range:</strong> ${startDate ? new Date(startDate).toLocaleDateString() : 'N/A'} - ${endDate ? new Date(endDate).toLocaleDateString() : 'N/A'}</p>` : ''}
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 30px;">
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Item Name</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: center;">Price (₹)</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: center;">Quantity</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: right;">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${selectedItems.map(item => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 12px;">${item.itemName}</td>
                  <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">₹${item.selectedPrice}</td>
                  <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${item.quantity}</td>
                  <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">₹${item.total}</td>
                </tr>
              `).join('')}
              <tr style="background-color: #f8f9fa;">
                <td style="border: 1px solid #ddd; padding: 12px; text-align: right;" colspan="3">
                  <strong>Subtotal:</strong>
                </td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">
                  <strong>₹${subtotal.toFixed(2)}</strong>
                </td>
              </tr>
              ${sgst > 0 ? `
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: right;" colspan="3">
                  SGST (9%):
                </td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">
                  ₹${sgst.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: right;" colspan="3">
                  CGST (9%):
                </td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">
                  ₹${cgst.toFixed(2)}
                </td>
              </tr>
              ` : ''}
              ${igst > 0 ? `
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: right;" colspan="3">
                  IGST (18%):
                </td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">
                  ₹${igst.toFixed(2)}
                </td>
              </tr>
              ` : ''}
              <tr style="background-color: #3498db; color: white; font-weight: bold;">
                <td style="border: 1px solid #ddd; padding: 12px; text-align: right;" colspan="3">
                  <strong>GRAND TOTAL:</strong>
                </td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: right; font-size: 18px;">
                  <strong>₹${grandTotal.toFixed(2)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="text-align: right; margin-top: 20px; margin-bottom: 30px;">
          <h2 style="color: #2c3e50; margin: 0; font-size: 24px;">Grand Total: ₹${grandTotal.toFixed(2)}</h2>
          <p style="color: #7f8c8d; font-size: 14px; margin-top: 10px;">
            ${sgst > 0 ? '(Includes SGST 9% + CGST 9%)' : igst > 0 ? '(Includes IGST 18%)' : ''}
          </p>
        </div>
        
        <div style="margin-top: 50px; text-align: center; color: #7f8c8d; font-size: 12px;">
          <p>Thank you for your business!</p>
        </div>
      `;

      document.body.appendChild(pdfContent);

      // Wait a moment for the content to render
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(pdfContent, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: pdfContent.scrollWidth,
        height: pdfContent.scrollHeight,
        scrollX: 0,
        scrollY: 0
      });

      document.body.removeChild(pdfContent);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`bill_${selectedCustomerData.name}_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast.error('Error generating PDF. Please try again.');
    }
  };

  const shareQRCodeOnWhatsApp = async () => {
    if (!qrCodeImage) {
      showToast.warning('Please generate a QR Code first.');
      return;
    }

    try {
      const response = await fetch(qrCodeImage);
      const blob = await response.blob();
      const file = new File([blob], 'qrcode.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Payment QR Code',
          text: `Scan this QR code to pay ₹${totalAmount}`,
        });
      } else {
        const link = document.createElement('a');
        link.href = qrCodeImage;
        link.download = 'qrcode.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast.info('Web Share API not supported. QR Code downloaded. Please share manually.');
      }
    } catch (error) {
      console.error('Error sharing QR Code:', error);
      showToast.error('Could not share QR Code.');
    }
  };

  const generatePaymentQR = async () => {
    if (selectedItems.length === 0) {
      showToast.warning('Please add items to the bill first');
      return;
    }

    try {
      setIsGeneratingQR(true);
      // Generate UPI payment link
      const paymentLink = `upi://pay?pa=${upiId}&pn=Payment&am=${totalAmount}&cu=INR&tn=Bill Payment`;

      setQrCodeData(paymentLink);

      // Generate QR code image
      const qrCodeDataURL = await QRCode.toDataURL(paymentLink, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      setQrCodeImage(qrCodeDataURL);
      setShowQRCode(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
      showToast.error('Error generating QR code. Please try again.');
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const handleSubmitBill = async () => {
    if (selectedItems.length === 0) {
      showToast.warning('Please add items to the bill');
      return;
    }

    if (!selectedGodown) {
      showToast.warning('Please select a godown');
      return;
    }

    // Check if inventory has been verified
    if (!showInventoryStatus) {
      showToast.warning('Please check inventory availability first');
      return;
    }

    // Check if all items are available in the selected godown
    const unavailableItems = inventoryStatus.filter(item => !item.isAvailableInSelectedGodown);
    if (unavailableItems.length > 0) {
      const unavailableItemNames = unavailableItems.map(item => item.itemName).join(', ');
      showToast.error(`Cannot generate bill. The following items are not available in the selected godown: ${unavailableItemNames}`);
      return;
    }

    const selectedCustomerData = customers.find(c => c._id === selectedCustomer);

    try {
      const billData = {
        customerId: selectedCustomer,
        customerName: selectedCustomerData.name,
        godownId: selectedGodown,
        godownName: selectedGodownData?.name || '',
        items: selectedItems,
        totalAmount: totalAmount,
        priceType: priceType
      };

      // Include date range in bill metadata if dates are selected
      if (startDate || endDate) {
        billData.dateRange = {
          startDate: startDate || null,
          endDate: endDate || null
        };
      }

      const response = await axios.post(`${backendUrl}/api/bills/add`, billData);

      console.log('Bill creation response:', response.data);

      // Show detailed success message with deletion results
      if (response.data.deletionResults) {
        const totalDeleted = response.data.deletionResults.reduce((sum, result) => sum + result.deletedItems, 0);
        const deletionSummary = response.data.deletionResults.map(result =>
          `${result.itemName}: ${result.deletedItems} items removed`
        ).join('\n');

        showToast.success(`✅ Bill created successfully!\n\n📦 Items removed from inventory:\n${deletionSummary}\n\nTotal items removed: ${totalDeleted}`);
      } else {
        showToast.success('✅ Bill created successfully! Items have been deducted from godown inventory.');
      }

      navigate(`/customer/${selectedCustomer}`);
    } catch (error) {
      console.log(error);
      showToast.error('❌ Error creating bill: ' + (error.response?.data?.message || error.message));
    }
  };

  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #a855f7 0%, #c084fc 50%, #d8b4fe 100%)",
    padding: "40px 20px",
    color: 'white',
    fontSize: '16px',
  };

  const cardStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '30px',
    margin: '15px 0',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    width: '100%',
    maxWidth: '900px',
    transition: 'all 0.3s ease',
  };

  return (
    <div style={containerStyle}>
      <style>
        {`
          .table {
            color: white;
          }

          .table th {
            border-color: rgba(255, 255, 255, 0.3);
            background-color: rgba(255, 255, 255, 0.1);
          }

          .table td {
            border-color: rgba(255, 255, 255, 0.2);
          }

          .form-select, .form-control {
            background-color: rgba(255, 255, 255, 0.9);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            border: none;
            border-radius: 12px;
            color: #333;
            padding: 12px 16px;
            transition: all 0.3s ease;
          }

          .form-select:focus, .form-control:focus {
            background-color: white;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border: none;
            outline: none;
          }

          .form-control:hover {
            background-color: white;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
          }

          .form-control.is-invalid {
            border: 2px solid #dc3545 !important;
            background-color: rgba(220, 53, 69, 0.05);
          }

          .form-control.is-invalid:focus {
            border-color: #dc3545 !important;
            box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
          }

          .form-label {
            color: rgba(255, 255, 255, 0.9);
            font-weight: 600;
            margin-bottom: 8px;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.5px;
          }

          .form-select option {
            background-color: white;
            color: #333;
          }

          .btn {
            border-radius: 12px;
            padding: 12px 24px;
            font-weight: 600;
            transition: all 0.3s ease;
            border: none;
          }

          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
          }

          .btn-outline-info {
            background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
            color: white;
            border: none;
          }

          .btn-outline-info:hover {
            background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%);
            color: white;
          }

          .card {
            background-color: rgba(255, 255, 255, 0.15);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
          }

          .card:hover {
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
            transform: translateY(-2px);
          }

          .card-header {
            background: transparent;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            padding: 20px 24px;
          }

          .card-header h5 {
            color: rgba(255, 255, 255, 0.9);
            font-weight: 600;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 1px;
            margin: 0;
          }

          .card-body {
            padding: 24px;
          }

          .form-check-input[type="radio"] {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255, 255, 255, 0.5);
            background-color: transparent;
          }

          .form-check-input[type="radio"]:checked {
            background-color: #8b5cf6;
            border-color: #8b5cf6;
          }

          .form-check-label {
            color: white;
            font-weight: 500;
            margin-left: 8px;
          }

          .price-type-btn {
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 12px;
            padding: 16px 24px;
            color: white;
            font-weight: 600;
            transition: all 0.3s ease;
            cursor: pointer;
            text-align: center;
          }

          .price-type-btn:hover {
            background: rgba(255, 255, 255, 0.25);
            border-color: rgba(255, 255, 255, 0.5);
          }

          .price-type-btn.active {
            background: rgba(139, 92, 246, 0.4);
            border-color: #8b5cf6;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
          }

          .initialize-btn {
            background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 12px;
            font-weight: 600;
            transition: all 0.3s ease;
          }

          .initialize-btn:hover {
            background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
          }
        `}
      </style>

      <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 8px 24px rgba(251, 191, 36, 0.4)'
          }}>
            <span style={{ fontSize: '40px' }}>💰</span>
          </div>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)',
            margin: 0
          }}>
            Create New Bill
          </h2>
        </div>

        <div style={{ width: '100%' }}>
          {/* Customer Selection */}
          <div className="card mb-4" style={cardStyle}>
            <div className="card-header">
              <h5>Select Customer</h5>
            </div>
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <select
                    className="form-select"
                    value={selectedCustomer}
                    onChange={handleCustomerChange}
                  >
                    <option value="">Choose a customer...</option>
                    {customers.map(customer => (
                      <option key={customer._id} value={customer._id}>
                        👤 {customer.name} - {customer.city}, {customer.state} - {customer.gstNo || 'No GST'}
                      </option>
                    ))}
                  </select>
                  {selectedCustomer && customers.find(c => c._id === selectedCustomer) && (
                    <small style={{ color: 'rgba(255, 255, 255, 0.7)', marginTop: '8px', display: 'block' }}>
                      Customer Location: {customers.find(c => c._id === selectedCustomer).city}, {customers.find(c => c._id === selectedCustomer).state}
                    </small>
                  )}
                </div>
                <div className="col-md-4 text-center">
                  {selectedCustomer && (
                    <button
                      className="btn btn-outline-info w-100"
                      onClick={() => navigate(`/customer/${selectedCustomer}`)}
                    >
                      🔄 View Bill History
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Available Items Section */}
          {customerItems.length > 0 && (
            <div className="card mb-4" style={cardStyle}>
              <div className="card-header">
                <h5>Available Items</h5>
                <small style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Select a godown to see matched inventory</small>
              </div>
              <div className="card-body">
                <div className="row">
                  {customerItems.map(item => (
                    <div key={item._id} className="col-md-4 mb-3">
                      <div className="card">
                        <div className="card-body">
                          <h6 className="card-title">{item.name}</h6>
                          <p className="card-text">
                            <strong>Regular Price:</strong> ₹{item.price}<br />
                            <strong>Special Price:</strong> ₹{item.masterPrice}
                          </p>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => addItemToBill(item)}
                          >
                            Add to Bill
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Selected Items */}
          {selectedItems.length > 0 && (
            <div className="card mb-4" style={cardStyle}>
              <div className="card-header">
                <h5>Bill Items</h5>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Item Name</th>
                        <th>Price Type</th>
                        <th>Price (₹)</th>
                        <th>Quantity</th>
                        <th>Total (₹)</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItems.map(item => {
                        // Find inventory status for this item
                        const itemInventoryStatus = inventoryStatus.find(
                          invItem => invItem.itemName === item.itemName
                        );

                        return (
                          <React.Fragment key={item.itemId}>
                            {/* Main item row */}
                            <tr>
                              <td>{item.itemName}</td>
                              <td>
                                <span className={`badge ${priceType === 'masterPrice' ? 'bg-warning' : 'bg-info'}`}>
                                  {priceType === 'masterPrice' ? 'Special Price' : 'Regular Price'}
                                </span>
                              </td>
                              <td>₹{item.selectedPrice}</td>
                              <td>
                                <div className="btn-group" role="group">
                                  <button
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={() => decreaseQuantity(item.itemId)}
                                  >
                                    -
                                  </button>
                                  <span className="btn btn-outline-secondary btn-sm disabled">
                                    {item.quantity}
                                  </span>
                                  <button
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={() => increaseQuantity(item.itemId)}
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td>₹{item.total}</td>
                              <td>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => removeItem(item.itemId)}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>

                            {/* Inventory status row (shown when inventory is checked) */}
                            {showInventoryStatus && itemInventoryStatus && (
                              <tr>
                                <td colSpan="6">
                                  <div className="table-responsive">
                                    <table className="table inventory-status-table mb-0">
                                      <thead>
                                        <tr>
                                          <th>Item Name</th>
                                          <th>Requested Qty</th>
                                          <th>Available in Selected Godown</th>
                                          <th>Status</th>
                                          <th>Other Godowns with Item</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr>
                                          <td>{itemInventoryStatus.itemName}</td>
                                          <td>{itemInventoryStatus.requestedQuantity}</td>
                                          <td>
                                            <span className={`badge ${itemInventoryStatus.isAvailableInSelectedGodown ? 'bg-success' : 'bg-danger'}`}>
                                              {itemInventoryStatus.availableQuantity || 0}
                                            </span>
                                          </td>
                                          <td>
                                            <span className={`badge ${itemInventoryStatus.isAvailableInSelectedGodown ? 'bg-success' : 'bg-danger'}`}>
                                              {itemInventoryStatus.message || itemInventoryStatus.status}
                                            </span>
                                          </td>
                                          <td>
                                            {itemInventoryStatus.alternativeGodowns && itemInventoryStatus.alternativeGodowns.length > 0 ? (
                                              <div>
                                                {itemInventoryStatus.alternativeGodowns.map((godown, index) => (
                                                  <div key={index} className="mb-1">
                                                    <small className="text-muted">
                                                      🏢 {godown.godownName}: {godown.availableQuantity} items
                                                    </small>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <span className="text-muted">No other godowns have this item</span>
                                            )}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Total Amount with GST Breakdown */}
                <div className="row">
                  <div className="col-md-6 offset-md-6">
                    <div className="card bg-light">
                      <div className="card-body">
                        <div style={{ marginBottom: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span>Subtotal:</span>
                            <span><strong>₹{subtotal.toFixed(2)}</strong></span>
                          </div>
                          {sgst > 0 && (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.9rem', color: '#666' }}>
                                <span>SGST (9%):</span>
                                <span>₹{sgst.toFixed(2)}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: '#666' }}>
                                <span>CGST (9%):</span>
                                <span>₹{cgst.toFixed(2)}</span>
                              </div>
                            </>
                          )}
                          {igst > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: '#666' }}>
                              <span>IGST (18%):</span>
                              <span>₹{igst.toFixed(2)}</span>
                            </div>
                          )}
                          <hr style={{ margin: '10px 0' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span><strong>Grand Total:</strong></span>
                            <span style={{ fontSize: '1.3rem', color: '#28a745' }}><strong>₹{grandTotal.toFixed(2)}</strong></span>
                          </div>
                        </div>
                        <small className="text-muted">
                          Using {priceType === 'masterPrice' ? 'Special Price' : 'Regular Price'}
                          {sgst > 0 && ' • Within State (SGST + CGST)'}
                          {igst > 0 && ' • Inter-State (IGST)'}
                        </small>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inventory Summary */}
                {showInventoryStatus && inventoryStatus.length > 0 && (
                  <div className="row mt-3">
                    <div className="col-md-12">
                      <div className="card">
                        <div className="card-header">
                          <h5>📦 Inventory Check Summary</h5>
                        </div>
                        <div className="card-body">
                          <div className="row">
                            <div className="col-md-6">
                              <h6>✅ Available Items:</h6>
                              {inventoryStatus.filter(item => item.isAvailableInSelectedGodown).map((item, index) => (
                                <div key={index} className="mb-1">
                                  <span className="badge bg-success me-2">✓</span>
                                  <strong>{item.itemName}</strong> - {item.availableQuantity} available
                                </div>
                              ))}
                              {inventoryStatus.filter(item => item.isAvailableInSelectedGodown).length === 0 && (
                                <p className="text-muted">No items available in selected godown</p>
                              )}
                            </div>
                            <div className="col-md-6">
                              <h6>❌ Unavailable Items:</h6>
                              {inventoryStatus.filter(item => !item.isAvailableInSelectedGodown).map((item, index) => (
                                <div key={index} className="mb-1">
                                  <span className="badge bg-danger me-2">✗</span>
                                  <strong>{item.itemName}</strong> - Not available in {item.selectedGodownName}
                                  {item.alternativeGodowns && item.alternativeGodowns.length > 0 && (
                                    <div className="ms-3 mt-1">
                                      <small className="text-muted">
                                        Available in: {item.alternativeGodowns.map(g => g.godownName).join(', ')}
                                      </small>
                                    </div>
                                  )}
                                </div>
                              ))}
                              {inventoryStatus.filter(item => !item.isAvailableInSelectedGodown).length === 0 && (
                                <p className="text-success">All items are available! 🎉</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="row mt-4">
                  <div className="col-md-12">
                    <div className="d-flex gap-3 flex-wrap justify-content-center">
                      <button
                        className="btn"
                        style={{
                          background: showInventoryStatus ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          color: 'white',
                          padding: '12px 28px',
                          fontSize: '15px'
                        }}
                        onClick={checkInventory}
                        disabled={!selectedGodown}
                      >
                        {showInventoryStatus ? '✓ Inventory Checked' : '📦 Check Inventory'}
                      </button>
                      <button
                        className="btn"
                        style={{
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          color: 'white',
                          padding: '12px 28px',
                          fontSize: '15px'
                        }}
                        onClick={downloadPDF}
                      >
                        📄 Download PDF
                      </button>
                      <button
                        className="btn"
                        style={{
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                          color: 'white',
                          padding: '12px 28px',
                          fontSize: '15px'
                        }}
                        onClick={generatePaymentQR}
                        disabled={isGeneratingQR}
                      >
                        {isGeneratingQR ? '⏳ Generating...' : '📱 Payment QR'}
                      </button>
                      <button
                        className="btn"
                        style={{
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                          padding: '14px 32px',
                          fontSize: '16px',
                          fontWeight: '700'
                        }}
                        onClick={handleSubmitBill}
                        disabled={!showInventoryStatus}
                      >
                        ✨ Generate Bill
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* QR Code */}
          {showQRCode && (
            <div className="card mb-4" style={cardStyle}>
              <div className="card-header">
                <h5>Payment QR Code</h5>
              </div>
              <div className="card-body text-center">
                <div className="mb-3">
                  <p><strong>Amount:</strong> ₹{totalAmount}</p>
                  <p>Scan this QR code to make payment</p>

                  {/* UPI ID Configuration */}
                  <div className="mb-3">
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setShowUpiInput(!showUpiInput)}
                    >
                      {showUpiInput ? 'Hide' : 'Configure'} UPI ID
                    </button>

                    {showUpiInput && (
                      <div className="mt-2">
                        <div className="row justify-content-center">
                          <div className="col-md-6">
                            <div className="input-group">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Enter UPI ID (e.g., yourname@bank)"
                                value={upiId}
                                onChange={(e) => setUpiId(e.target.value)}
                              />
                              <button
                                className="btn btn-primary"
                                onClick={generatePaymentQR}
                              >
                                Update QR Code
                              </button>
                            </div>
                            <small className="text-muted">Format: yourname@bank or yourname@upi</small>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border p-3 d-inline-block">
                  <div style={{ width: '200px', height: '200px', backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {qrCodeImage ? (
                      <img src={qrCodeImage} alt="Payment QR Code" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span className="text-muted">Generating QR Code...</span>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <button
                    className="btn btn-success"
                    onClick={shareQRCodeOnWhatsApp}
                  >
                    📤 Share QR Code
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stock Dialog */}
          {showStockDialog && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 9999,
                padding: '20px'
              }}
              onClick={() => setShowStockDialog(false)}
            >
              <div
                style={{
                  backgroundColor: 'white',
                  borderRadius: '15px',
                  maxWidth: '900px',
                  width: '100%',
                  maxHeight: '80vh',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Dialog Header */}
                <div style={{
                  padding: '20px 30px',
                  borderBottom: '2px solid #e0e0e0',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
                        📦 {selectedGodownData?.name || 'Godown'} - Stock Inventory
                      </h3>
                      <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>
                        {selectedGodownData?.city}, {selectedGodownData?.state}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowStockDialog(false)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        border: 'none',
                        color: 'white',
                        fontSize: '1.5rem',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
                      onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div style={{ padding: '20px 30px', borderBottom: '1px solid #e0e0e0' }}>
                  <input
                    type="text"
                    placeholder="🔍 Search items by name or code..."
                    value={stockSearchTerm}
                    onChange={(e) => setStockSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      fontSize: '1rem',
                      border: '2px solid #e0e0e0',
                      borderRadius: '10px',
                      outline: 'none',
                      transition: 'border-color 0.3s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                  />
                </div>

                {/* Stock Items List */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '20px 30px'
                }}>
                  {stockDialogItems.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '60px 20px',
                      color: '#999'
                    }}>
                      <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📭</div>
                      <h4 style={{ color: '#666', marginBottom: '10px' }}>No Stock Available</h4>
                      <p style={{ color: '#999' }}>This godown currently has no items in stock.</p>
                    </div>
                  ) : (
                    <>
                      <div style={{
                        marginBottom: '15px',
                        padding: '10px 15px',
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontWeight: 'bold', color: '#333' }}>
                          Total Items: {stockDialogItems.filter(item =>
                            !stockSearchTerm ||
                            item.inputValue?.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
                            item.itemName?.toLowerCase().includes(stockSearchTerm.toLowerCase())
                          ).length}
                        </span>
                        <span style={{ color: '#666', fontSize: '0.9rem' }}>
                          {stockDialogItems.length} items in stock
                        </span>
                      </div>

                      <div style={{ display: 'grid', gap: '12px' }}>
                        {stockDialogItems
                          .filter(item =>
                            !stockSearchTerm ||
                            item.inputValue?.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
                            item.itemName?.toLowerCase().includes(stockSearchTerm.toLowerCase())
                          )
                          .map((item, index) => (
                            <div
                              key={index}
                              style={{
                                padding: '15px 20px',
                                border: '1px solid #e0e0e0',
                                borderRadius: '10px',
                                background: 'white',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{
                                    fontSize: '1.1rem',
                                    fontWeight: 'bold',
                                    color: '#333',
                                    marginBottom: '5px'
                                  }}>
                                    {item.inputValue || item.itemName || 'Unknown Item'}
                                  </div>
                                  {item.itemName && item.inputValue && (
                                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                                      {item.itemName}
                                    </div>
                                  )}
                                  <div style={{
                                    fontSize: '0.85rem',
                                    color: '#999',
                                    marginTop: '5px'
                                  }}>
                                    Added: {item.addedAt ? new Date(item.addedAt).toLocaleDateString() : 'N/A'}
                                  </div>
                                </div>
                                <div style={{
                                  padding: '8px 16px',
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  color: 'white',
                                  borderRadius: '20px',
                                  fontWeight: 'bold',
                                  fontSize: '0.9rem'
                                }}>
                                  In Stock
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>

                      {stockDialogItems.filter(item =>
                        !stockSearchTerm ||
                        item.inputValue?.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
                        item.itemName?.toLowerCase().includes(stockSearchTerm.toLowerCase())
                      ).length === 0 && stockSearchTerm && (
                          <div style={{
                            textAlign: 'center',
                            padding: '40px 20px',
                            color: '#999'
                          }}>
                            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🔍</div>
                            <p>No items found matching "{stockSearchTerm}"</p>
                          </div>
                        )}
                    </>
                  )}
                </div>
              </div>

              {/* Dialog Footer */}
              <div style={{
                padding: '15px 30px',
                borderTop: '1px solid #e0e0e0',
                background: '#f8f9fa',
                display: 'flex',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => setShowStockDialog(false)}
                  style={{
                    padding: '10px 30px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Ledger Management Buttons - Always visible on main page */}
          <div className="card mb-4" style={cardStyle}>
            <div className="card-header">
              <h5>💼 Customer Management</h5>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {selectedCustomer && (
                  <button
                    onClick={() => setShowCustomerHistory(true)}
                    className="btn"
                    style={{
                      background: 'linear-gradient(135deg, #9900ef 0%, #7700cc 100%)',
                      color: 'white',
                      padding: '14px 28px',
                      fontSize: '15px',
                      fontWeight: '600'
                    }}
                  >
                    📜 View Customer History
                  </button>
                )}

                <button
                  onClick={() => setShowLedgerManagement(true)}
                  className="btn"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: 'white',
                    padding: '14px 28px',
                    fontSize: '15px',
                    fontWeight: '600'
                  }}
                >
                  💰 Manage Ledger & Payments
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer History Modal - Outside main container */}
      {showCustomerHistory && (
        <CustomerHistory
          customerId={selectedCustomer}
          onClose={() => setShowCustomerHistory(false)}
        />
      )}

      {/* Ledger Management Modal - Outside main container */}
      {showLedgerManagement && (
        <LedgerManagement
          customerId={selectedCustomer}
          customerName={customers.find(c => c._id === selectedCustomer)?.name || ''}
          onClose={() => setShowLedgerManagement(false)}
        />
      )}
    </div>
  );
}

export default Billing;