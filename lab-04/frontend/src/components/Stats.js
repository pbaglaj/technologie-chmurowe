import React, { useState, useEffect } from 'react';

function Stats() {
  const [stats, setStats] = useState({ count: 0, instanceId: 'Ładowanie...' });

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h2>Statystyki Systemu</h2>
      <p><strong>Liczba produktów:</strong> {stats.count}</p>
      <p><strong>ID Instancji Backendu:</strong> {stats.instanceId}</p>
    </div>
  );
}

export default Stats;