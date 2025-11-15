const flagValue = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FEATURE_CHECKOUT_PAGE : undefined;

export const checkoutPageEnabled = flagValue === undefined || flagValue === null ? true : String(flagValue).toLowerCase() !== 'false';

export default {
  checkoutPageEnabled,
};
