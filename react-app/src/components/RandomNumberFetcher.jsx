import { useEffect, useState } from 'react';

const API_URL = '/api/random';

export default function RandomNumberFetcher() {
  const [number, setNumber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchNumber = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(API_URL);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        if (isMounted) {
          setNumber(data.number);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchNumber();
    const interval = setInterval(fetchNumber, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div>
      <p>API URL: <code>{API_URL}</code></p>
      {loading ? (
        <p>Загрузка...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>Ошибка: {error}</p>
      ) : (
        <p style={{ fontSize: 32, fontWeight: 'bold' }}>{number}</p>
      )}
    </div>
  );
}
