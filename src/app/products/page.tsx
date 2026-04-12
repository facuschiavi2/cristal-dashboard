"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell, Panel } from "../components";
import { fetchJson, money, postJson, putJson } from "../lib";
import type { Category, Product } from "../types";
import styles from "../page.module.css";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState<Product | null>(null);
  const prefixMap: Record<number,string> = { 1:"LIQ", 2:"CLO", 3:"AUX", 4:"ACR", 5:"LOS", 6:"MAT" };
  function catPrefix(id: number) { return prefixMap[id] || String(id).padStart(3,"0"); }
  const [showAdjustStock, setShowAdjustStock] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<"compra" | "descarte" | "ajuste">("compra");
  const [adjustQty, setAdjustQty] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [productForm, setProductForm] = useState({
    name: "", category_id: "", brand_name: "", price: "", unit: "", stock: "", sku: "", description: "", technical_info: "",
  });
  const [categoryForm, setCategoryForm] = useState({ name: "" });

  const load = async () => {
    try {
      const [p, c, b] = await Promise.all([
        fetchJson<Product[]>(`/products?includeDiscontinued=${showInactive ? "1" : "0"}`),
        fetchJson<Category[]>("/categories"),
        fetchJson<any[]>("/brands"),
      ]);
      setProducts(p);
      setCategories(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    }
  };

  useEffect(() => { load(); }, [showInactive]);

  const filtered = useMemo(() => {
    let list = [...products].sort((a, b) => a.name.localeCompare(b.name));
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (catFilter) list = list.filter(p => p.category_name === catFilter);
    return list;
  }, [products, search, catFilter]);

  const grouped = useMemo(() => {
    const catNames = [...new Set(filtered.map(p => p.category_name || "Sin categoría"))].sort((a, b) => a.localeCompare(b));
    return catNames.map(name => ({
      name,
      products: filtered.filter(p => (p.category_name || "Sin categoría") === name),
    }));
  }, [filtered]);

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setNotice("");
    try {
      await postJson("/products", {
        name: productForm.name,
        category_id: productForm.category_id ? Number(productForm.category_id) : null,
        brand_name: productForm.brand_name || undefined,
        price: Number(productForm.price) || 0,
        unit: productForm.unit || "unidad",
        stock: Number(productForm.stock) || 0,
        sku: productForm.sku || undefined,
        description: productForm.description || undefined,
        technical_info: productForm.technical_info || undefined,
      });
      setNotice("Producto agregado.");
      setProductForm({ name: "", category_id: "", brand_id: "", price: "", unit: "", stock: "", sku: "", description: "", technical_info: "" });
      setShowAddProduct(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  async function handleEditProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!showEditProduct) return;
    setError(""); setNotice("");
    try {
      await putJson(`/products/${showEditProduct.id}`, {
        name: productForm.name,
        category_id: productForm.category_id ? Number(productForm.category_id) : null,
        brand_name: productForm.brand_name || undefined,
        price: Number(productForm.price) || 0,
        unit: productForm.unit || "unidad",
        stock: Number(productForm.stock) || 0,
        sku: productForm.sku || undefined,
        description: productForm.description || undefined,
        technical_info: productForm.technical_info || undefined,
      });
      setNotice("Producto actualizado.");
      setShowEditProduct(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    try {
      await postJson("/categories", { name: categoryForm.name });
      setCategoryForm({ name: "" });
      setShowAddCategory(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  async function handleDeleteCategory(id: number) {
    if (!confirm("¿Eliminar esta categoría?")) return;
    try {
      await putJson(`/categories/${id}`, {});
    } catch (err: any) {
      alert(err?.message || "No se puede eliminar");
    }
  }

  async function handleDiscontinue(id: number) {
    if (!confirm("¿Dar de baja este producto?")) return;
    try {
      await putJson(`/products/${id}/discontinue`, {});
      setNotice("Producto dado de baja.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  async function handleRestore(id: number) {
    try {
      await putJson(`/products/${id}/restore`, {});
      setNotice("Producto restaurado.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  async function handleAdjustStock(e: React.FormEvent) {
    e.preventDefault();
    if (!showAdjustStock) return;
    try {
      let adj = Number(adjustQty);
      if (adjustType === "descarte") adj = -adj;
      if (adjustType === "ajuste") {} // absolute value already set
      await postJson("/stock/adjust", { product_id: showAdjustProduct!.id, adjustment: adjustType === "ajuste" ? adjustQty : adj });
      setNotice("Stock ajustado.");
      setShowAdjustStock(null);
      setAdjustQty(0);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  function openEdit(p: Product) {
    const catId = categories.find(c => c.name === p.category_name)?.id ? String(categories.find(c => c.name === p.category_name)!.id) : String(p.category_id || "");
    setProductForm({
      name: p.name, category_id: catId, brand_name: p.brand_name || "",
      price: String(p.price), unit: p.unit || "", stock: String(p.stock || ""), sku: p.sku || "",
      description: p.description || "", technical_info: p.technical_info || "",
    });
    setShowEditProduct(p);
  }

  const activeProducts = products.filter(p => !p.discontinued).length;
  const inactiveProducts = products.filter(p => p.discontinued).length;

  return (
    <DashboardShell
      styles={styles}
      title="Productos"
      subtitle="Catálogo, stock y categorías."
      actions={
        <div style={{ display: "flex", gap: 16, fontSize: 14 }}>
          <span>Activos: <strong style={{ color: "#10b981" }}>{activeProducts}</strong></span>
          <span>Inactivos: <strong style={{ color: "#94a3b8" }}>{inactiveProducts}</strong></span>
        </div>
      }
    >
      {error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 16px", borderRadius: 8, marginBottom: 16 }}>{error}</div>}
      {notice && <div style={{ background: "#d1fae5", color: "#065f46", padding: "10px 16px", borderRadius: 8, marginBottom: 16 }}>{notice}</div>}

      {/* Filtros + botones */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 20 }}>
        <input
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "8px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, minWidth: 220 }}
        />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={{ padding: "8px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14 }}>
          <option value="">Todas las categorías</option>
          {[...new Set(products.map(p => p.category_name).filter(Boolean))].sort((a,b) => a.localeCompare(b)).map(cn => <option key={cn} value={cn}>{cn}</option>)}
        </select>
        <button
          className={!showInactive ? styles.activeFilter : styles.filterButton}
          onClick={() => setShowInactive(false)}
        >
          Solo activos
        </button>
        <button
          className={showInactive ? styles.activeFilter : styles.filterButton}
          onClick={() => setShowInactive(true)}
        >
          Ver todos
        </button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className={styles.button} onClick={() => { setProductForm({ name: "", category_id: "", brand_name: "", price: "", unit: "", stock: "", sku: "", description: "", technical_info: "" }); setShowAddProduct(true); }}>+ Agregar Producto</button>
          <button className={styles.secondaryButton} onClick={() => setShowAddCategory(true)}>ABM Categorías</button>
        </div>
      </div>

      {/* Lista agrupada por categoría */}
      {grouped.map(cat => (
        <div key={cat.name} style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0891b2", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {cat.name}
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ textAlign: "left", padding: "10px 14px", color: "#64748b", fontSize: 13, fontWeight: 600 }}>Producto</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", color: "#64748b", fontSize: 13, fontWeight: 600 }}>Marca</th>
                  <th style={{ textAlign: "right", padding: "10px 14px", color: "#64748b", fontSize: 13, fontWeight: 600 }}>Precio</th>
                  <th style={{ textAlign: "right", padding: "10px 14px", color: "#64748b", fontSize: 13, fontWeight: 600 }}>Stock</th>
                  <th style={{ textAlign: "center", padding: "10px 14px", color: "#64748b", fontSize: 13, fontWeight: 600 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {[...cat.products].sort((a,b) => a.name.localeCompare(b.name)).map(p => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9", textDecoration: p.discontinued ? "line-through" : "none", opacity: p.discontinued ? 0.6 : 1 }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 600, color: "#1e293b" }}>{p.name}</div>
                      {p.sku && <div style={{ fontSize: 12, color: "#94a3b8" }}>{p.sku}</div>}
                    </td>
                    <td style={{ padding: "12px 14px", color: "#64748b" }}>{p.brand_name || "—"}</td>
                    <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 600, color: "#334155" }}>{money(p.price)}</td>
                    <td style={{ padding: "12px 14px", textAlign: "right" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 6, fontSize: 13, fontWeight: 600,
                        background: (p.stock || 0) <= 5 ? "#fee2e2" : "#d1fae5",
                        color: (p.stock || 0) <= 5 ? "#991b1b" : "#065f46",
                      }}>
                        {p.stock || 0} {p.unit}
                      </span>
                    </td>
                    <td style={{ padding: "8px 14px", textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                        <button className={styles.secondaryButton} type="button" onClick={() => { setShowAdjustStock(p); setAdjustType("compra"); setAdjustQty(0); }}>Modificar stock</button>
                        <button className={styles.secondaryButton} type="button" onClick={() => openEdit(p)}>Editar</button>
                        {p.discontinued ? (
                          <button className={styles.secondaryButton} type="button" style={{ color: "#10b981" }} onClick={() => handleRestore(p.id)}>Restaurar</button>
                        ) : (
                          <button className={styles.dangerButton} type="button" onClick={() => handleDiscontinue(p.id)}>Dar de baja</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className={styles.empty}>No hay productos que mostrar.</div>
      )}

      {/* Modal: Agregar Producto */}
      {showAddProduct && (
        <div className={styles.modalOverlay} onClick={() => setShowAddProduct(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Agregar Producto</h2>
              <button className={styles.modalClose} onClick={() => setShowAddProduct(false)}>×</button>
            </div>
            <form onSubmit={handleAddProduct}>
              <div className={styles.formGrid}>
                <label className={styles.field} style={{ gridColumn: "1 / -1" }}>
                  Nombre
                  <input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required />
                </label>
                <label className={styles.field}>
                  Categoría
                  <select value={productForm.category_id} onChange={(e) => {
                    setProductForm({ ...productForm, category_id: e.target.value, sku: "" });
                    if (e.target.value) {
                      fetchJson<{sku:string}>(`/products/next-sku/${e.target.value}`).then(r => setProductForm(pf => ({ ...pf, sku: r.sku })));
                    }
                  }}>
                    <option value="">Sin categoría</option>
                    {[...categories].sort((a,b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  Precio
                  <input type="number" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} required />
                </label>
                <label className={styles.field}>
                  Unidad
                  <input value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })} placeholder="kg, lt, unidad..." />
                </label>
                <label className={styles.field}>
                  Stock
                  <input type="number" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} />
                </label>
                <label className={styles.field}>
                  Marca <span style={{ color: "#94a3b8", fontSize: 12 }}>(opcional)</span>
                  <input value={productForm.brand_name} onChange={(e) => setProductForm({ ...productForm, brand_name: e.target.value })} placeholder="Ej: Dorcle, HTH, Marca Blanca..." />
                </label>
                <label className={styles.field}>
                  SKU
                  <input value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} />
                </label>
                <label className={styles.field} style={{ gridColumn: "1 / -1" }}>
                  Descripción
                  <textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} rows={2} />
                </label>
                <label className={styles.field} style={{ gridColumn: "1 / -1" }}>
                  Info técnica
                  <textarea value={productForm.technical_info} onChange={(e) => setProductForm({ ...productForm, technical_info: e.target.value })} rows={2} />
                </label>
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <button className={styles.button} type="submit">Guardar</button>
                <button className={styles.secondaryButton} type="button" onClick={() => setShowAddProduct(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Producto */}
      {showEditProduct && (
        <div className={styles.modalOverlay} onClick={() => setShowEditProduct(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Editar Producto</h2>
              <button className={styles.modalClose} onClick={() => setShowEditProduct(null)}>×</button>
            </div>
            <form onSubmit={handleEditProduct}>
              <div className={styles.formGrid}>
                <label className={styles.field} style={{ gridColumn: "1 / -1" }}>
                  Nombre
                  <input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required />
                </label>
                <label className={styles.field}>
                  Categoría
                  <select value={productForm.category_id} onChange={(e) => {
                    setProductForm({ ...productForm, category_id: e.target.value, sku: "" });
                    if (e.target.value) {
                      fetchJson<{sku:string}>(`/products/next-sku/${e.target.value}`).then(r => setProductForm(pf => ({ ...pf, sku: r.sku })));
                    }
                  }}>
                    <option value="">Sin categoría</option>
                    {[...categories].sort((a,b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  Marca <span style={{ color: "#94a3b8", fontSize: 12 }}>(opcional)</span>
                  <input value={productForm.brand_name} onChange={(e) => setProductForm({ ...productForm, brand_name: e.target.value })} placeholder="Ej: Dorcle, HTH..." />
                </label>
                <label className={styles.field}>
                  Precio
                  <input type="number" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} required />
                </label>
                <label className={styles.field}>
                  Unidad
                  <input value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })} placeholder="kg, lt, unidad..." />
                </label>
                <label className={styles.field}>
                  Stock
                  <input type="number" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} />
                </label>
                <label className={styles.field}>
                  SKU
                  <input value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} />
                </label>
                <label className={styles.field} style={{ gridColumn: "1 / -1" }}>
                  Descripción
                  <textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} rows={2} />
                </label>
                <label className={styles.field} style={{ gridColumn: "1 / -1" }}>
                  Info técnica
                  <textarea value={productForm.technical_info} onChange={(e) => setProductForm({ ...productForm, technical_info: e.target.value })} rows={2} />
                </label>
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <button className={styles.button} type="submit">Guardar cambios</button>
                <button className={styles.secondaryButton} type="button" onClick={() => setShowEditProduct(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ajuste de Stock */}
      {showAdjustStock && (
        <div className={styles.modalOverlay} onClick={() => setShowAdjustStock(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Modificar stock — {showAdjustStock?.name}</h2>
              <button className={styles.modalClose} onClick={() => setShowAdjustStock(null)}>×</button>
            </div>
            <p style={{ color: "#64748b", marginBottom: 16 }}>Stock actual: <strong>{showAdjustStock?.stock || 0} {showAdjustStock?.unit}</strong></p>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {(["compra", "descarte", "ajuste"] as const).map(t => (
                <button
                  key={t}
                  className={adjustType === t ? styles.activeFilter : styles.filterButton}
                  onClick={() => setAdjustType(t)}
                >
                  {t === "compra" ? "Compra (+)" : t === "descarte" ? "Descarte (−)" : "Ajuste (valor)"}
                </button>
              ))}
            </div>
            <form onSubmit={handleAdjustStock}>
              <label className={styles.field}>
                Cantidad
                <input type="number" value={adjustQty} onChange={(e) => setAdjustQty(Number(e.target.value))} required />
              </label>
              <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                {adjustType === "compra" && `Se sumarán ${adjustQty} al stock.`}
                {adjustType === "descarte" && `Se restarán ${adjustQty} del stock.`}
                {adjustType === "ajuste" && `El stock quedará en exactamente ${adjustQty}.`}
              </p>
              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <button className={styles.button} type="submit">Aplicar</button>
                <button className={styles.secondaryButton} type="button" onClick={() => setShowAdjustStock(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: ABM Categorías */}
      {showAddCategory && (
        <div className={styles.modalOverlay} onClick={() => setShowAddCategory(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>ABM Categorías</h2>
              <button className={styles.modalClose} onClick={() => setShowAddCategory(false)}>×</button>
            </div>
            <form onSubmit={handleAddCategory} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={categoryForm.name} onChange={(e) => setCategoryForm({ name: e.target.value })} placeholder="Nueva categoría" style={{ flex: 1, padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8 }} required />
                <button className={styles.button} type="submit">Agregar</button>
              </div>
            </form>
            <div>
              {[...categories].sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span><strong>{catPrefix(c.id)}</strong> — {c.name}</span>
                  <button style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 13 }} onClick={() => handleDeleteCategory(c.id)}>Eliminar</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
