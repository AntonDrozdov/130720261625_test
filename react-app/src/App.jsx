import { useEffect, useState } from 'react';

const advantageItems = [
  {
    image: '/api/images/individual-approach',
    eyebrow: 'Работаем вместе с вами',
    title: 'Индивидуальный подход',
    description: 'Учитываем особенности участка, ваши задачи и пожелания — от первой идеи до готового изделия.',
    alt: 'Специалист обсуждает с заказчиком материалы и проект садовой мебели',
  },
  {
    image: '/api/images/quality-control',
    eyebrow: 'Надёжность в деталях',
    title: 'Контроль качества',
    description: 'Проверяем геометрию, сварные соединения и финишную обработку на каждом этапе производства.',
    alt: 'Специалист проверяет качество металлического каркаса и деревянных деталей кресла',
  },
  {
    image: '/api/images/product-design',
    eyebrow: 'От идеи до чертежа',
    title: 'Проектирование',
    description: 'Разрабатываем конструкцию, подбираем материалы и заранее продумываем удобство будущего изделия.',
    alt: 'Промышленный дизайнер создаёт проект мебели в студии',
  },
  {
    image: '/api/images/professional-equipment',
    eyebrow: 'Точность производства',
    title: 'Профессиональное оборудование',
    description: 'Используем современные станки и технологии для точной обработки металла и стабильного результата.',
    alt: 'Оператор работает на современном станке для лазерной резки металла',
  },
  {
    image: '/api/images/mwcraft-collection',
    eyebrow: 'MetallWoodCraft',
    title: 'Создаём пространство для отдыха',
    description: 'Костровые чаши, мангалы, садовая мебель и качели в едином стиле — от проекта до готового изделия.',
    alt: 'Коллекция MWCraft: костровая чаша, мангал, садовая мебель и качели',
  },
];

const advantages = [advantageItems.at(-1), ...advantageItems.slice(0, -1)];

const categories = [
  {
    number: '01',
    title: 'Костровые чаши',
    description: 'Стальные чаши для уютных вечеров у живого огня.',
    accent: 'fire',
  },
  {
    number: '02',
    title: 'Мангалы',
    description: 'Надёжные модели для приготовления на открытом воздухе.',
    accent: 'grill',
  },
  {
    number: '03',
    title: 'Садовая мебель',
    description: 'Комплекты из металла и дерева для террасы и сада.',
    accent: 'furniture',
  },
  {
    number: '04',
    title: 'Качели',
    description: 'Комфортное место для отдыха в тени вашего сада.',
    accent: 'swing',
  },
];

