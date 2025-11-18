import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../utils/toastNotifications';

function Sale() {
  const [godowns, setGodowns] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch data from backend API using the environment variable
    axios
      .get(`${process.env.REACT_APP_BACKEND_URL}/api/godowns`)
      .then((response) => {
        setGodowns(response.data);
        if (response.data.length === 0) {
          showToast.info('No godowns available');
        }
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
        const errorMsg = error.response?.data?.message || error.message || 'Error fetching godowns';
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

  const handleClick = (godown) => {
    // Navigate to the GodownDetail component and pass the godown data
    navigate('/dsale', { state: { godown } });
  };

  return (
    <div style={styles.container}>
      <style>{globalStyles}</style>
      {godowns.map((godown, index) => (
        <div key={index} style={styles.godownCard}>
          <h3 style={styles.cardTitle}>{godown.name}</h3>
          <p style={styles.cardDescription}>{godown.address}</p>
          <button onClick={() => handleClick(godown)} style={styles.button}>
            View Details
          </button>
        </div>
      ))}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '20px',
    background: 'linear-gradient(-45deg, #fcb900, #9900ef, #ff6900, #00ff07)',
    backgroundSize: '400% 400%',
    animation: 'gradientAnimation 12s ease infinite',
  },
  godownCard: {
    width: '300px',
    padding: '20px',
    margin: '15px',
    borderRadius: '25px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
    backgroundColor: 'rgba(218, 216, 224, 0.6)',
     backgroundSize: '150% 150%',
    animation: 'cardBackgroundAnimation 6s infinite',
    textAlign: 'center',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    cursor: 'pointer',
  },
  cardTitle: {
    fontSize: '1.5rem',
    color: 'white',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  cardDescription: {
    color: 'white',
    marginBottom: '20px',
    fontSize: '1.6rem',
  },
  button: {
    padding: '12px 18px',
    backgroundColor: 'rgba(218, 216, 224, 0.8)',
    color: 'white',
    border: 'none',
    borderRadius: '25px',
    cursor: 'pointer',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    transition: 'background-color 0.3s ease, transform 0.2s ease',
  },
};

// Adding CSS keyframes for animations
const styleSheet = document.styleSheets[0];

// Background animation keyframes
const backgroundKeyframes = `
  @keyframes backgroundAnimation {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
`;

// Card background animation keyframes
const cardBackgroundKeyframes = `
  @keyframes cardBackgroundAnimation {
    0% { background-position: 0% 0%; }
    50% { background-position: 100% 100%; }
    100% { background-position: 0% 0%; }
  }
`;


const globalStyles = `
@keyframes gradientAnimation {
  0% { background-position: 0% 50%; }
  25% { background-position: 50% 100%; }
  50% { background-position: 100% 50%; }
  75% { background-position: 50% 0%; }
  100% { background-position: 0% 50%; }
}
`;

// Insert keyframes into the stylesheet
styleSheet.insertRule(backgroundKeyframes, styleSheet.cssRules.length);
styleSheet.insertRule(cardBackgroundKeyframes, styleSheet.cssRules.length);

export default Sale;
