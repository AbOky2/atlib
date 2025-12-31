/**
 * Formate un nombre en devise
 * @param {number} quantity - Le montant à formater
 * @param {string} currency - Le code de la devise (ex: 'USD', 'EUR')
 * @returns {string} Le montant formaté
 */
export const formatCurrency = (quantity, currency = 'XAF') => {
  if (quantity === null || quantity === undefined) return '';

  const formatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return formatter.format(quantity);
};

/**
 * Composant Currency compatible avec react-currency-formatter
 */
export const Currency = ({ quantity, currency = 'XAF' }) => {
  return formatCurrency(quantity, currency);
};

export default Currency;

