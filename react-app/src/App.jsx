import RandomNumberFetcher from './components/RandomNumberFetcher';

function App() {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <div style={{ width: '100%', maxWidth: 440, padding: 24, background: '#fff', borderRadius: 12, boxShadow: '0 12px 30px rgba(0,0,0,0.08)' }}>
        <h1 style={{ marginBottom: 16, fontSize: 24 }}>Random Number API</h1>
        <RandomNumberFetcher />
      </div>
    </div>
  );
}

export default App;
