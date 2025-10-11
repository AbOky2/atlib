/**
 * Formate un nombre en devise
 * @param {number} quantity - Le montant à formater
 * @param {string} currency - Le code de la devise (ex: 'USD', 'EUR')
 * @returns {string} Le montant formaté
 */
export const formatCurrency = (quantity, currency = 'USD') => {
  if (quantity === null || quantity === undefined) return '';
  
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(quantity);
};

/**
 * Composant Currency compatible avec react-currency-formatter
 */
export const Currency = ({ quantity, currency = 'USD' }) => {
  return formatCurrency(quantity, currency);
};

export default Currency;

