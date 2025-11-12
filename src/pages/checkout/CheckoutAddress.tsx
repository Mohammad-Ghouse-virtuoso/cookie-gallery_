import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEmptyCheckoutAddress, loadCheckoutAddress, persistCheckoutAddress } from '@/lib/checkoutAddressStorage';
import type { CheckoutAddress } from '@/types/checkout';

const fieldClasses = 'w-full rounded-[12px] border border-[rgba(58,45,36,0.12)] bg-white px-4 py-3 text-sm text-[#3B2B1A] placeholder:text-[#B9AFA6] shadow-[inset_0_1px_2px_rgba(58,45,36,0.04)] transition-[border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-[#CFA676] focus-visible:shadow-[0_0_0_4px_rgba(226,185,127,0.18)]';

const emptyErrors: Record<keyof CheckoutAddress, string> = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
};

export default function CheckoutAddressPage() {
  const navigate = useNavigate();
  const [address, setAddress] = useState<CheckoutAddress>(() => loadCheckoutAddress() ?? getEmptyCheckoutAddress());
  const [errors, setErrors] = useState(emptyErrors);
  const [saving, setSaving] = useState(false);

  const handleFieldChange = (field: keyof CheckoutAddress, value: string) => {
    setAddress(prev => ({
      ...prev,
      [field]: value,
    }));
    setErrors(prev => ({
      ...prev,
      [field]: '',
    }));
  };

  const validate = () => {
    const nextErrors = { ...emptyErrors };
    if (!address.fullName.trim()) nextErrors.fullName = 'Please add a recipient name.';
    if (!/^\+?\d[\d\s-]{7,}$/.test(address.phone.trim())) nextErrors.phone = 'Enter a valid phone number (at least 8 digits).';
    if (!address.line1.trim()) nextErrors.line1 = 'Street address is required.';
    if (!address.city.trim()) nextErrors.city = 'City is required.';
    if (!address.postalCode.trim()) nextErrors.postalCode = 'Postal code is required.';
    if (!address.country.trim()) nextErrors.country = 'Country is required.';
    setErrors(nextErrors);
    return Object.values(nextErrors).every(value => !value);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }
    setSaving(true);
    persistCheckoutAddress(address);
    window.setTimeout(() => {
      setSaving(false);
      navigate('/checkout');
    }, 120);
  };

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#FDF8F2] py-12">
      <div className="mx-auto w-full max-w-3xl rounded-[20px] border border-[rgba(226,185,127,0.24)] bg-white p-6 sm:p-10 shadow-[0_18px_36px_rgba(59,43,26,0.08)]">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.32em] text-[#8E7360]">Checkout</p>
          <h1 className="text-[2.25rem] font-semibold text-[#3B2B1A]" style={{ fontFamily: '"Playfair Display", serif' }}>
            Where should we send your cookies?
          </h1>
          <p className="max-w-2xl text-sm text-[#6B5E57]">
            We’ll use this address to calculate delivery and share it with our courier partner. You can edit it anytime before payment.
          </p>
        </header>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="fullName" className="block text-sm font-semibold text-[#3B2B1A]">Full name</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={address.fullName}
                onChange={event => handleFieldChange('fullName', event.target.value)}
                className={`${fieldClasses} ${errors.fullName ? 'border-[#E35B48]' : ''}`}
                autoComplete="name"
              />
              {errors.fullName && <p className="mt-1 text-sm text-[#E35B48]">{errors.fullName}</p>}
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-[#3B2B1A]">Phone number</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={address.phone}
                onChange={event => handleFieldChange('phone', event.target.value)}
                className={`${fieldClasses} ${errors.phone ? 'border-[#E35B48]' : ''}`}
                autoComplete="tel"
              />
              {errors.phone && <p className="mt-1 text-sm text-[#E35B48]">{errors.phone}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="line1" className="block text-sm font-semibold text-[#3B2B1A]">Address line 1</label>
            <input
              id="line1"
              name="line1"
              type="text"
              value={address.line1}
              onChange={event => handleFieldChange('line1', event.target.value)}
              className={`${fieldClasses} ${errors.line1 ? 'border-[#E35B48]' : ''}`}
              autoComplete="address-line1"
            />
            {errors.line1 && <p className="mt-1 text-sm text-[#E35B48]">{errors.line1}</p>}
          </div>

          <div>
            <label htmlFor="line2" className="block text-sm font-semibold text-[#3B2B1A]">Address line 2 (optional)</label>
            <input
              id="line2"
              name="line2"
              type="text"
              value={address.line2 ?? ''}
              onChange={event => handleFieldChange('line2', event.target.value)}
              className={fieldClasses}
              autoComplete="address-line2"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="city" className="block text-sm font-semibold text-[#3B2B1A]">City</label>
              <input
                id="city"
                name="city"
                type="text"
                value={address.city}
                onChange={event => handleFieldChange('city', event.target.value)}
                className={`${fieldClasses} ${errors.city ? 'border-[#E35B48]' : ''}`}
                autoComplete="address-level2"
              />
              {errors.city && <p className="mt-1 text-sm text-[#E35B48]">{errors.city}</p>}
            </div>
            <div>
              <label htmlFor="state" className="block text-sm font-semibold text-[#3B2B1A]">State / Region</label>
              <input
                id="state"
                name="state"
                type="text"
                value={address.state ?? ''}
                onChange={event => handleFieldChange('state', event.target.value)}
                className={fieldClasses}
                autoComplete="address-level1"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div>
              <label htmlFor="postalCode" className="block text-sm font-semibold text-[#3B2B1A]">Postal code</label>
              <input
                id="postalCode"
                name="postalCode"
                type="text"
                value={address.postalCode}
                onChange={event => handleFieldChange('postalCode', event.target.value)}
                className={`${fieldClasses} ${errors.postalCode ? 'border-[#E35B48]' : ''}`}
                autoComplete="postal-code"
              />
              {errors.postalCode && <p className="mt-1 text-sm text-[#E35B48]">{errors.postalCode}</p>}
            </div>
            <div>
              <label htmlFor="country" className="block text-sm font-semibold text-[#3B2B1A]">Country</label>
              <input
                id="country"
                name="country"
                type="text"
                value={address.country}
                onChange={event => handleFieldChange('country', event.target.value)}
                className={`${fieldClasses} ${errors.country ? 'border-[#E35B48]' : ''}`}
                autoComplete="country-name"
              />
              {errors.country && <p className="mt-1 text-sm text-[#E35B48]">{errors.country}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center rounded-[12px] border border-[rgba(226,185,127,0.34)] bg-white px-5 py-2.5 text-sm font-semibold text-[#6B5E57] transition-colors duration-200 hover:bg-[#FFF1E5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(226,185,127,0.32)]"
            >
              Back to Cart
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`inline-flex items-center justify-center rounded-[12px] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(196,122,65,0.28)] transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B2B1A] ${
                saving ? 'bg-[#CFA676] cursor-wait' : 'bg-[#C47A41] hover:-translate-y-0.5 hover:bg-[#D48B52]'
              }`}
            >
              {saving ? 'Saving…' : 'Save & Continue'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