function App() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (isPaused) return undefined;

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % advantages.length);
    }, 3000);

    return () => window.clearInterval(timer);
  }, [isPaused]);

  const showSlide = (index) => {
    setActiveSlide((index + advantages.length) % advantages.length);
  };

  return (
    <main className="page-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="MWCraft — на главную">
          <span className="brand__mark" aria-hidden="true"><i>M</i><i>W</i></span>
          <span className="brand__name"><strong>MWCraft</strong><small>MetallWoodCraft</small></span>
        </a>
        <div className="site-header__actions">
          <a className="header-phone" href="tel:+78005552401">+7 (800) 555-24-01</a>
          <a className="header-button" href="#order">Оставить заявку</a>
        </div>
      </header>

      <h1 className="sr-only">Изделия из металла и дерева на заказ: садовая мебель, мангалы, костровые чаши и качели MWCraft</h1>

      <section
        className="nature-banner"
        id="top"
        aria-roledescription="карусель"
        aria-label="Преимущества работы с нами"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false);
        }}
      >
        {advantages.map((slide, index) => (
          <img
            className={`nature-banner__image${index === activeSlide ? ' nature-banner__image--active' : ''}`}
            src={slide.image}
            alt={index === activeSlide ? slide.alt : ''}
            loading={index === 0 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'low'}
            decoding="async"
            aria-hidden={index !== activeSlide}
            key={slide.title}
          />
        ))}
        <div className="nature-banner__overlay" />
        <div className="nature-banner__content" aria-live="polite">
          <span className="nature-banner__eyebrow">{advantages[activeSlide].eyebrow}</span>
          <h2>{advantages[activeSlide].title}</h2>
          <p>{advantages[activeSlide].description}</p>
          <a className="nature-banner__link" href="#catalog">Смотреть каталог <span aria-hidden="true">→</span></a>
        </div>

        <div className="carousel-controls">
          <button type="button" onClick={() => showSlide(activeSlide - 1)} aria-label="Предыдущий слайд">←</button>
          <div className="carousel-dots" role="group" aria-label="Выбор слайда">
            {advantages.map((slide, index) => (
              <button
                type="button"
                className={index === activeSlide ? 'is-active' : ''}
                onClick={() => showSlide(index)}
                aria-label={`Слайд ${index + 1}: ${slide.title}`}
                aria-current={index === activeSlide ? 'true' : undefined}
                key={slide.title}
              />
            ))}
          </div>
          <button type="button" onClick={() => showSlide(activeSlide + 1)} aria-label="Следующий слайд">→</button>
        </div>
      </section>

      <section className="catalog" id="catalog" aria-labelledby="catalog-title">
        <div className="catalog__heading">
          <div>
            <span className="section-label">Наш ассортимент</span>
            <h2 id="catalog-title">Всё для отдыха на участке</h2>
          </div>
          <p>Практичные вещи, которые делают пространство вокруг дома комфортнее.</p>
        </div>

        <div className="category-grid">
          {categories.map((category) => (
            <article className={`category-card category-card--${category.accent}`} key={category.title}>
              <span className="category-card__number">{category.number}</span>
              <div className="category-card__content">
                <h3>{category.title}</h3>
                <p>{category.description}</p>
              </div>
              <span className="category-card__arrow" aria-hidden="true">↗</span>
            </article>
          ))}
        </div>
      </section>

      <section className="order-section" id="order" aria-labelledby="order-title">
        <div className="order-section__intro">
          <span className="section-label">Обсудим ваш проект</span>
          <h2 id="order-title">Создадим изделие специально для вас</h2>
          <p>Расскажите, что вам нужно. Мы уточним детали, предложим конструкцию и подготовим предварительный расчёт.</p>
          <a href="tel:+78005552401">+7 (800) 555-24-01</a>
        </div>

        {isSubmitted ? (
          <div className="order-success" role="status">
            <span aria-hidden="true">✓</span>
            <h3>Заявка принята</h3>
            <p>Спасибо! Мы свяжемся с вами в ближайшее рабочее время.</p>
            <button type="button" onClick={() => setIsSubmitted(false)}>Отправить ещё одну</button>
          </div>
        ) : (
          <form className="order-form" onSubmit={(event) => { event.preventDefault(); setIsSubmitted(true); }}>
            <label>
              <span>Ваше имя</span>
              <input name="name" type="text" autoComplete="name" placeholder="Как к вам обращаться" required />
            </label>
            <label>
              <span>Телефон</span>
              <input name="phone" type="tel" autoComplete="tel" placeholder="+7 (___) ___-__-__" required />
            </label>
            <label className="form-wide">
              <span>Что вас интересует</span>
              <select name="product" defaultValue="" required>
                <option value="" disabled>Выберите категорию</option>
                <option>Костровая чаша</option>
                <option>Мангал</option>
                <option>Садовая мебель</option>
                <option>Садовые качели</option>
                <option>Индивидуальный проект</option>
              </select>
            </label>
            <label className="form-wide">
              <span>Комментарий</span>
              <textarea name="message" rows="4" placeholder="Размеры, материалы, количество или другие пожелания" />
            </label>
            <label className="form-consent form-wide">
              <input name="consent" type="checkbox" required />
              <span>Согласен на обработку персональных данных</span>
            </label>
            <button className="form-submit form-wide" type="submit">Отправить заявку <span aria-hidden="true">→</span></button>
          </form>
        )}
      </section>

      <section className="seo-intro" aria-labelledby="production-title">
        <span className="section-label">Собственное производство MWCraft</span>
        <h2 id="production-title">Металлические изделия для сада по индивидуальному проекту</h2>
        <div className="seo-intro__text">
          <p>Производим садовую мебель, мангалы, костровые чаши и качели из прочного металла и натурального дерева. Подбираем размеры, конструкцию и отделку под ваш участок, террасу или зону отдыха.</p>
          <p>Берём проект в работу целиком: разрабатываем чертежи, изготавливаем детали на профессиональном оборудовании и контролируем качество сборки и покрытия готового изделия.</p>
        </div>
      </section>

      <footer className="site-footer">
        <a className="brand" href="#top" aria-label="MWCraft — наверх">
          <span className="brand__mark" aria-hidden="true"><i>M</i><i>W</i></span>
          <span className="brand__name"><strong>MWCraft</strong><small>MetallWoodCraft</small></span>
        </a>
        <p>Изделия из металла и дерева для вашего сада</p>
        <a href="tel:+78005552401">+7 (800) 555-24-01</a>
      </footer>
    </main>
  );
}

export default App;
