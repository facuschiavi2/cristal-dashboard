"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell, Panel } from "../components";
import { deleteJson, fetchJson, money, postJson, putJson } from "../lib";
import type { Category, Product } from "../types";
import styles from "../page.module.css";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Add product form
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    name: "", category_id: "", brand_id: "", price: "", unit: "", stock: "",
    description: "", technical_info: "", sku: "",
  });

  // Category ABM modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: "" });
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const load = async () => {
    try {
      const [productData, catData] = await Promise.all([
        fetchJson<Product[]>("/products"),
        fetchJson<Category[]>("/categories"),
      ]);
      setProducts(productData);
      setCategories(catData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar productos");
    }
  };

  useEffect(() => { load(); }, []);

  const catList = useMemo(() => getCategories(products), [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = `${p.name} ${p.brand_name}`.toLowerCase().includes(search.toLowerCase());
      const matchesCat = filterCat === "all" || p.category_name === filterCat;
      return matchesSearch && matchesCat;
    });
  }, [products, search, filterCat]);

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await postJson<Product>("/products", {
        name: productForm.name,
        category_id: Number(productForm.category_id),
        brand_id: productForm.brand_id ? Number(productForm.brand_id) : undefined,
        price: Number(productForm.price),
        unit: productForm.unit,
        stock: Number(productForm.stock),
        description: productForm.description || undefined,
        technical_info: productForm.technical_info || undefined,
        sku: productForm.sku || undefined,
      });
      setNotice("Producto creado.");
      setProductForm({ name: "", category_id: "", brand_id: "", price: "", unit: "", stock: "", description: "", technical_info: "", sku: "" });
      setShowAddProduct(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear producto");
    }
  }

  // Category ABM
  async function saveCategory() {
    if (!catForm.name.trim()) return;
    setError("");
    try {
      if (editingCat) {
        await putJson<Category>(`/categories/${editingCat.id}`, { name: catForm.name });
        setNotice("Categoría actualizada.");
      } else {
        await postJson<Category>("/categories", { name: catForm.name });
        setNotice("Categoría creada.");
      }
      setCatForm({ name: "" });
      setEditingCat(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar categoría");
    }
  }

  async function deleteCategory(catId: number) {
    try {
      await deleteJson(`/categories/${catId}`);
      setNotice("Categoría eliminada.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar categoría");
    }
  }

  function openEditCat(cat: Category) {
    setEditingCat(cat);
    setCatForm({ name: cat.name });
  }

  function closeCatModal() {
    setShowCatModal(false);
    setCatForm({ name: "" });
    setEditingCat(null);
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    filtered.forEach((p) => {
      const key = p.category_name || "Sin categoría";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return map;
  }, [filtered]);

  return (
    <DashboardShell
      styles={styles}
      title="Productos"
      subtitle="Catálogo con filtros rápidos y edición inline de stock."
      actions={
        <>
          <span>Productos activos</span>
          <strong>{products.length}</strong>
          <span className={styles.helperText}>Stock editable inline</span>
        </>
      }
    >
      {notice && <div className={styles.notice}>{notice}</div>}
      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.metrics}>
        <article className={styles.metricCard}>
          <span>Total de productos</span>
          <strong>{products.length}</strong>
        </article>
        <article className={styles.metricCard}>
          <span>Categorías</span>
          <strong>{categories.length}</strong>
        </article>
        <article className={styles.metricCard}>
          <span>Stock bajo</span>
          <strong>{products.filter((p) => p.stock <= 5).length}</strong>
        </article>
      </section>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <button className={styles.button} onClick={() => setShowAddProduct(true)}>+ Agregar Producto</button>
        <button className={styles.secondaryButton} onClick={() => setShowCatModal(true)}>ABM Categorías</button>
      </div>

      <Panel styles={styles} title="Catálogo" description="Buscá por nombre y filtrá por categoría.">
        <div className={styles.controls}>
          <label className={styles.field}>
            Buscar producto
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ej. Cloro Shock" />
          </label>
          <label className={styles.field}>
            Categoría
            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
              <option value="all">Todas</option>
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </label>
        </div>

        {Array.from(grouped.entries()).map(([catName, catProducts]) => (
          <div key={catName} style={{ marginBottom: 28 }}>
            <div className={styles.sectionDivider}>{catName}</div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Marca</th>
                    <th>Precio</th>
                    <th>Unidad</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {catProducts.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.brand_name}</td>
                      <td>{money(p.price)}</td>
                      <td>{p.unit}</td>
                      <td>{p.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {filtered.length === 0 && <div className={styles.empty}>No hay productos que coincidan.</div>}
      </Panel>

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className={styles.modalOverlay} onClick={() => setShowAddProduct(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Agregar Producto</h2>
              <button className={styles.modalClose} onClick={() => setShowAddProduct(false)}>×</button>
            </div>
            <form onSubmit={handleAddProduct}>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  Nombre
                  <input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required />
                </label>
                <label className={styles.field}>
                  Categoría
                  <select value={productForm.category_id} onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })} required>
                    <option value="">Seleccionar</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  Marca / ID marca
                  <input value={productForm.brand_id} onChange={(e) => setProductForm({ ...productForm, brand_id: e.target.value })} />
                </label>
                <label className={styles.field}>
                  Precio
                  <input type="number" min="0" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} required />
                </label>
                <label className={styles.field}>
                  Unidad
                  <input value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })} placeholder="kg, lt, unidad..." required />
                </label>
                <label className={styles.field}>
                  Stock
                  <input type="number" min="0" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} required />
                </label>
                <label className={styles.field}>
                  SKU
                  <input value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} />
                </label>
                <label className={`${styles.field} ${styles.fullWidth}`}>
                  Descripción
                  <textarea rows={2} value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
                </label>
                <label className={`${styles.field} ${styles.fullWidth}`}>
                  Info técnica
                  <textarea rows={2} value={productForm.technical_info} onChange={(e) => setProductForm({ ...productForm, technical_info: e.target.value })} />
                </label>
              </div>
              <div style={{ marginTop: 16 }}>
                <button className={styles.button} type="submit">Guardar producto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ABM Categories Modal */}
      {showCatModal && (
        <div className={styles.modalOverlay} onClick={closeCatModal}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>ABM Categorías</h2>
              <button className={styles.modalClose} onClick={closeCatModal}>×</button>
            </div>

            <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
              <label className={styles.field}>
                Nombre
                <input value={catForm.name} onChange={(e) => setCatForm({ name: e.target.value })} placeholder="Nombre de la categoría" />
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button className={styles.button} type="button" onClick={saveCategory}>
                  {editingCat ? "Actualizar" : "Crear categoría"}
                </button>
                {editingCat && (
                  <button className={styles.secondaryButton} type="button" onClick={() => { setEditingCat(null); setCatForm({ name: "" }); }}>Cancelar</button>
                )}
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Nombre</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.id}>
                      <td>{cat.name}</td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button className={styles.secondaryButton} type="button" onClick={() => openEditCat(cat)}>Editar</button>
                          <button className={styles.ghostButton} type="button" onClick={() => deleteCategory(cat.id)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function getCategories(products: Product[]) {
  return Array.from(new Set(products.map((p) => p.category_name).filter(Boolean))).sort();
}
