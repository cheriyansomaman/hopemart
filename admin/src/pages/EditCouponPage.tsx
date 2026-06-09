import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { couponService } from '../services/couponService';

type DiscountType = 'percent' | 'fixed';

export default function EditCouponPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [type, setType] = useState<DiscountType>('percent');
  const [discount, setDiscount] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [usedCount, setUsedCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!code) return;
    const fetchCoupon = async () => {
      try {
        const data = await couponService.getByCode(code);
        setType(data.type || 'percent');
        setDiscount(data.discount?.toString() || '');
        setMinOrder(data.minOrder?.toString() || '');
        setMaxUses(data.maxUses?.toString() || '');
        setUsedCount(data.usedCount || 0);
        if (data.expiresAt) {
          setExpiresAt(new Date(data.expiresAt).toISOString().slice(0, 10));
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError('Failed to load coupon data: ' + msg);
      } finally {
        setLoading(false);
      }
    };

    fetchCoupon();
  }, [code]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setError('');
    setSuccess('');

    if (!expiresAt) {
      setError('Expiry date is required.');
      return;
    }

    setSaving(true);
    try {
      await couponService.update(code, {
        type,
        discount: parseFloat(discount),
        minOrder: minOrder ? parseFloat(minOrder) : 0,
        maxUses: maxUses ? parseInt(maxUses, 10) : 0,
        expiresAt: new Date(expiresAt).toISOString(),
      });

      setSuccess(`Coupon "${code}" updated successfully!`);
      setTimeout(() => {
        navigate('/coupons');
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  if (loading) {
    return (
      <div className="max-w-2xl bg-white rounded-xl border border-slate-200 shadow-sm p-8 animate-pulse space-y-6">
        <div className="h-6 bg-slate-100 rounded w-1/4" />
        <div className="h-10 bg-slate-100 rounded w-full" />
        <div className="h-24 bg-slate-100 rounded w-full" />
        <div className="h-12 bg-slate-100 rounded w-1/3 ml-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Section: Coupon Code (Read-Only) */}
        <Section title="Coupon Code" description="The unique code code for this coupon. (Cannot be modified)">
          <Field label="Code">
            <input
              disabled
              value={code}
              className={`${inp} font-mono tracking-widest uppercase bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed`}
            />
            <p className={hint}>Coupon codes cannot be renamed. Create a new coupon if you need a different code.</p>
          </Field>
        </Section>

        <Divider />

        {/* Section: Discount */}
        <Section title="Discount" description="Type and value of the discount.">
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">
              Discount Type <span className="text-slate-400">*</span>
            </p>
            <div className="flex gap-2">
              {[
                { value: 'percent' as DiscountType, label: '% Percentage', symbol: '%' },
                { value: 'fixed' as DiscountType, label: '£ Fixed Amount', symbol: '£' },
              ].map((t) => (
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
              <input
                required
                type="number"
                min="0"
                step={type === 'percent' ? '1' : '0.01'}
                max={type === 'percent' ? '100' : undefined}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder={type === 'percent' ? 'e.g. 10' : 'e.g. 5.00'}
                className={`${inp} pl-8`}
              />
            </div>
          </Field>
        </Section>

        <Divider />

        {/* Section: Limits */}
        <Section title="Limits & Expiry" description="Control when and how many times the coupon can be used.">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Minimum Order (£)">
              <div className="relative">
                <span className={adornLeft}>£</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={minOrder}
                  onChange={(e) => setMinOrder(e.target.value)}
                  placeholder="No minimum"
                  className={`${inp} pl-8`}
                />
              </div>
            </Field>
            <Field label="Usage Limit">
              <input
                type="number"
                min="1"
                step="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited"
                className={inp}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Expiry Date" required>
              <input
                required
                type="date"
                min={today}
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className={inp}
              />
            </Field>
            <Field label="Currently Used">
              <input
                disabled
                value={`${usedCount} use(s)`}
                className={`${inp} bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed`}
              />
            </Field>
          </div>
        </Section>

        {/* Live Preview */}
        {code && discount && (
          <>
            <Divider />
            <div className="px-6 py-5">
              <p className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wider">Preview</p>
              <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-violet-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 font-mono tracking-widest text-sm">{code.toUpperCase()}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {type === 'percent' ? `${discount}% off` : `£${discount} off`}
                    {minOrder ? ` · min order £${minOrder}` : ''}
                    {maxUses ? ` · ${maxUses} uses max` : ' · unlimited uses'}
                    {expiresAt ? ` · expires ${expiresAt}` : ''}
                  </p>
                </div>
                <span
                  className="ml-auto flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium
                                 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Active
                </span>
              </div>
            </div>
          </>
        )}

        {/* Alerts */}
        {(error || success) && (
          <div className="px-6 pb-4">
            {error && <Alert type="error">{error}</Alert>}
            {success && <Alert type="success">{success}</Alert>}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/coupons')}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 active:bg-violet-800
                       text-white px-5 py-2 rounded-lg font-medium text-sm
                       disabled:opacity-50 transition-colors duration-150 shadow-sm
                       cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// styles
const inp = `w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900
  placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500
  focus:border-transparent transition-colors duration-150 bg-white`;

const adornLeft = `absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium pointer-events-none`;
const hint = `text-xs text-slate-400 mt-1.5`;

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
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

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-slate-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Alert({ type, children }: { type: 'error' | 'success'; children: React.ReactNode }) {
  const styles = type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700';
  const icon =
    type === 'error'
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
