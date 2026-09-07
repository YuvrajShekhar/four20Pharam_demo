import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const ENTRY_TYPES = ["RECEIPT", "DISPENSE", "DISPOSAL", "ADJUSTMENT"];
const SCHEDULES = ["Anlage I", "Anlage II", "Anlage III"];

function App() {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [entries, setEntries] = useState([]);
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState("");

  const [newProduct, setNewProduct] = useState({ name: "", unit: "g", btm_schedule: "Anlage III" });
  const [newEntry, setNewEntry] = useState({
    entry_type: "RECEIPT",
    quantity: "",
    batch_ref: "",
    responsible_person: "",
    notes: "",
  });

  const loadProducts = async () => {
    const res = await fetch(`${API_URL}/products`);
    const data = await res.json();
    setProducts(data);
    if (!selectedProductId && data.length > 0) {
      setSelectedProductId(data[0].id);
    }
  };

  const loadEntriesAndBalance = async (productId) => {
    if (!productId) {
      setEntries([]);
      setBalance(null);
      return;
    }
    const [entriesRes, balanceRes] = await Promise.all([
      fetch(`${API_URL}/entries?product_id=${productId}`),
      fetch(`${API_URL}/balance/${productId}`),
    ]);
    setEntries(await entriesRes.json());
    setBalance(balanceRes.ok ? await balanceRes.json() : null);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    loadEntriesAndBalance(selectedProductId);
  }, [selectedProductId]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setError("");
    if (!newProduct.name.trim()) return;
    const res = await fetch(`${API_URL}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProduct),
    });
    if (!res.ok) {
      setError("Could not create product");
      return;
    }
    const created = await res.json();
    setNewProduct({ name: "", unit: "g", btm_schedule: "Anlage III" });
    await loadProducts();
    setSelectedProductId(created.id);
  };

  const handleCreateEntry = async (e) => {
    e.preventDefault();
    setError("");
    if (!selectedProductId) {
      setError("Select or create a product first");
      return;
    }
    if (!newEntry.quantity || !newEntry.batch_ref || !newEntry.responsible_person) {
      setError("Quantity, batch reference, and responsible person are required");
      return;
    }
    const res = await fetch(`${API_URL}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newEntry,
        product_id: selectedProductId,
        quantity: parseFloat(newEntry.quantity),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.detail || "Entry rejected");
      return;
    }
    setNewEntry({ entry_type: "RECEIPT", quantity: "", batch_ref: "", responsible_person: "", notes: "" });
    await loadEntriesAndBalance(selectedProductId);
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div>
      <h1>BtM Digital Register</h1>
      <p className="subtitle">
        Append-only narcotics stock ledger with running balance reconciliation. No entry can ever be
        edited or deleted &mdash; corrections are logged as new ADJUSTMENT entries, mirroring the
        auditability required under BtMG/BtMVV recordkeeping.
      </p>

      <div className="card">
        <h2>Add product</h2>
        <form onSubmit={handleCreateProduct}>
          <div className="row">
            <div className="field">
              <label>Product name</label>
              <input
                placeholder="e.g. Cannabis Flos Bedrocan 22%"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Unit</label>
              <select
                value={newProduct.unit}
                onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
              >
                <option value="g">g</option>
                <option value="mg">mg</option>
                <option value="ml">ml</option>
                <option value="units">units</option>
              </select>
            </div>
            <div className="field">
              <label>BtM Schedule</label>
              <select
                value={newProduct.btm_schedule}
                onChange={(e) => setNewProduct({ ...newProduct, btm_schedule: e.target.value })}
              >
                {SCHEDULES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <button type="submit">Add product</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Select product</h2>
        <select
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          style={{ width: "100%" }}
        >
          <option value="">-- choose a product --</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.unit}, {p.btm_schedule})
            </option>
          ))}
        </select>
      </div>

      {balance && (
        <div className="card">
          <h2>Balance &mdash; {selectedProduct?.name}</h2>
          <div className="balance-grid">
            <div className="balance-item">
              <div className="label">Receipts</div>
              <div className="value">+{balance.total_receipts}</div>
            </div>
            <div className="balance-item">
              <div className="label">Dispensed</div>
              <div className="value">-{balance.total_dispensed}</div>
            </div>
            <div className="balance-item">
              <div className="label">Disposed</div>
              <div className="value">-{balance.total_disposed}</div>
            </div>
            <div className="balance-item">
              <div className="label">Adjustments</div>
              <div className="value">{balance.total_adjustments >= 0 ? "+" : ""}{balance.total_adjustments}</div>
            </div>
            <div className="balance-item current">
              <div className="label">Current balance</div>
              <div className="value">{balance.current_balance} {balance.unit}</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Log entry</h2>
        <form onSubmit={handleCreateEntry}>
          <div className="row">
            <div className="field">
              <label>Type</label>
              <select
                value={newEntry.entry_type}
                onChange={(e) => setNewEntry({ ...newEntry, entry_type: e.target.value })}
              >
                {ENTRY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Quantity {selectedProduct ? `(${selectedProduct.unit})` : ""}</label>
              <input
                type="number"
                step="any"
                min="0"
                value={newEntry.quantity}
                onChange={(e) => setNewEntry({ ...newEntry, quantity: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Batch reference</label>
              <input
                placeholder="e.g. IMP-2026-0091"
                value={newEntry.batch_ref}
                onChange={(e) => setNewEntry({ ...newEntry, batch_ref: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Responsible person</label>
              <input
                placeholder="Full name"
                value={newEntry.responsible_person}
                onChange={(e) => setNewEntry({ ...newEntry, responsible_person: e.target.value })}
              />
            </div>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <div className="field" style={{ flex: 3 }}>
              <label>Notes (optional)</label>
              <input
                placeholder="e.g. Dispensed to Apotheke Muster"
                value={newEntry.notes}
                onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
              />
            </div>
            <button type="submit">Log entry</button>
          </div>
        </form>
        {error && <div className="error">{error}</div>}
      </div>

      <div className="card">
        <h2>Ledger ({entries.length} {entries.length === 1 ? "entry" : "entries"})</h2>
        {entries.length === 0 ? (
          <div className="empty">No entries yet for this product.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Qty</th>
                <th>Batch ref</th>
                <th>Responsible</th>
                <th>Notes</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td><span className={`badge ${e.entry_type}`}>{e.entry_type}</span></td>
                  <td>{e.quantity}</td>
                  <td>{e.batch_ref}</td>
                  <td>{e.responsible_person}</td>
                  <td>{e.notes || "-"}</td>
                  <td>{new Date(e.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default App;
