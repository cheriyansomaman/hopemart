import { useState } from 'react';
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

type DiscountType = 'percent' | 'fixed';

export default function AddCouponPage() {
  const [code, setCode] = useState('');
  const [type, setType] = useState<DiscountType>('percent');
  const [discount, setDiscount] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setCode(''); setDiscount(''); setMinOrder('');
    setMaxUses(''); setExpiresAt(''); setType('percent');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const codeUpper = code.trim().toUpperCase();
    if (!codeUpper) { setError('Coupon code is required.'); return; }
    if (!expiresAt) { setError('Expiry date is required.'); return; }

    setLoading(true);
    try {
      await setDoc(doc(db, 'coupons', codeUpper), {
        code: codeUpper,
        type,
        discount: parseFloat(discount),
        minOrder: minOrder ? parseFloat(minOrder) : 0,
        maxUses: maxUses ? parseInt(maxUses, 10) : 0,
        usedCount: 0,
        expiresAt: Timestamp.fromDate(new Date(expiresAt)),
        createdAt: serverTimestamp(),
      });
      setSuccess(`Coupon "${codeUpper}" created successfully!`);
      reset();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-2xl">
      <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

        {/* ── Section: Coupon Code ── */}
        <Section title="Coupon Code" description="Unique code customers enter at checkout.">
          <Field label="Code" required>
            <input required value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. SAVE10"
              className={`${inp} font-mono tracking-widest uppercase`} />
            <p className={hint}>Auto-uppercased · Must be unique</p>
          </Field>
        </Section>

        <Divider />

        {/* ── Section: Discount ── */}
        <Section title="Discount" description="Type and value of the discount.">

          {/* Type selector */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Discount Type <span className="text-slate-400">*</span></p>
            <div className="flex gap-2">
              {([
                { value: 'percent' as DiscountType, label: '% Percentage', symbol: '%' },
                { value: 'fixed'   as DiscountType, label: '£ Fixed Amount', symbol: '£' },
              ]).map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2
                             text-sm font-medium transition-all duration-150 cursor-pointer ${
                    type === t.value
                      ? 'border-violet-500 bg-violet-50 text-violet-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className={`text-lg font-bold leading-none ${type === t.value ? 'text-violet-600' : 'text-slate-400'}`}>
                    {t.symbol}
                  </span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <Field label={`Discount Value ${type === 'percent' ? '(%)' : '(£)'}`} required>
            <div className="relative">
              <span className={adornLeft}>{type === 'percent' ? '%' : '£'}</span>
              <input required type="number" min="0"
                step={type === 'percent' ? '1' : '0.01'}
                max={type === 'percent' ? '100' : undefined}
                value={discount} onChange={e => setDiscount(e.target.value)}
                placeholder={type === 'percent' ? 'e.g. 10' : 'e.g. 5.00'}
                className={`${inp} pl-8`} />
            </div>
          </Field>
        </Section>

        <Divider />

        {/* ── Section: Limits ── */}
        <Section title="Limits & Expiry" description="Control when and how many times the coupon can be used.">

          <div className="grid grid-cols-2 gap-4">
            <Field label="Minimum Order (£)">
              <div className="relative">
                <span className={adornLeft}>£</span>
                <input type="number" min="0" step="0.01" value={minOrder}
                  onChange={e => setMinOrder(e.target.value)}
                  placeholder="No minimum" className={`${inp} pl-8`} />
              </div>
            </Field>
            <Field label="Usage Limit">
              <input type="number" min="1" step="1" value={maxUses}
                onChange={e => setMaxUses(e.target.value)}
                placeholder="Unlimited" className={inp} />
            </Field>
          </div>

          <Field label="Expiry Date" required>
            <input required type="date" min={today} value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)} className={inp} />
          </Field>
        </Section>

        {/* ── Live Preview ── */}
        {code && discount && (
          <>
            <Divider />
            <div className="px-6 py-5">
              <p className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wider">Preview</p>
              <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-violet-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 font-mono tracking-widest text-sm">
                    {code.toUpperCase()}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {type === 'percent' ? `${discount}% off` : `£${discount} off`}
                    {minOrder ? ` · min order £${minOrder}` : ''}
                    {maxUses ? ` · ${maxUses} uses max` : ' · unlimited uses'}
                    {expiresAt ? ` · expires ${expiresAt}` : ''}
                  </p>
                </div>
                <span className="ml-auto flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium
                                 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Active
                </span>
              </div>
            </div>
          </>
        )}

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
                Create Coupon
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
  return <div className="h-px bg-slate-100" />;
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
