import { useEffect, useMemo, useRef, useState } from 'react';
import DesignEditor from './DesignEditor';

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
  const [activeAdminSection, setActiveAdminSection] = useState('catalog');
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [editingProductId, setEditingProductId] = useState('');
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [adminBusy, setAdminBusy] = useState(false);
  const [loginState, setLoginState] = useState({ username: '', password: '' });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', image: null });
  const [productForm, setProductForm] = useState({ name: '', description: '', image: null });
  const [designProjects, setDesignProjects] = useState([]);
  const [activeDesignProject, setActiveDesignProject] = useState(null);
  const [designName, setDesignName] = useState('');
  const [designObjects, setDesignObjects] = useState([]);
  const [selectedDesignObjectId, setSelectedDesignObjectId] = useState(null);
  const [newDesignProjectName, setNewDesignProjectName] = useState('');
  const [isDesignLoading, setIsDesignLoading] = useState(false);
  const [isDesignSaving, setIsDesignSaving] = useState(false);
  const [designError, setDesignError] = useState('');
  const [designSaveStatus, setDesignSaveStatus] = useState('');
  const [designDirty, setDesignDirty] = useState(false);
  const designProjectRef = useRef(activeDesignProject);
  const designNameRef = useRef(designName);
  const designObjectsRef = useRef(designObjects);
  const designDirtyRef = useRef(designDirty);

  const isAdminPage = window.location.pathname === '/admin';
  const selectedCategory = useMemo(
    () => categoriesState.find((category) => category.id === selectedCategoryId),
    [categoriesState, selectedCategoryId]
  );
  const selectedDesignObject = useMemo(
    () => designObjects.find((object) => object.id === selectedDesignObjectId),
    [designObjects, selectedDesignObjectId]
  );

  designProjectRef.current = activeDesignProject;
  designNameRef.current = designName;
  designObjectsRef.current = designObjects;
  designDirtyRef.current = designDirty;
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
    setIsCatalogLoading(true);
    try {
      const response = await fetch(`${apiBase}/categories`);
      if (!response.ok) throw new Error('Не удалось загрузить каталог.');
      const nextCategories = await response.json();
      setCategoriesState(nextCategories);
      setSelectedCategoryId((current) => nextCategories.some((category) => category.id === current)
        ? current
        : nextCategories[0]?.id ?? '');
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Ошибка загрузки каталога.');
    } finally {
      setIsCatalogLoading(false);
    }
  };

  const resetCategoryForm = () => {
    setEditingCategoryId('');
    setCategoryForm({ name: '', description: '', image: null });
  };

  const resetProductForm = () => {
    setEditingProductId('');
    setProductForm({ name: '', description: '', image: null });
  };

  const responseError = async (response, fallback) => {
    const text = await response.text();
    return text.trim() || fallback;
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    setAdminToken('');
    setCategoriesState([]);
    setSelectedCategoryId('');
    resetCategoryForm();
    resetProductForm();
    setAdminMessage('Вы вышли из панели администратора.');
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setAdminError('');
    setAdminMessage('');

    setAdminBusy(true);
    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginState),
      });
      if (!response.ok) {
        setAdminError('Неверный логин или пароль.');
        return;
      }

      const { token } = await response.json();
      setAdminToken(token);
      localStorage.setItem('adminToken', token);
      setAdminMessage('Вход выполнен. Каталог готов к редактированию.');
      await fetchCategories();
    } catch {
      setAdminError('Не удалось выполнить вход. Проверьте подключение к серверу.');
    } finally {
      setAdminBusy(false);
    }
  };

  const handleCategorySubmit = async (event) => {
    event.preventDefault();
    setAdminError('');
    setAdminMessage('');

    const formData = new FormData();
    formData.append('name', categoryForm.name);
    formData.append('description', categoryForm.description);
    if (categoryForm.image) formData.append('image', categoryForm.image);

    const isEditing = Boolean(editingCategoryId);
    setAdminBusy(true);
    try {
      const response = await fetch(`${apiBase}/categories${isEditing ? `/${editingCategoryId}` : ''}`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData,
      });
      if (!response.ok) {
        setAdminError(await responseError(response, 'Не удалось сохранить категорию.'));
        return;
      }

      const saved = await response.json();
      resetCategoryForm();
      setSelectedCategoryId(saved.id);
      setAdminMessage(isEditing ? 'Категория обновлена.' : 'Категория создана.');
      await fetchCategories();
    } catch {
      setAdminError('Не удалось сохранить категорию. Проверьте подключение к серверу.');
    } finally {
      setAdminBusy(false);
    }
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

    const isEditing = Boolean(editingProductId);
    setAdminBusy(true);
    try {
      const response = await fetch(`${apiBase}${isEditing ? `/categories/products/${editingProductId}` : `/categories/${selectedCategoryId}/products`}`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData,
      });
      if (!response.ok) {
        setAdminError(await responseError(response, 'Не удалось сохранить товар.'));
        return;
      }

      resetProductForm();
      setAdminMessage(isEditing ? 'Товар обновлён.' : 'Товар добавлен.');
      await fetchCategories();
    } catch {
      setAdminError('Не удалось сохранить товар. Проверьте подключение к серверу.');
    } finally {
      setAdminBusy(false);
    }
  };

  const startCategoryEdit = (category) => {
    setSelectedCategoryId(category.id);
    setEditingCategoryId(category.id);
    setCategoryForm({ name: category.name, description: category.description, image: null });
    setAdminError('');
  };

  const startProductEdit = (product) => {
    setEditingProductId(product.id);
    setProductForm({ name: product.name, description: product.description, image: null });
    setAdminError('');
  };

  const deleteCatalogItem = async (kind, id, name) => {
    if (!window.confirm(`Удалить «${name}»? Это действие нельзя отменить.`)) return;
    setAdminError('');
    setAdminMessage('');
    setAdminBusy(true);
    try {
      const path = kind === 'category' ? `/categories/${id}` : `/categories/products/${id}`;
      const response = await fetch(`${apiBase}${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` } });
      if (!response.ok) {
        setAdminError(await responseError(response, 'Не удалось удалить запись.'));
        return;
      }
      if (kind === 'category' && selectedCategoryId === id) setSelectedCategoryId('');
      if (kind === 'category' && editingCategoryId === id) resetCategoryForm();
      if (kind === 'product' && editingProductId === id) resetProductForm();
      setAdminMessage(kind === 'category' ? 'Категория удалена.' : 'Товар удалён.');
      await fetchCategories();
    } catch {
      setAdminError('Не удалось удалить запись. Проверьте подключение к серверу.');
    } finally {
      setAdminBusy(false);
    }
  };

  const fetchDesignProjects = async () => {
    setIsDesignLoading(true);
    setDesignError('');
    try {
      const response = await fetch(`${apiBase}/design-projects`, { headers: { Authorization: `Bearer ${adminToken}` } });
      if (!response.ok) throw new Error(await responseError(response, 'Не удалось загрузить проекты.'));
      setDesignProjects(await response.json());
    } catch (error) {
      setDesignError(error instanceof Error ? error.message : 'Не удалось загрузить проекты.');
    } finally {
      setIsDesignLoading(false);
    }
  };

  const openDesignProject = async (id) => {
    setIsDesignLoading(true);
    setDesignError('');
    try {
      const response = await fetch(`${apiBase}/design-projects/${id}`, { headers: { Authorization: `Bearer ${adminToken}` } });
      if (!response.ok) throw new Error(await responseError(response, 'Не удалось открыть проект.'));
      const project = await response.json();
      let scene = { objects: [] };
      try { scene = JSON.parse(project.sceneJson); } catch { /* The server accepts only valid JSON; retain a safe empty scene. */ }
      setActiveDesignProject(project);
      setDesignName(project.name);
      setDesignObjects(Array.isArray(scene.objects) ? scene.objects : []);
      setSelectedDesignObjectId(null);
      setDesignDirty(false);
      setDesignSaveStatus('Проект открыт.');
    } catch (error) {
      setDesignError(error instanceof Error ? error.message : 'Не удалось открыть проект.');
    } finally {
      setIsDesignLoading(false);
    }
  };

  const createDesignProject = async (event) => {
    event.preventDefault();
    const name = newDesignProjectName.trim();
    if (!name) return;
    setIsDesignSaving(true);
    setDesignError('');
    try {
      const response = await fetch(`${apiBase}/design-projects`, {
        method: 'POST', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error(await responseError(response, 'Не удалось создать проект.'));
      const project = await response.json();
      setDesignProjects((current) => [{ id: project.id, name: project.name, createdAt: project.createdAt, updatedAt: project.updatedAt }, ...current]);
      setActiveDesignProject(project);
      setDesignName(project.name);
      setDesignObjects([]);
      setSelectedDesignObjectId(null);
      setNewDesignProjectName('');
      setDesignDirty(false);
      setDesignSaveStatus('Новый проект создан.');
    } catch (error) {
      setDesignError(error instanceof Error ? error.message : 'Не удалось создать проект.');
    } finally {
      setIsDesignSaving(false);
    }
  };

  const saveDesignProject = async (automatic = false) => {
    const project = designProjectRef.current;
    if (!project || (automatic && !designDirtyRef.current)) return;
    const name = designNameRef.current.trim() || project.name;
    const sceneJson = JSON.stringify({ version: 1, objects: designObjectsRef.current });
    setIsDesignSaving(true);
    setDesignError('');
    try {
      const response = await fetch(`${apiBase}/design-projects/${project.id}`, {
        method: 'PUT', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ name, sceneJson }),
      });
      if (!response.ok) throw new Error(await responseError(response, 'Не удалось сохранить проект.'));
      const saved = await response.json();
      setActiveDesignProject(saved);
      setDesignProjects((current) => current.map((item) => item.id === saved.id
        ? { id: saved.id, name: saved.name, createdAt: saved.createdAt, updatedAt: saved.updatedAt } : item));
      if (designProjectRef.current?.id === saved.id && designNameRef.current.trim() === name
        && JSON.stringify({ version: 1, objects: designObjectsRef.current }) === sceneJson) setDesignDirty(false);
      setDesignSaveStatus(`${automatic ? 'Автосохранение' : 'Сохранено'}: ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`);
    } catch (error) {
      setDesignError(error instanceof Error ? error.message : 'Не удалось сохранить проект.');
    } finally {
      setIsDesignSaving(false);
    }
  };

  const updateDesignObject = (id, patch) => {
    setDesignObjects((current) => current.map((object) => object.id === id ? { ...object, ...patch } : object));
    setDesignDirty(true);
  };

  const deleteDesignObject = (id) => {
    setDesignObjects((current) => current.filter((object) => object.id !== id));
    setSelectedDesignObjectId((current) => current === id ? null : current);
    setDesignDirty(true);
  };

  const addDesignObject = (type = 'box') => {
    const id = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const index = designObjects.length;
    const labels = { box: 'Параллелепипед', cube: 'Куб', sphere: 'Шар' };
    const size = type === 'box' ? { length: 1000, width: 600, height: 500 } : { length: 600, width: 600, height: 600 };
    setDesignObjects((current) => [...current, {
      id, type, name: `${labels[type]} ${current.length + 1}`, color: '#f8f8f6', dimensions: size,
      position: { x: (index % 3) * 1200, y: 0, z: Math.floor(index / 3) * 900 },
      rotation: { x: 0, y: 0, z: 0 },
    }]);
    setSelectedDesignObjectId(id);
    setDesignDirty(true);
  };

  useEffect(() => {
    if (!isAdminPage || !adminToken || activeAdminSection !== 'design') return;
    void fetchDesignProjects();
  }, [adminToken, activeAdminSection, isAdminPage]);

  useEffect(() => {
    if (!activeDesignProject?.id) return undefined;
    const timer = window.setInterval(() => { void saveDesignProject(true); }, 60_000);
    return () => window.clearInterval(timer);
  }, [activeDesignProject?.id]);

  if (isAdminPage) {
    return (
      <main className="page-shell admin-shell">
        <header className="site-header">
          <a className="brand" href="/" aria-label="MWWorks — на главную">
            <span className="brand__mark" aria-hidden="true"><i>M</i><i>W</i></span>
            <span className="brand__name"><strong>MWWorks</strong><small>Admin</small></span>
          </a>
          <div className="admin-header-actions">
            <a className="admin-link-button" href="/">К сайту</a>
            {adminToken && <button type="button" className="admin-link-button" onClick={logout}>Выйти</button>}
          </div>
        </header>

        {!adminToken ? (
          <section className="admin-card admin-login-card"><form className="admin-form" onSubmit={handleLoginSubmit}>
              <label><span>Имя пользователя</span><input type="text" autoComplete="username" value={loginState.username} onChange={(event) => setLoginState((prev) => ({ ...prev, username: event.target.value }))} required /></label>
              <label><span>Пароль</span><input type="password" autoComplete="current-password" value={loginState.password} onChange={(event) => setLoginState((prev) => ({ ...prev, password: event.target.value }))} required /></label>
              <button type="submit" className="admin-button" disabled={adminBusy}>{adminBusy ? 'Проверяем…' : 'Войти'}</button>
              {adminError && <p className="admin-error">{adminError}</p>}
            </form></section>
        ) : (
          <div className="admin-workspace">
            <aside className="admin-sidebar">
              <nav className="admin-menu" aria-label="Разделы админ-панели">
                <button type="button" className={activeAdminSection === 'catalog' ? 'is-active' : ''} onClick={() => setActiveAdminSection('catalog')}>Ассортимент</button>
                <button type="button" className={activeAdminSection === 'design' ? 'is-active' : ''} onClick={() => setActiveAdminSection('design')}>Проектирование</button>
              </nav>
            </aside>
            <div className="admin-content">
              {activeAdminSection === 'catalog' && (
                <div className="admin-grid">
            <section className="admin-card">
              <div className="admin-card-heading"><h2>{editingCategoryId ? 'Редактировать категорию' : 'Новая категория'}</h2>{editingCategoryId && <button type="button" className="admin-text-button" onClick={resetCategoryForm}>Отмена</button>}</div>
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
                    required={!editingCategoryId}
                  />
                  {editingCategoryId && <small>Оставьте поле пустым, чтобы сохранить текущее изображение.</small>}
                </label>
                <button type="submit" className="admin-button" disabled={adminBusy}>{adminBusy ? 'Сохраняем…' : editingCategoryId ? 'Сохранить категорию' : 'Создать категорию'}</button>
              </form>
            </section>

            <section className="admin-card">
              <div className="admin-card-heading"><h2>Категории</h2><button type="button" className="admin-text-button" onClick={() => void fetchCategories()} disabled={isCatalogLoading || adminBusy}>Обновить</button></div>
              <div className="admin-category-list">
                {isCatalogLoading && <p className="admin-empty">Загружаем каталог…</p>}
                {!isCatalogLoading && categoriesState.length === 0 && <p className="admin-empty">Категорий пока нет. Создайте первую.</p>}
                {categoriesState.map((category) => (
                  <article key={category.id} className={`admin-category-item${category.id === selectedCategoryId ? ' category-selected' : ''}`}>
                    <button type="button" className="admin-category-select" onClick={() => { setSelectedCategoryId(category.id); resetCategoryForm(); resetProductForm(); }}>
                      <img src={category.imageUrl} alt="" /><span><strong>{category.name}</strong><small>{category.products?.length ?? 0} товаров</small></span>
                    </button>
                    <div className="admin-row-actions"><button type="button" className="admin-icon-button" title="Редактировать категорию" onClick={() => startCategoryEdit(category)}>✎</button><button type="button" className="admin-icon-button danger" title="Удалить категорию" onClick={() => void deleteCatalogItem('category', category.id, category.name)}>×</button></div>
                  </article>
                ))}
              </div>
            </section>

            {selectedCategory && (
              <section className="admin-card admin-product-card">
                <div className="admin-card-heading"><h2>{editingProductId ? `Редактировать товар: ${productForm.name}` : `Товары: «${selectedCategory.name}»`}</h2>{editingProductId && <button type="button" className="admin-text-button" onClick={resetProductForm}>Отмена</button>}</div>
                <div className="admin-product-layout">
                  <form className="admin-form" onSubmit={handleProductSubmit}>
                    <label><span>Название товара</span><input type="text" value={productForm.name} onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))} required /></label>
                    <label><span>Описание</span><textarea rows="4" value={productForm.description} onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))} required /></label>
                    <label><span>Изображение</span><input type="file" accept="image/*" onChange={(event) => setProductForm((prev) => ({ ...prev, image: event.target.files?.[0] ?? null }))} required={!editingProductId} />{editingProductId && <small>Новое изображение необязательно.</small>}</label>
                    <button type="submit" className="admin-button" disabled={adminBusy}>{adminBusy ? 'Сохраняем…' : editingProductId ? 'Сохранить товар' : 'Добавить товар'}</button>
                  </form>
                  <div className="admin-product-list">
                    {selectedCategory.products?.length > 0 ? selectedCategory.products.map((product) => <article className="admin-product-item" key={product.id}>
                      <img src={product.imageUrl} alt="" /><div><strong>{product.name}</strong><p>{product.description}</p></div><div className="admin-row-actions"><button type="button" className="admin-icon-button" title="Редактировать товар" onClick={() => startProductEdit(product)}>✎</button><button type="button" className="admin-icon-button danger" title="Удалить товар" onClick={() => void deleteCatalogItem('product', product.id, product.name)}>×</button></div>
                    </article>) : <p className="admin-empty">В этой категории пока нет товаров.</p>}
                  </div>
                </div>
              </section>
            )}
                </div>
              )}
              {activeAdminSection === 'design' && (!activeDesignProject ? <section className="admin-card design-project-picker">
                <div className="admin-card-heading"><h2>Проекты</h2><button type="button" className="admin-text-button" onClick={() => void fetchDesignProjects()} disabled={isDesignLoading}>Обновить</button></div>
                <form className="design-new-project" onSubmit={createDesignProject}>
                  <input type="text" value={newDesignProjectName} onChange={(event) => setNewDesignProjectName(event.target.value)} placeholder="Название нового проекта" maxLength="200" required />
                  <button type="submit" className="admin-button" disabled={isDesignSaving}>{isDesignSaving ? 'Создаём…' : 'Создать проект'}</button>
                </form>
                {designError && <p className="admin-error">{designError}</p>}
                {isDesignLoading ? <p className="admin-empty">Загружаем проекты…</p> : <div className="design-project-list">
                  {designProjects.length === 0 ? <p className="admin-empty">Проектов пока нет. Создайте первый эскиз.</p> : designProjects.map((project) => <button type="button" key={project.id} onClick={() => void openDesignProject(project.id)}>
                    <strong>{project.name}</strong><small>Изменён {new Date(project.updatedAt).toLocaleString('ru-RU')}</small>
                  </button>)}
                </div>}
              </section> : <section className="design-project-editor">
                <div className="design-project-header">
                  <button type="button" className="admin-text-button" onClick={() => { setActiveDesignProject(null); setSelectedDesignObjectId(null); }}>← К проектам</button>
                  <input className="design-project-name" type="text" value={designName} maxLength="200" onChange={(event) => { setDesignName(event.target.value); setDesignDirty(true); }} aria-label="Название проекта" />
                  <span className={`design-save-status${designDirty ? ' is-dirty' : ''}`}>{isDesignSaving ? 'Сохраняем…' : designDirty ? 'Есть несохранённые изменения' : designSaveStatus}</span>
                  <button type="button" className="admin-button" onClick={() => void saveDesignProject()} disabled={isDesignSaving}>{isDesignSaving ? 'Сохраняем…' : 'Сохранить'}</button>
                </div>
                {designError && <p className="admin-error">{designError}</p>}
                <div className="design-workspace">
                  <DesignEditor objects={designObjects} selectedId={selectedDesignObjectId} onSelect={setSelectedDesignObjectId} onChange={updateDesignObject} onDelete={deleteDesignObject} onAddObject={addDesignObject} />
                  <aside className="design-properties">
                    {selectedDesignObject ? <>
                      <h2>Свойства объекта</h2>
                      <label><span>Название</span><input type="text" value={selectedDesignObject.name} onChange={(event) => updateDesignObject(selectedDesignObject.id, { name: event.target.value })} /></label>
                      <label><span>Цвет</span><input type="color" value={selectedDesignObject.color || '#8b6b4d'} onChange={(event) => updateDesignObject(selectedDesignObject.id, { color: event.target.value })} /></label>
                      <fieldset><legend>Размеры, мм</legend>
                        <label><span>Длина</span><input type="number" min="10" step="1" value={selectedDesignObject.dimensions?.length ?? 1000} onChange={(event) => updateDesignObject(selectedDesignObject.id, { dimensions: { ...selectedDesignObject.dimensions, length: Math.max(10, Number(event.target.value)) } })} /></label>
                        <label><span>Ширина</span><input type="number" min="10" step="1" value={selectedDesignObject.dimensions?.width ?? 600} onChange={(event) => updateDesignObject(selectedDesignObject.id, { dimensions: { ...selectedDesignObject.dimensions, width: Math.max(10, Number(event.target.value)) } })} /></label>
                        <label><span>Высота</span><input type="number" min="10" step="1" value={selectedDesignObject.dimensions?.height ?? 500} onChange={(event) => updateDesignObject(selectedDesignObject.id, { dimensions: { ...selectedDesignObject.dimensions, height: Math.max(10, Number(event.target.value)) } })} /></label>
                      </fieldset>
                      <fieldset><legend>Поворот, °</legend>
                        {['x', 'y', 'z'].map((axis) => <label key={axis}><span>{axis.toUpperCase()}</span><input type="number" step="1" value={selectedDesignObject.rotation?.[axis] ?? 0} onChange={(event) => updateDesignObject(selectedDesignObject.id, { rotation: { ...selectedDesignObject.rotation, [axis]: Number(event.target.value) } })} /></label>)}
                      </fieldset>
                    </> : <p className="admin-empty">Выберите объект на сцене, чтобы изменить его свойства.</p>}
                  </aside>
                </div>
              </section>)}
            </div>
          </div>
        )}

        {adminMessage && <p className="admin-message">{adminMessage}</p>}
        {adminError && adminToken && <p className="admin-error">{adminError}</p>}
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
