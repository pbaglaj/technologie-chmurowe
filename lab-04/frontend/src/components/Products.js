import React, { useState, useEffect } from 'react';

function Products() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');

  const fetchItems = () => {
    fetch('/api/items')
      .then(res => res.json())
      .then(data => setItems(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    }).then(() => {
      setName('');
      fetchItems();
    });
  };

  return (
    <div>
      <h2>Lista Produktów</h2>
      <ul>
        {items.map(item => <li key={item.id}>{item.name}</li>)}
      </ul>
      <form onSubmit={handleSubmit}>
        <input 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="Nowy produkt" 
          required 
        />
        <button type="submit">Dodaj</button>
      </form>
    </div>
  );
}

export default Products;