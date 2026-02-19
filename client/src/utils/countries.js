/**
 * Comprehensive countries list with currency information.
 * Includes all African countries + major international destinations.
 * Used for Layer 1 (country field) and Layer 2 (multi-currency) support.
 */

const countriesData = [
  // Africa – primary market
  { name: 'Nigeria', currency: 'NGN', symbol: '₦', currencyName: 'Nigerian Naira', hasStates: true },
  { name: 'Ghana', currency: 'GHS', symbol: 'GH₵', currencyName: 'Ghanaian Cedi' },
  { name: 'Kenya', currency: 'KES', symbol: 'KSh', currencyName: 'Kenyan Shilling' },
  { name: 'South Africa', currency: 'ZAR', symbol: 'R', currencyName: 'South African Rand' },
  { name: 'Ethiopia', currency: 'ETB', symbol: 'Br', currencyName: 'Ethiopian Birr' },
  { name: 'Tanzania', currency: 'TZS', symbol: 'TSh', currencyName: 'Tanzanian Shilling' },
  { name: 'Uganda', currency: 'UGX', symbol: 'USh', currencyName: 'Ugandan Shilling' },
  { name: 'Rwanda', currency: 'RWF', symbol: 'RF', currencyName: 'Rwandan Franc' },
  { name: 'Cameroon', currency: 'XAF', symbol: 'FCFA', currencyName: 'Central African CFA Franc' },
  { name: 'Senegal', currency: 'XOF', symbol: 'CFA', currencyName: 'West African CFA Franc' },
  { name: 'Côte d\'Ivoire', currency: 'XOF', symbol: 'CFA', currencyName: 'West African CFA Franc' },
  { name: 'Mali', currency: 'XOF', symbol: 'CFA', currencyName: 'West African CFA Franc' },
  { name: 'Burkina Faso', currency: 'XOF', symbol: 'CFA', currencyName: 'West African CFA Franc' },
  { name: 'Niger', currency: 'XOF', symbol: 'CFA', currencyName: 'West African CFA Franc' },
  { name: 'Guinea', currency: 'GNF', symbol: 'FG', currencyName: 'Guinean Franc' },
  { name: 'Togo', currency: 'XOF', symbol: 'CFA', currencyName: 'West African CFA Franc' },
  { name: 'Benin', currency: 'XOF', symbol: 'CFA', currencyName: 'West African CFA Franc' },
  { name: 'Liberia', currency: 'LRD', symbol: 'L$', currencyName: 'Liberian Dollar' },
  { name: 'Sierra Leone', currency: 'SLL', symbol: 'Le', currencyName: 'Sierra Leonean Leone' },
  { name: 'Gambia', currency: 'GMD', symbol: 'D', currencyName: 'Gambian Dalasi' },
  { name: 'Guinea-Bissau', currency: 'XOF', symbol: 'CFA', currencyName: 'West African CFA Franc' },
  { name: 'Cape Verde', currency: 'CVE', symbol: '$', currencyName: 'Cape Verdean Escudo' },
  { name: 'Mauritania', currency: 'MRU', symbol: 'UM', currencyName: 'Mauritanian Ouguiya' },
  { name: 'Sudan', currency: 'SDG', symbol: 'SDG', currencyName: 'Sudanese Pound' },
  { name: 'Chad', currency: 'XAF', symbol: 'FCFA', currencyName: 'Central African CFA Franc' },
  { name: 'Central African Republic', currency: 'XAF', symbol: 'FCFA', currencyName: 'Central African CFA Franc' },
  { name: 'Gabon', currency: 'XAF', symbol: 'FCFA', currencyName: 'Central African CFA Franc' },
  { name: 'Republic of Congo', currency: 'XAF', symbol: 'FCFA', currencyName: 'Central African CFA Franc' },
  { name: 'DR Congo', currency: 'CDF', symbol: 'FC', currencyName: 'Congolese Franc' },
  { name: 'Angola', currency: 'AOA', symbol: 'Kz', currencyName: 'Angolan Kwanza' },
  { name: 'Zambia', currency: 'ZMW', symbol: 'ZK', currencyName: 'Zambian Kwacha' },
  { name: 'Zimbabwe', currency: 'ZWL', symbol: 'Z$', currencyName: 'Zimbabwean Dollar' },
  { name: 'Malawi', currency: 'MWK', symbol: 'MK', currencyName: 'Malawian Kwacha' },
  { name: 'Mozambique', currency: 'MZN', symbol: 'MT', currencyName: 'Mozambican Metical' },
  { name: 'Madagascar', currency: 'MGA', symbol: 'Ar', currencyName: 'Malagasy Ariary' },
  { name: 'Mauritius', currency: 'MUR', symbol: '₨', currencyName: 'Mauritian Rupee' },
  { name: 'Botswana', currency: 'BWP', symbol: 'P', currencyName: 'Botswana Pula' },
  { name: 'Namibia', currency: 'NAD', symbol: 'N$', currencyName: 'Namibian Dollar' },
  { name: 'Lesotho', currency: 'LSL', symbol: 'L', currencyName: 'Lesotho Loti' },
  { name: 'Swaziland', currency: 'SZL', symbol: 'E', currencyName: 'Swazi Lilangeni' },
  { name: 'Somalia', currency: 'SOS', symbol: 'Sh.So.', currencyName: 'Somali Shilling' },
  { name: 'Djibouti', currency: 'DJF', symbol: 'Fdj', currencyName: 'Djiboutian Franc' },
  { name: 'Eritrea', currency: 'ERN', symbol: 'Nfk', currencyName: 'Eritrean Nakfa' },
  { name: 'Comoros', currency: 'KMF', symbol: 'CF', currencyName: 'Comorian Franc' },
  { name: 'Seychelles', currency: 'SCR', symbol: '₨', currencyName: 'Seychellois Rupee' },
  { name: 'Egypt', currency: 'EGP', symbol: 'E£', currencyName: 'Egyptian Pound' },
  { name: 'Libya', currency: 'LYD', symbol: 'LD', currencyName: 'Libyan Dinar' },
  { name: 'Tunisia', currency: 'TND', symbol: 'DT', currencyName: 'Tunisian Dinar' },
  { name: 'Algeria', currency: 'DZD', symbol: 'دج', currencyName: 'Algerian Dinar' },
  { name: 'Morocco', currency: 'MAD', symbol: 'MAD', currencyName: 'Moroccan Dirham' },
  // Americas
  { name: 'United States', currency: 'USD', symbol: '$', currencyName: 'US Dollar' },
  { name: 'Canada', currency: 'CAD', symbol: 'CA$', currencyName: 'Canadian Dollar' },
  { name: 'Brazil', currency: 'BRL', symbol: 'R$', currencyName: 'Brazilian Real' },
  // Europe
  { name: 'United Kingdom', currency: 'GBP', symbol: '£', currencyName: 'British Pound Sterling' },
  { name: 'Germany', currency: 'EUR', symbol: '€', currencyName: 'Euro' },
  { name: 'France', currency: 'EUR', symbol: '€', currencyName: 'Euro' },
  { name: 'Netherlands', currency: 'EUR', symbol: '€', currencyName: 'Euro' },
  { name: 'Ireland', currency: 'EUR', symbol: '€', currencyName: 'Euro' },
  // Middle East / Asia
  { name: 'United Arab Emirates', currency: 'AED', symbol: 'AED', currencyName: 'UAE Dirham' },
  { name: 'Saudi Arabia', currency: 'SAR', symbol: 'SAR', currencyName: 'Saudi Riyal' },
  { name: 'India', currency: 'INR', symbol: '₹', currencyName: 'Indian Rupee' },
  { name: 'China', currency: 'CNY', symbol: '¥', currencyName: 'Chinese Yuan' },
];

// Sorted alphabetically, Nigeria first for convenience
const sorted = [
  countriesData.find(c => c.name === 'Nigeria'),
  ...countriesData.filter(c => c.name !== 'Nigeria').sort((a, b) => a.name.localeCompare(b.name))
];

export default sorted;

/** Sorted list of country names (Nigeria first) */
export const COUNTRY_NAMES = sorted.map(c => c.name);

/** Get full country object by name */
export const getCountryByName = (name) =>
  sorted.find(c => c.name === name) || null;

/**
 * Get currency info for a given country name.
 * Falls back to NGN if unknown.
 */
export const getCurrencyByCountry = (countryName) => {
  const country = getCountryByName(countryName);
  if (country) {
    return { code: country.currency, symbol: country.symbol, name: country.currencyName };
  }
  return { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' };
};

/**
 * Returns true if the country uses Nigerian States + LGA system.
 * Only Nigeria does.
 */
export const isNigeria = (countryName) => countryName === 'Nigeria';
