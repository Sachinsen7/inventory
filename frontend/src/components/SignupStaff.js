import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { showToast } from "../utils/toastNotifications";

const SignupStaff = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [users, setUsers] = useState([]);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    
    // Change password modal states
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        fetchUsers();

        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchUsers = async () => {
        try {
            // Get token from localStorage - try both 'authToken' and 'token'
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            
            console.log('Token found:', token ? 'Yes' : 'No');
            
            const config = token ? {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            } : {};
            
            const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users`, config);
            setUsers(response.data);
            console.log('Users fetched successfully:', response.data.length);
        } catch (err) {
            console.error("Error fetching users", err);
            const errorMsg = err.response?.data?.message || err.message || 'Error fetching users';
            
            // Don't show error toast if it's just an auth issue - users list is optional
            if (err.response?.status === 401 || err.response?.status === 403) {
                console.log('User list requires authentication. Skipping...');
                setUsers([]);
            } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
                showToast.error('Connection timeout. Please check your internet connection.');
            } else if (err.response) {
                showToast.error(`Backend error: ${err.response.status} - ${errorMsg}`);
            } else if (err.request) {
                showToast.error('Unable to connect to the server. Please check if the backend is running.');
            } else {
                showToast.error(errorMsg);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/auth/signup`, {
                username,
                email,
                password,
            });
            showToast.success('Signup successful');
            fetchUsers();
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || 'Error during signup';
            setError(errorMsg);
            if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
                showToast.error('Connection timeout. Please check your internet connection.');
            } else if (err.response) {
                showToast.error(`Signup failed: ${errorMsg}`);
            } else if (err.request) {
                showToast.error('Unable to connect to the server. Please check if the backend is running.');
            } else {
                showToast.error(errorMsg);
            }
        }
    };

    const handleDelete = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) {
            return;
        }
        
        try {
            // Get token from localStorage - try both 'authToken' and 'token'
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            
            const config = token ? {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            } : {};
            
            await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/users/${userId}`, config);
            showToast.success('User deleted successfully');
            fetchUsers();
        } catch (err) {
            console.error("Error deleting user", err);
            const errorMsg = err.response?.data?.message || err.message || 'Error deleting user';
            if (err.response?.status === 401 || err.response?.status === 403) {
                showToast.error('You need admin privileges to delete users');
            } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
                showToast.error('Connection timeout. Please check your internet connection.');
            } else if (err.response) {
                showToast.error(`Delete failed: ${errorMsg}`);
            } else if (err.request) {
                showToast.error('Unable to connect to the server. Please check if the backend is running.');
            } else {
                showToast.error(errorMsg);
            }
        }
    };

    const openPasswordModal = (user) => {
        setSelectedUser(user);
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordModal(true);
    };

    const closePasswordModal = () => {
        setShowPasswordModal(false);
        setSelectedUser(null);
        setNewPassword('');
        setConfirmPassword('');
    };

    const handleChangePassword = async () => {
        if (!newPassword || !confirmPassword) {
            showToast.error('Please fill in both password fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast.error('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            showToast.error('Password must be at least 6 characters long');
            return;
        }

        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            
            const config = token ? {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            } : {};

            await axios.put(
                `${process.env.REACT_APP_BACKEND_URL}/api/users/${selectedUser._id}/password`,
                { password: newPassword },
                config
            );

            showToast.success('Password changed successfully');
            closePasswordModal();
        } catch (err) {
            console.error("Error changing password", err);
            const errorMsg = err.response?.data?.message || err.message || 'Error changing password';
            if (err.response?.status === 401 || err.response?.status === 403) {
                showToast.error('You need admin privileges to change passwords');
            } else if (err.response?.status === 404) {
                showToast.error('Password change endpoint not available. Please contact administrator.');
            } else {
                showToast.error(`Failed to change password: ${errorMsg}`);
            }
        }
    };

    const styles = {
        container: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            minHeight: '100vh',
            padding: '40px 20px',
            background: 'linear-gradient(-45deg, #fcb900, #9900ef, #ff6900, #00ff07)',
            backgroundSize: '400% 400%',
            animation: 'gradient 15s ease infinite',
            flexDirection: windowWidth <= 600 ? 'column' : 'row',
            overflowY: 'auto',
        },
        formContainer: {
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            padding: '25px',
            borderRadius: '12px',
            backgroundColor: 'rgba(218, 216, 224, 0.6)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            animation: 'fadeIn 1s ease',
            margin: windowWidth <= 600 ? '0' : '20px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
        },
        header: {
            textAlign: 'center',
            marginBottom: '20px',
            fontFamily: "'Poppins', sans-serif",
            fontWeight: '600',
            fontSize: '29px',
            color:'white',
        },
        formGroup: {
            marginBottom: '15px',
        },
        label: {
            display: 'block',
            fontWeight: 'bold',
            marginBottom: '5px',
            fontFamily: "'Roboto', sans-serif",
            color: 'white',
            fontSize:'20px',
        },
        input: {
            width: '94%',
            padding: '12px',
            border: '1px solid #ccc',
            borderRadius: '18px',
            fontSize: '16px',
            fontFamily: "'Roboto', sans-serif",
            transition: 'box-shadow 0.3s ease',
        },
        inputFocus: {
            boxShadow: '0 0 8px rgba(0, 128, 255, 0.5)',
        },
        button: {
            width: '100%',
            padding: '12px',
            backgroundColor: 'rgba(218, 216, 224, 0.8)',
            color: 'white',
            border: 'none',
            borderRadius: '28px',
            fontSize: '20px',
            fontFamily: "'Roboto', sans-serif",
            cursor: 'pointer',
            transition: 'background-color 0.3s ease, transform 0.2s ease',
        },
        buttonHover: {
            backgroundColor: 'rgba(218, 216, 224, 0.8)',
        },
        buttonActive: {
            transform: 'scale(0.98)',
        },
        error: {
            color: 'red',
            fontSize: '14px',
            marginTop: '10px',
            textAlign: 'center',
        },
        userListContainer: {
            marginTop: '20px',
            maxHeight: '300px',
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingRight: '5px',
        },
        userList: {
            listStyleType: 'none',
            padding: 0,
            margin: 0,
            width: '100%',
        },
        userItem: {
            marginBottom: '10px',
            padding: '12px 15px',
            backgroundColor: '#f9f9f9',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: "'Roboto', sans-serif",
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s ease',
        },
        userItemButton: {
            padding: '8px 16px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'all 0.3s ease',
            marginLeft: '5px',
            flexShrink: 0,
        },
        changePasswordButton: {
            padding: '8px 16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'all 0.3s ease',
            marginLeft: '5px',
            flexShrink: 0,
        },
    };

    return (
        <div style={styles.container}>
            <style>{`
                @keyframes gradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                /* Custom Scrollbar Styling */
                .user-list-scrollable::-webkit-scrollbar {
                    width: 8px;
                }
                .user-list-scrollable::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .user-list-scrollable::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.5);
                    border-radius: 10px;
                }
                .user-list-scrollable::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.7);
                }
            `}</style>
            <div style={styles.formContainer}>
                <h2 style={styles.header}>Signup</h2>
                <form onSubmit={handleSubmit}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Username:</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={styles.input}
                            onFocus={(e) => (e.target.style.boxShadow = styles.inputFocus.boxShadow)}
                            onBlur={(e) => (e.target.style.boxShadow = 'none')}
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Email:</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={styles.input}
                            onFocus={(e) => (e.target.style.boxShadow = styles.inputFocus.boxShadow)}
                            onBlur={(e) => (e.target.style.boxShadow = 'none')}
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Password:</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={styles.input}
                            onFocus={(e) => (e.target.style.boxShadow = styles.inputFocus.boxShadow)}
                            onBlur={(e) => (e.target.style.boxShadow = 'none')}
                        />
                    </div>
                    {error && <p style={styles.error}>{error}</p>}
                    <button
                        type="submit"
                        style={styles.button}
                        onMouseOver={(e) => (e.target.style.backgroundColor = styles.buttonHover.backgroundColor)}
                        onMouseOut={(e) => (e.target.style.backgroundColor = styles.button.backgroundColor)}
                        onMouseDown={(e) => (e.target.style.transform = styles.buttonActive.transform)}
                        onMouseUp={(e) => (e.target.style.transform = 'scale(1)')}
                    >
                        Signup
                    </button>
                </form>

                <h3 style={styles.header}>User List ({users.length})</h3>
                {users.length > 0 ? (
                    <div style={styles.userListContainer} className="user-list-scrollable">
                        <ul style={styles.userList}>
                            {users.map((user) => (
                                <li key={user._id} style={styles.userItem}>
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 'bold', color: '#333' }}>{user.username}</div>
                                        <div style={{ fontSize: '12px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {user.email}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        <button 
                                            onClick={() => openPasswordModal(user)} 
                                            style={styles.changePasswordButton}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = '#1976D2'}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = '#2196F3'}
                                        >
                                            Change Password
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(user._id)} 
                                            style={styles.userItemButton}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = '#d32f2f'}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = '#f44336'}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <div style={{
                        textAlign: 'center',
                        padding: '20px',
                        color: 'white',
                        fontSize: '14px',
                        opacity: 0.8
                    }}>
                        <p>No users to display or you need admin access to view users.</p>
                        <p style={{ fontSize: '12px', marginTop: '10px' }}>
                            Login as admin to manage users.
                        </p>
                    </div>
                )}
            </div>

            {/* Change Password Modal */}
            {showPasswordModal && (
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
                    }}
                    onClick={closePasswordModal}
                >
                    <div 
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '15px',
                            padding: '30px',
                            maxWidth: '400px',
                            width: '90%',
                            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ 
                            margin: '0 0 20px 0', 
                            color: '#333',
                            fontSize: '1.5rem',
                            textAlign: 'center'
                        }}>
                            Change Password
                        </h3>
                        
                        <div style={{ marginBottom: '15px' }}>
                            <p style={{ 
                                margin: '0 0 15px 0', 
                                color: '#666',
                                fontSize: '0.9rem',
                                textAlign: 'center'
                            }}>
                                Changing password for: <strong>{selectedUser?.username}</strong>
                            </p>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '5px', 
                                color: '#333',
                                fontWeight: 'bold'
                            }}>
                                New Password:
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                style={{
                                    width: '93%',
                                    padding: '10px',
                                    border: '2px solid #ddd',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    outline: 'none',
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#2196F3'}
                                onBlur={(e) => e.target.style.borderColor = '#ddd'}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '5px', 
                                color: '#333',
                                fontWeight: 'bold'
                            }}>
                                Confirm Password:
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                style={{
                                    width: '93%',
                                    padding: '10px',
                                    border: '2px solid #ddd',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    outline: 'none',
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#2196F3'}
                                onBlur={(e) => e.target.style.borderColor = '#ddd'}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={closePasswordModal}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#9e9e9e',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#757575'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#9e9e9e'}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleChangePassword}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#2196F3',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#1976D2'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#2196F3'}
                            >
                                Change Password
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SignupStaff;
