import { useState } from 'react';
import { productService } from '../services/productService';

type StockMode = 'quantity' | 'weight';
const MAX_PRODUCT_IMAGE_BYTES = 700 * 1024;

export default function AddProductPage() {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [stockMode, setStockMode] = useState<StockMode>('quantity');

  // quantity mode
  const [stock, setStock] = useState('');
  const [showWeight, setShowWeight] = useState(false);
  const [weightPerUnit, setWeightPerUnit] = useState('');
  const [showDimensions, setShowDimensions] = useState(false);
  const [dimWidth, setDimWidth] = useState('');
  const [dimHeight, setDimHeight] = useState('');
  const [dimLength, setDimLength] = useState('');

  // weight mode
  const [totalWeightKg, setTotalWeightKg] = useState('');

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > MAX_PRODUCT_IMAGE_BYTES) {
      setError('Product image must be 700 KB or smaller.');
      setImage(null);
      setImagePreview('');
      e.target.value = '';
      return;
    }
    setError('');
    setImage(file);
    setImagePreview(file ? URL.createObjectURL(file) : '');
  };

  const reset = () => {
    setName(''); setPrice(''); setCategory('');
    setStock(''); setWeightPerUnit(''); setDimWidth(''); setDimHeight(''); setDimLength('');
    setTotalWeightKg('');
    setShowWeight(false); setShowDimensions(false);
    setStockMode('quantity');
    setImage(null); setImagePreview('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (stockMode === 'quantity' && !stock) { setError('Stock quantity is required.'); return; }
    if (stockMode === 'weight' && !totalWeightKg) { setError('Total weight is required.'); return; }

    setLoading(true);
    try {
      let productImage = '';
      if (image) {
        productImage = await productService.imageFileToBase64(image);
      }

      const payload: Record<string, unknown> = {
        name: name.trim(),
        price: parseFloat(price),
        category: category.trim(),
        imageUrl: productImage,
        productImage,
        stockType: stockMode,
      };

      if (stockMode === 'quantity') {
        payload.stock = parseInt(stock, 10);
        if (showWeight && weightPerUnit) {
          payload.weightPerUnit = parseFloat(weightPerUnit);
        }
        if (showDimensions && (dimWidth || dimHeight || dimLength)) {
          payload.dimensions = {
            ...(dimWidth  && { width:  parseFloat(dimWidth) }),
            ...(dimHeight && { height: parseFloat(dimHeight) }),
            ...(dimLength && { length: parseFloat(dimLength) }),
          };
        }
      } else {
        payload.stock = 0;
        payload.totalWeight = parseFloat(totalWeightKg);
        payload.weightUnit = 'kg';
      }

      await productService.create(payload as Parameters<typeof productService.create>[0]);
      setSuccess(`"${name}" added successfully!`);
      reset();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

        {/* ── Section: Basic Info ── */}
        <Section title="Basic Information" description="Name, price, and category of the product.">
          <div className="grid grid-cols-2 gap-5">
            <Field label="Product Name" required>
              <input required value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Organic Apples" className={inp} />
            </Field>
            <Field label="Price" required>
              <div className="relative">
                <span className={adornLeft}>£</span>
                <input required type="number" min="0" step="0.01" value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0.00" className={`${inp} pl-8`} />
              </div>
            </Field>
          </div>
          <Field label="Category">
            <input value={category} onChange={e => setCategory(e.target.value)}
              placeholder="e.g. Fruits, Dairy, Bakery" className={inp} />
          </Field>
        </Section>

        <Divider />

        {/* ── Section: Stock ── */}
        <Section title="Stock Management" description="How inventory is tracked for this product.">

          {/* Mode selector */}
          <div className="flex gap-2">
            <ModeCard
              active={stockMode === 'quantity'}
              onClick={() => setStockMode('quantity')}
              title="By Quantity"
              desc="Track number of units"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              }
            />
            <ModeCard
              active={stockMode === 'weight'}
              onClick={() => setStockMode('weight')}
              title="By Weight"
              desc="Track total kg available"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              }
            />
          </div>

          {/* Quantity fields */}
          {stockMode === 'quantity' && (
            <>
              <Field label="Stock Quantity" required>
                <input required type="number" min="0" step="1" value={stock}
                  onChange={e => setStock(e.target.value)}
                  placeholder="e.g. 100" className={inp} />
              </Field>

              {/* Optional detail chips */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Optional details</p>
                <div className="flex gap-2 flex-wrap">
                  <Chip active={showWeight}
                    onClick={() => { setShowWeight(v => !v); setWeightPerUnit(''); }}
                    label="Weight per unit" />
                  <Chip active={showDimensions}
                    onClick={() => { setShowDimensions(v => !v); setDimWidth(''); setDimHeight(''); setDimLength(''); }}
                    label="Dimensions" />
                </div>
              </div>

              {showWeight && (
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                  <Field label="Weight per Unit (kg)">
                    <div className="relative">
                      <input type="number" min="0" step="0.001" value={weightPerUnit}
                        onChange={e => setWeightPerUnit(e.target.value)}
                        placeholder="e.g. 0.250" className={inp} />
                      <span className={adornRight}>kg</span>
                    </div>
                    <p className={hint}>Shown to customers as product info.</p>
                  </Field>
                </div>
              )}

              {showDimensions && (
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-700 mb-3">Dimensions (cm)</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Width', val: dimWidth, set: setDimWidth },
                      { label: 'Height', val: dimHeight, set: setDimHeight },
                      { label: 'Length', val: dimLength, set: setDimLength },
                    ].map(d => (
                      <div key={d.label}>
                        <label className="block text-xs text-slate-500 mb-1.5">{d.label}</label>
                        <div className="relative">
                          <input type="number" min="0" step="0.1" value={d.val}
                            onChange={e => d.set(e.target.value)}
                            placeholder="0.0" className={inp} />
                          <span className={adornRight}>cm</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Weight fields */}
          {stockMode === 'weight' && (
            <Field label="Total Available Weight" required>
              <div className="relative">
                <input required type="number" min="0" step="0.001" value={totalWeightKg}
                  onChange={e => setTotalWeightKg(e.target.value)}
                  placeholder="e.g. 5.5" className={inp} />
                <span className={adornRight}>kg</span>
              </div>
              <p className={hint}>Total stock available. Customers pick desired amount.</p>
            </Field>
          )}
        </Section>

        <Divider />

        {/* ── Section: Image ── */}
        <Section title="Product Image" description="Optional. Shown in the store listing.">
          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed
                            border-slate-200 rounded-lg cursor-pointer hover:border-violet-400
                            hover:bg-violet-50/40 transition-colors duration-150 group">
            {imagePreview ? (
              <img src={imagePreview} alt="preview" className="h-full w-full object-cover rounded-lg" />
            ) : (
              <div className="text-center px-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center
                                mx-auto mb-3 group-hover:bg-violet-100 transition-colors">
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-violet-500 transition-colors"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-600">Click to upload</p>
                <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 700 KB</p>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
          </label>
        </Section>

        {/* ── Alerts ── */}
        {(error || success) && (
          <div className="px-6 pb-4">
            {error && <Alert type="error">{error}</Alert>}
            {success && <Alert type="success">{success}</Alert>}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-xs text-slate-400">Fields marked * are required</p>
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 active:bg-violet-800
                       text-white px-5 py-2 rounded-lg font-medium text-sm
                       disabled:opacity-50 transition-colors duration-150 shadow-sm
                       cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2">
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Saving…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Product
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────
const inp = `w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900
  placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500
  focus:border-transparent transition-colors duration-150 bg-white`;

const adornLeft = `absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium pointer-events-none`;
const adornRight = `absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium pointer-events-none`;
const hint = `text-xs text-slate-400 mt-1.5`;

// ── Sub-components ─────────────────────────────────────
function Section({ title, description, children }: {
  title: string; description: string; children: React.ReactNode;
}) {
  return (
    <div className="px-6 py-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-slate-100 mx-0" />;
}

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}{required && <span className="text-slate-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function ModeCard({ active, onClick, title, desc, icon }: {
  active: boolean; onClick: () => void; title: string; desc: string; icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center gap-3 px-4 py-3.5 rounded-lg border-2 text-left
                 transition-all duration-150 cursor-pointer ${
        active
          ? 'border-violet-500 bg-violet-50'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
        active ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'
      }`}>
        {icon}
      </div>
      <div>
        <p className={`text-sm font-medium ${active ? 'text-violet-700' : 'text-slate-700'}`}>{title}</p>
        <p className={`text-xs mt-0.5 ${active ? 'text-violet-500' : 'text-slate-400'}`}>{desc}</p>
      </div>
      {active && (
        <svg className="w-4 h-4 text-violet-500 ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                 border transition-all duration-150 cursor-pointer ${
        active
          ? 'bg-violet-600 text-white border-violet-600'
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-800'
      }`}
    >
      {active ? (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      )}
      {label}
    </button>
  );
}

function Alert({ type, children }: { type: 'error' | 'success'; children: React.ReactNode }) {
  const styles = type === 'error'
    ? 'bg-red-50 border-red-200 text-red-700'
    : 'bg-emerald-50 border-emerald-200 text-emerald-700';
  const icon = type === 'error'
    ? 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
    : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
  return (
    <div className={`flex items-center gap-2.5 border rounded-lg px-4 py-3 text-sm ${styles}`}>
      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d={icon} clipRule="evenodd" />
      </svg>
      {children}
    </div>
  );
}
