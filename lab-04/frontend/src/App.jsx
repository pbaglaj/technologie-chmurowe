import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

const Home = () => <h2>Strona Główna Dashboardu</h2>;

const Products = () => {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');

  const fetchItems = () => fetch('/api/items').then(r => r.json()).then(setItems);
  
  useEffect(() => { fetchItems(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    setName('');
    fetchItems();
  };

  return (
    <div>
      <h2>Lista Produktów</h2>
      <form onSubmit={handleSubmit}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nazwa produktu" required />
        <button type="submit">Dodaj</button>
      </form>
      <ul>{items.map(item => <li key={item.id}>{item.name}</li>)}</ul>
    </div>
  );
};

const Stats = () => {
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats);
  }, []);

  return (
    <div>
      <h2>Statystyki</h2>
      <p>Liczba produktów: {stats.count ?? '...'}</p>
      <p>Obsłużone przez instancję: {stats.instanceId ?? '...'}</p>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Home</Link> | <Link to="/products">Produkty</Link> | <Link to="/stats">Statystyki</Link>
      </nav>
      <hr />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/stats" element={<Stats />} />
      </Routes>
    </BrowserRouter>
  );
}