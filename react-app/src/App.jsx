import natureBanner from './assets/nature-banner.png';
import RandomNumberFetcher from './components/RandomNumberFetcher';

function App() {
  return (
    <main className="page-shell">
      <section className="nature-banner" aria-labelledby="nature-banner-title">
        <img
          className="nature-banner__image"
          src={natureBanner}
          alt="Горное озеро в окружении хвойного леса на рассвете"
        />
        <div className="nature-banner__overlay" />
        <div className="nature-banner__content">
          <span className="nature-banner__eyebrow">Ближе к природе</span>
          <h1 id="nature-banner-title">Вдохни спокойствие</h1>
          <p>Горы, лес и чистый воздух — небольшая пауза посреди насыщенного дня.</p>
        </div>
      </section>

      <section className="api-card">
        <h2>Random Number API</h2>
        <RandomNumberFetcher />
      </section>
    </main>
  );
}

export default App;
