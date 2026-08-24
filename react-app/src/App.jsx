import { useEffect, useMemo, useState } from 'react';

const advantageItems = [
  {
    id: '2f477a7e-d8b1-4f8b-a2c1-c5e0f5d7aece',
    eyebrow: 'Работаем вместе с вами',
    title: 'Индивидуальный подход',
    description: 'Учитываем особенности участка, ваши задачи и пожелания — от первой идеи до готового изделия.',
    alt: 'Специалист обсуждает с заказчиком материалы и проект садовой мебели',
  },
  {
    id: '4ef8b4d4-7ab9-4e5f-8f0d-1a8b9f87439f',
    eyebrow: 'Надёжность в деталях',
    title: 'Контроль качества',
    description: 'Проверяем геометрию, сварные соединения и финишную обработку на каждом этапе производства.',
    alt: 'Специалист проверяет качество металлического каркаса и деревянных деталей кресла',
  },
  {
    id: '30f9d4da-2d71-4e2c-b69b-44ebb5650d72',
    eyebrow: 'От идеи до чертежа',
    title: 'Проектирование',
    description: 'Разрабатываем конструкцию, подбираем материалы и заранее продумываем удобство будущего изделия.',
    alt: 'Промышленный дизайнер создаёт проект мебели в студии',
  },
  {
    id: '11807b3c-41bb-41d1-9df3-a3ed29f1c7d0',
    eyebrow: 'Точность производства',
    title: 'Профессиональное оборудование',
    description: 'Используем современные станки и технологии для точной обработки металла и стабильного результата.',
    alt: 'Оператор работает на современном станке для лазерной резки металла',
  },
  {
    id: '7c86f95f-5e1a-49fb-8b2b-1cc31743ffb3',
    eyebrow: 'MWWorks',
    title: 'Создаём пространство для отдыха',
    description: 'Костровые чаши, мангалы, садовая мебель и качели в едином стиле — от проекта до готового изделия.',
    alt: 'Коллекция MWWorks: костровая чаша, мангал, садовая мебель и качели',
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

const apiBase = '/api';

function App() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('adminToken') ?? '');
  const [adminError, setAdminError] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [categoriesState, setCategoriesState] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [loginState, setLoginState] = useState({ username: '', password: '' });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', image: null });
  const [productForm, setProductForm] = useState({ name: '', description: '', image: null });

  const isAdminPage = window.location.pathname === '/admin';
  const selectedCategory = useMemo(
    () => categoriesState.find((category) => category.id === selectedCategoryId),
    [categoriesState, selectedCategoryId]
  );

  useEffect(() => {
    if (isPaused) return undefined;
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % advantages.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [isPaused]);

  useEffect(() => {
    if (!isAdminPage || !adminToken) return;
    void fetchCategories();
  }, [adminToken, isAdminPage]);

  const showSlide = (index) => {
    setActiveSlide((index + advantages.length) % advantages.length);
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${apiBase}/categories`);
      if (!response.ok) throw new Error('Не удалось загрузить категории');
      setCategoriesState(await response.json());
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Ошибка загрузки категорий');
    }
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setAdminError('');
    setAdminMessage('');

    const response = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginState),
    });

    if (!response.ok) {
      setAdminError('Неверный логин или пароль');
      return;
    }

    const { token } = await response.json();
    setAdminToken(token);
    localStorage.setItem('adminToken', token);
    setAdminMessage('Вход выполнен. Загрузите категории или создайте новую.');
    await fetchCategories();
  };

  const handleCategorySubmit = async (event) => {
    event.preventDefault();
    setAdminError('');
    setAdminMessage('');

    const formData = new FormData();
    formData.append('name', categoryForm.name);
    formData.append('description', categoryForm.description);
    if (categoryForm.image) formData.append('image', categoryForm.image);

    const response = await fetch(`${apiBase}/categories`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    });

    if (!response.ok) {
      setAdminError('Не удалось создать категорию');
      return;
    }

    setCategoryForm({ name: '', description: '', image: null });
    setAdminMessage('Категория создана.');
    await fetchCategories();
  };

  const handleProductSubmit = async (event) => {
    event.preventDefault();
    if (!selectedCategoryId) return;
    setAdminError('');
    setAdminMessage('');

    const formData = new FormData();
    formData.append('name', productForm.name);
    formData.append('description', productForm.description);
    if (productForm.image) formData.append('image', productForm.image);

    const response = await fetch(`${apiBase}/categories/${selectedCategoryId}/products`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    });

    if (!response.ok) {
      setAdminError('Не удалось добавить товар');
      return;
    }

    setProductForm({ name: '', description: '', image: null });
    setAdminMessage('Товар добавлен.');
    await fetchCategories();
  };

  if (isAdminPage) {
    return (
      <main className="page-shell admin-shell">
        <header className="site-header">
          <a className="brand" href="/" aria-label="MWWorks — на главную">
            <span className="brand__mark" aria-hidden="true"><i>M</i><i>W</i></span>
            <span className="brand__name"><strong>MWWorks</strong><small>Admin</small></span>
          </a>
        </header>

        <section className="admin-hero">
          <h1>Панель администратора</h1>
          <p>Войдите, чтобы создавать категории и добавлять товары в каталог.</p>
        </section>

        {!adminToken ? (
          <form className="admin-form" onSubmit={handleLoginSubmit}>
            <label>
              <span>Имя пользователя</span>
              <input
                type="text"
                value={loginState.username}
                onChange={(event) => setLoginState((prev) => ({ ...prev, username: event.target.value }))}
                required
              />
            </label>
            <label>
              <span>Пароль</span>
              <input
                type="password"
                value={loginState.password}
                onChange={(event) => setLoginState((prev) => ({ ...prev, password: event.target.value }))}
                required
              />
            </label>
            <button type="submit" className="admin-button">Войти</button>
            {adminError && <p className="admin-error">{adminError}</p>}
          </form>
        ) : (
          <div className="admin-grid">
            <section className="admin-card">
              <h2>Создать категорию</h2>
              <form className="admin-form" onSubmit={handleCategorySubmit}>
                <label>
                  <span>Название категории</span>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  <span>Описание</span>
                  <textarea
                    rows="4"
                    value={categoryForm.description}
                    onChange={(event) => setCategoryForm((prev) => ({ ...prev, description: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  <span>Изображение</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setCategoryForm((prev) => ({ ...prev, image: event.target.files?.[0] ?? null }))}
                    required
                  />
                </label>
                <button type="submit" className="admin-button">Создать категорию</button>
              </form>
            </section>

            <section className="admin-card">
              <h2>Категории</h2>
              <div className="admin-category-list">
                {categoriesState.length === 0 && <p>Категории не найдены. Создайте первую.</p>}
                {categoriesState.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={category.id === selectedCategoryId ? 'category-selected' : ''}
                    onClick={() => setSelectedCategoryId(category.id)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </section>

            {selectedCategory && (
              <section className="admin-card admin-product-card">
                <h2>Добавить товар в «{selectedCategory.name}»</h2>
                <form className="admin-form" onSubmit={handleProductSubmit}>
                  <label>
                    <span>Название товара</span>
                    <input
                      type="text"
                      value={productForm.name}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    <span>Описание</span>
                    <textarea
                      rows="4"
                      value={productForm.description}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    <span>Изображение</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => setProductForm((prev) => ({ ...prev, image: event.target.files?.[0] ?? null }))}
                      required
                    />
                  </label>
                  <button type="submit" className="admin-button">Добавить товар</button>
                </form>

                {selectedCategory.products?.length > 0 && (
                  <div className="admin-product-list">
                    <h3>Товары категории</h3>
                    <ul>
                      {selectedCategory.products.map((product) => (
                        <li key={product.id}>{product.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {adminMessage && <p className="admin-message">{adminMessage}</p>}
        {adminError && !adminToken && <p className="admin-error">{adminError}</p>}
      </main>
    );
  }

  return (
    <main className="page-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="MWWorks — на главную">
          <span className="brand__mark" aria-hidden="true"><i>M</i><i>W</i></span>
          <span className="brand__name"><strong>MWWorks</strong><small>Metal &amp; Wood Works</small></span>
        </a>
        <div className="site-header__actions">
          <a className="header-phone" href="tel:+78005552401">+7 (800) 555-24-01</a>
          <a className="header-button" href="/admin">Админ</a>
        </div>
      </header>

      <h1 className="sr-only">Изделия из металла и дерева на заказ: садовая мебель, мангалы, костровые чаши и качели MWWorks</h1>

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
            src={`${apiBase}/images/${slide.id}`}
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
        <span className="section-label">Собственное производство MWWorks</span>
        <h2 id="production-title">Металлические изделия для сада по индивидуальному проекту</h2>
        <div className="seo-intro__text">
          <p>Производим садовую мебель, мангалы, костровые чаши и качели из прочного металла и натурального дерева. Подбираем размеры, конструкцию и отделку под ваш участок, террасу или зону отдыха.</p>
          <p>Берём проект в работу целиком: разрабатываем чертежи, изготавливаем детали на профессиональном оборудовании и контролируем качество сборки и покрытия готового изделия.</p>
        </div>
      </section>

      <footer className="site-footer">
        <a className="brand" href="#top" aria-label="MWWorks — наверх">
          <span className="brand__mark" aria-hidden="true"><i>M</i><i>W</i></span>
          <span className="brand__name"><strong>MWWorks</strong><small>Metal &amp; Wood Works</small></span>
        </a>
        <p>Изделия из металла и дерева для вашего сада</p>
        <a href="tel:+78005552401">+7 (800) 555-24-01</a>
      </footer>
    </main>
  );
}

export default App;
