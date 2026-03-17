import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './components/Home';
import Products from './components/Products';
import Stats from './components/Stats';

function App() {
  return (
    <Router>
      <nav style={{ padding: '10px', background: '#eee', marginBottom: '20px' }}>
        <Link to="/" style={{ marginRight: '15px' }}>Strona Główna</Link>
        <Link to="/products" style={{ marginRight: '15px' }}>Produkty</Link>
        <Link to="/stats">Statystyki</Link>
      </nav>
      <div style={{ padding: '20px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/stats" element={<Stats />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;