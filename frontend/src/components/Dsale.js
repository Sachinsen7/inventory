import React, { useState, useEffect, useRef } from "react";
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { showToast } from "../utils/toastNotifications";

const Dsale = () => {
  const [message, setMessage] = useState('');
  const location = useLocation();
  const godown = location.state ? location.state.godown : null;
  const displayedGodownName = godown ? godown.name : "";

  const [inputValue, setInputValue] = useState("");
  const [username, setUsername] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [godownNames, setGodownNames] = useState([]);
  const inputRef = useRef(null);

  // Backend URL from environment variable
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    axios
      .get(`${backendUrl}/api/products3`)
      .then((response) => {
        const fetchedGodownNames = Array.from(
          new Set(response.data.map((item) => item.godownName).filter(Boolean))
        );
        setGodownNames(fetchedGodownNames);
        console.log("Fetched godown names:", fetchedGodownNames);
        console.log("Current godown name:", displayedGodownName);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        const errorMsg = error.response?.data?.message || error.message || 'Error fetching products';
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

  const isGodownNameMatched = () => {
    // If no godown names are loaded yet, allow it (data might be loading)
    if (godownNames.length === 0) {
      return true;
    }
    // Check if godown name matches (case-insensitive, trimmed)
    return godownNames.some(name => 
      name && name.trim().toLowerCase() === displayedGodownName.trim().toLowerCase()
    );
  };

  // Auto-check and save on input change (only when started)
  useEffect(() => {
    if (!isStarted || inputValue.trim() === "" || username.trim() === "" || mobileNumber.trim() === "") return;
    const timer = setTimeout(async () => {
      // Note: We allow saving even if godown name doesn't match in local check
      // The backend will handle validation
      
      setIsSaving(true);
      setMessage("");
      try {
        await axios.post(`${backendUrl}/api/save/delevery1`, {
          selectedOption: "default",
          inputValue: inputValue.trim(),
          username: username.trim(),
          mobileNumber: mobileNumber.trim(),
          godownName: displayedGodownName,
        });
        setMessage("Data saved successfully!");
        showToast.success("Data saved successfully!");
        setInputValue("");
        setUsername("");
        setMobileNumber("");
        // Focus the input field after clearing
        if (inputRef.current) inputRef.current.focus();
      } catch (error) {
        const errorMsg = error.response?.data?.message || error.message || 'Error saving data';
        setMessage("Error saving data.");
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
      setIsSaving(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [inputValue, username, mobileNumber, isStarted, displayedGodownName]);

  // Always focus input after clearing (for fast repeated entry)
  useEffect(() => {
    if (isStarted && inputValue === "" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputValue, isStarted]);

  // Start auto-save
  const handleStart = () => {
    // Check if godown name matches, but allow if no data exists yet
    if (godownNames.length > 0 && !isGodownNameMatched()) {
      // Show warning but still allow - backend will validate
      showToast.warning(`Warning: Godown name "${displayedGodownName}" may not match existing records. Data will still be saved.`);
    }
    setIsStarted(true);
    setMessage("Auto-saving is active. Fill all fields and they will be saved automatically after 1.5 seconds.");
    showToast.info("Auto-save started! Fill all fields and they will be saved automatically.");
    // Focus the input field when auto-save starts
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 100);
  };

  // Stop auto-save
  const handleStop = () => {
    setIsStarted(false);
    setMessage("Auto-saving stopped. Click 'Start Auto-save' to enable automatic saving.");
    showToast.info("Auto-save stopped. You can still type, but values won't be saved automatically.");
  };

  return (
    <div style={styles.container}>
      <style>{globalStyles}</style>
      <h2 style={styles.header}>Sale Page</h2>
      {godown ? (
        <div style={styles.godownDetails}>
          <h3 style={styles.godownHeader}>Godown Details</h3>
          <p style={styles.godownText}><strong>Name:</strong> {displayedGodownName}</p>
          <p style={styles.godownText}><strong>Address:</strong> {godown.address}</p>
          
          {!isStarted && (
            <div style={{color: '#ffeb3b', fontWeight: 'bold', margin: '10px 0', fontSize: '1rem', backgroundColor: 'rgba(255, 235, 59, 0.2)', padding: '10px', borderRadius: '8px'}}>
              ⚠️ Click "Start Auto-save" to enable automatic saving of values
            </div>
          )}
          
          <input
            ref={inputRef}
            type="text"
            placeholder="Enter value"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            style={styles.input}
            disabled={isSaving}
          />

          <input
            type="text"
            placeholder="Enter Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
            disabled={isSaving}
          />

          <input
            type="text"
            placeholder="Enter Mobile Number"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            style={styles.input}
            disabled={isSaving}
          />

          <button
            style={isStarted ? styles.buttonDisabled : styles.button}
            onClick={handleStart}
            disabled={isStarted}
          >
            {isStarted ? "Auto-saving Active" : "Start Auto-save"}
          </button>

          <button
            style={!isStarted ? styles.buttonDisabled : styles.button}
            onClick={handleStop}
            disabled={!isStarted}
          >
            Stop
          </button>
          
          {message && <div style={styles.message}>{message}</div>}
        </div>
      ) : (
        <p style={styles.errorText}>No Godown Data Available</p>
      )}
    </div>
  );
};

const globalStyles = `
@keyframes gradientAnimation {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
`;

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(-45deg, #fcb900, #9900ef, #ff6900, #00ff07)',
    backgroundSize: '400% 400%',
    animation: 'gradientAnimation 10s ease infinite',
    padding: '20px',
    color:'white',
    fontSize:'20px',
  },
  header: {
    color: '#fff',
    fontSize: '3rem',
    marginBottom: '20px',
    textAlign: 'center',
  },
  godownDetails: {
    backgroundColor: 'rgba(218, 216, 224, 0.7)',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    width: '90%',
    maxWidth: '600px',
  },
  godownHeader: {
    color: '#fff',
    fontSize: '1.5rem',
    marginBottom: '10px',
  },
  godownText: {
    color: '#fff',
    fontSize: '1.1rem',
    marginBottom: '5px',
  },
  input: {
    padding: '12px',
    width: '90%',
    margin: '10px 0',
    border: '1px solid #ccc',
    borderRadius: '20px',
    fontSize: '1rem',
    backgroundColor: 'rgba(218, 216, 224, 0.6)',
  },
  button: {
    backgroundColor: 'rgba(218, 216, 224, 0.6)',
    color: '#fff',
    padding: '10px 20px',
    margin: '10px',
    border: 'none',
    borderRadius: '25px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.3s ease',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(180, 180, 190, 0.95)',
    color: '#fff',
    padding: '10px 20px',
    margin: '10px',
    border: 'none',
    borderRadius: '25px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'not-allowed',
  },
  errorText: {
    color: 'red',
    fontSize: '1.2rem',
    fontWeight: 'bold',
  },
  message: {
    color: 'black',
    fontWeight: 'bold',
    margin: '10px 0',
    fontSize: '1.1rem',
  },
};

export default Dsale;
