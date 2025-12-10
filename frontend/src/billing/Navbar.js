import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const closeMobileMenu = () => setIsOpen(false);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/billing" className="navbar-logo" onClick={closeMobileMenu}>
          Bill App
        </Link>
        <div className="menu-icon" onClick={() => setIsOpen(!isOpen)}>
          {/* Using simple icons to avoid dependencies */}
          {isOpen ? '✖' : '☰'}
        </div>
        <ul className={isOpen ? 'nav-menu active' : 'nav-menu'}>
          <li className="nav-item">
            <Link to="/billing/customers-list" className="nav-links" onClick={closeMobileMenu}>
              Customers
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/billing" className="nav-links" onClick={closeMobileMenu}>
              Billing
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/gstr2" className="nav-links" onClick={closeMobileMenu}>
              📊 GSTR-2
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/vouchers" className="nav-links" onClick={closeMobileMenu}>
              📋 Vouchers
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/reports" className="nav-links" onClick={closeMobileMenu}>
              📊 Reports
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/gst" className="nav-links" onClick={closeMobileMenu}>
              🧾 GST
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/tds" className="nav-links" onClick={closeMobileMenu}>
              💼 TDS
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/settings" className="nav-links" onClick={closeMobileMenu}>
              ⚙️ Settings
            </Link>
          </li>
          {/* <li className="nav-item">
            <Link to="/eway-dashboard" className="nav-links" onClick={closeMobileMenu}>
              🚛 E-Way Dashboard
            </Link>
          </li> */}
        </ul>
      </div>
    </nav>
  );
}

export default Navbar; 