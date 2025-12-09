import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in (from localStorage or session)
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) {
                console.error('Error parsing stored user:', error);
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    const login = (userData) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    const hasPermission = (permission) => {
        if (!user || !user.permissions) {
            // If no user or permissions, assume admin (for backward compatibility)
            return true;
        }
        return user.permissions[permission] === true;
    };

    const value = {
        user,
        loading,
        login,
        logout,
        hasPermission,
        isAdmin: user?.role === 'admin',
        isSalesOfficer: user?.role === 'sales_officer',
        isStoreManager: user?.role === 'store_manager',
        isAccountant: user?.role === 'accountant'
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
