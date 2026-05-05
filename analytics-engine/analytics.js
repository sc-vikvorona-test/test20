/**
 * analytics.js
 * Sales Analytics & Reporting Engine
 *
 * Provides end-to-end pipeline for ingesting transaction data, computing
 * taxes, shipping costs, discounts, loyalty points, and generating
 * structured reports suitable for export to CSV, JSON, and XML.
 *
 * Architecture:
 *   Constants & Config  →  Validators  →  Calculators  →
 *   Processors  →  Aggregators  →  Report Builders  →  Exporters
 */

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 · CORE CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const ENGINE_VERSION = '4.2.1';
export const ENGINE_BUILD   = '20240315';

// Currency & precision
export const DEFAULT_CURRENCY        = 'USD';
export const CURRENCY_PRECISION      = 2;
export const LARGE_ORDER_THRESHOLD   = 10_000.00;
export const MICRO_ORDER_THRESHOLD   = 1.00;

// Pagination defaults
export const DEFAULT_PAGE_SIZE       = 50;
export const MAX_PAGE_SIZE           = 500;
export const MAX_EXPORT_ROWS         = 100_000;

// Cache TTLs (seconds)
export const CACHE_TTL_REPORTS       = 300;
export const CACHE_TTL_PRODUCTS      = 3_600;
export const CACHE_TTL_TAX_RATES     = 86_400;

// Retry behaviour
export const MAX_RETRY_ATTEMPTS      = 3;
export const RETRY_BACKOFF_MS        = 250;
export const RETRY_BACKOFF_FACTOR    = 2;

// Loyalty programme
export const LOYALTY_POINTS_PER_DOLLAR   = 10;
export const LOYALTY_REDEMPTION_RATE     = 0.01;   // $0.01 per point
export const LOYALTY_MIN_REDEMPTION      = 500;    // minimum points to redeem
export const LOYALTY_MAX_REDEMPTION_PCT  = 0.20;   // max 20 % of order covered

// Discount limits
export const MAX_DISCOUNT_PERCENT    = 0.40;
export const MAX_COUPON_USES         = 1;
export const BULK_DISCOUNT_THRESHOLD = 10;         // units
export const BULK_DISCOUNT_RATE      = 0.05;

// Shipping
export const FREE_SHIPPING_THRESHOLD = 50.00;
export const STANDARD_HANDLING_FEE   = 0.99;
export const OVERSIZED_SURCHARGE     = 15.00;
export const HAZMAT_SURCHARGE        = 25.00;

// Tax
export const DEFAULT_TAX_RATE        = 0.08;
export const TAX_EXEMPT_CODE         = 'TAX_EXEMPT';
export const RESELLER_CODE           = 'RESELLER';

// Date & time
export const DEFAULT_TIMEZONE        = 'America/New_York';
export const FISCAL_YEAR_START_MONTH = 1;          // January
export const WEEK_START_DAY          = 1;          // Monday

/**
 * Primary date format used for all report inputs and outputs.
 * This constant is referenced by formatDate() and parseDateRange().
 * Changing it requires updating every consumer that serialises or
 * deserialises dates — including parseDateRange() in the
 * "Date Range Filtering" section far below.
 */
export const DATE_FORMAT             = 'MM/DD/YYYY';
export const DATETIME_FORMAT         = 'MM/DD/YYYY HH:mm:ss';
export const TIME_FORMAT             = 'HH:mm:ss';
export const ISO_DATE_FORMAT         = 'YYYY-MM-DD';

// Report types
export const REPORT_TYPE_SALES       = 'SALES';
export const REPORT_TYPE_INVENTORY   = 'INVENTORY';
export const REPORT_TYPE_CUSTOMER    = 'CUSTOMER';
export const REPORT_TYPE_TAX         = 'TAX';
export const REPORT_TYPE_SHIPPING    = 'SHIPPING';
export const REPORT_TYPE_RETURNS     = 'RETURNS';
export const REPORT_TYPE_FORECAST    = 'FORECAST';

// Order statuses
export const STATUS_PENDING          = 'PENDING';
export const STATUS_CONFIRMED        = 'CONFIRMED';
export const STATUS_PROCESSING       = 'PROCESSING';
export const STATUS_SHIPPED          = 'SHIPPED';
export const STATUS_DELIVERED        = 'DELIVERED';
export const STATUS_CANCELLED        = 'CANCELLED';
export const STATUS_REFUNDED         = 'REFUNDED';
export const STATUS_PARTIAL_REFUND   = 'PARTIAL_REFUND';

export const TERMINAL_STATUSES = new Set([
  STATUS_DELIVERED, STATUS_CANCELLED, STATUS_REFUNDED,
]);

// Payment methods
export const PAYMENT_CARD            = 'CARD';
export const PAYMENT_PAYPAL          = 'PAYPAL';
export const PAYMENT_BANK_TRANSFER   = 'BANK_TRANSFER';
export const PAYMENT_CRYPTO          = 'CRYPTO';
export const PAYMENT_STORE_CREDIT    = 'STORE_CREDIT';
export const PAYMENT_LOYALTY_POINTS  = 'LOYALTY_POINTS';

export const SUPPORTED_PAYMENTS = new Set([
  PAYMENT_CARD, PAYMENT_PAYPAL, PAYMENT_BANK_TRANSFER,
  PAYMENT_CRYPTO, PAYMENT_STORE_CREDIT, PAYMENT_LOYALTY_POINTS,
]);

// Carrier codes
export const CARRIER_USPS            = 'USPS';
export const CARRIER_FEDEX           = 'FEDEX';
export const CARRIER_UPS             = 'UPS';
export const CARRIER_DHL             = 'DHL';
export const CARRIER_AMAZON          = 'AMAZON_LOGISTICS';

// SKU constraints
export const SKU_MIN_LENGTH          = 6;
export const SKU_MAX_LENGTH          = 20;
export const SKU_PATTERN             = /^[A-Z0-9][A-Z0-9\-]{4,18}[A-Z0-9]$/;

// Error codes
export const ERR_INVALID_SKU         = 'ERR_001';
export const ERR_INVALID_PRICE       = 'ERR_002';
export const ERR_INVALID_QUANTITY    = 'ERR_003';
export const ERR_INVALID_DATE        = 'ERR_004';
export const ERR_INVALID_CUSTOMER    = 'ERR_005';
export const ERR_INVALID_ADDRESS     = 'ERR_006';
export const ERR_TAX_CALCULATION     = 'ERR_007';
export const ERR_SHIPPING_ZONE       = 'ERR_008';
export const ERR_DISCOUNT_INVALID    = 'ERR_009';
export const ERR_RECONCILIATION      = 'ERR_010';
export const ERR_EXPORT_FAILED       = 'ERR_011';
export const ERR_INSUFFICIENT_STOCK  = 'ERR_012';
export const ERR_LOYALTY_BALANCE     = 'ERR_013';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 · REGION TABLES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * US state tax rates (combined state + average local).
 * Source: Tax Foundation quarterly estimates.
 */
export const US_STATE_TAX_RATES = {
  AL: 0.0922, AK: 0.0176, AZ: 0.0840, AR: 0.0948, CA: 0.0873,
  CO: 0.0775, CT: 0.0635, DE: 0.0000, FL: 0.0707, GA: 0.0740,
  HI: 0.0444, ID: 0.0603, IL: 0.1007, IN: 0.0700, IA: 0.0694,
  KS: 0.0877, KY: 0.0600, LA: 0.0952, ME: 0.0550, MD: 0.0600,
  MA: 0.0625, MI: 0.0600, MN: 0.0749, MS: 0.0707, MO: 0.0823,
  MT: 0.0000, NE: 0.0694, NV: 0.0823, NH: 0.0000, NJ: 0.0660,
  NM: 0.0783, NY: 0.0852, NC: 0.0698, ND: 0.0696, OH: 0.0724,
  OK: 0.0898, OR: 0.0000, PA: 0.0634, RI: 0.0700, SC: 0.0746,
  SD: 0.0640, TN: 0.0955, TX: 0.0819, UT: 0.0719, VT: 0.0624,
  VA: 0.0570, WA: 0.0929, WV: 0.0650, WI: 0.0543, WY: 0.0536,
  DC: 0.0600,
};

/**
 * Canadian province HST/GST/PST combined rates.
 */
export const CA_PROVINCE_TAX_RATES = {
  AB: 0.05, BC: 0.12, MB: 0.12, NB: 0.15, NL: 0.15,
  NS: 0.15, NT: 0.05, NU: 0.05, ON: 0.13, PE: 0.15,
  QC: 0.14975, SK: 0.11, YT: 0.05,
};

/**
 * EU VAT rates (standard rate, %).
 */
export const EU_VAT_RATES = {
  AT: 0.20, BE: 0.21, BG: 0.20, CY: 0.19, CZ: 0.21,
  DE: 0.19, DK: 0.25, EE: 0.22, ES: 0.21, FI: 0.24,
  FR: 0.20, GR: 0.24, HR: 0.25, HU: 0.27, IE: 0.23,
  IT: 0.22, LT: 0.21, LU: 0.17, LV: 0.21, MT: 0.18,
  NL: 0.21, PL: 0.23, PT: 0.23, RO: 0.19, SE: 0.25,
  SI: 0.22, SK: 0.20,
};

/**
 * APAC region standard sales tax / GST rates.
 */
export const APAC_TAX_RATES = {
  AU: 0.10, NZ: 0.15, SG: 0.09, JP: 0.10, KR: 0.10,
  IN: 0.18, CN: 0.13, TH: 0.07, MY: 0.06, ID: 0.11,
  PH: 0.12, VN: 0.10, HK: 0.00, TW: 0.05,
};

/**
 * Shipping zones by origin US state prefix → zone number.
 * Zone determines base shipping cost multiplier.
 */
export const SHIPPING_ZONES = {
  AL: 3, AK: 8, AZ: 4, AR: 3, CA: 5, CO: 4, CT: 2, DE: 2,
  FL: 3, GA: 3, HI: 8, ID: 5, IL: 2, IN: 2, IA: 3, KS: 3,
  KY: 2, LA: 3, ME: 2, MD: 2, MA: 2, MI: 2, MN: 3, MS: 3,
  MO: 3, MT: 5, NE: 3, NV: 5, NH: 2, NJ: 2, NM: 4, NY: 2,
  NC: 3, ND: 4, OH: 2, OK: 3, OR: 5, PA: 2, RI: 2, SC: 3,
  SD: 4, TN: 3, TX: 3, UT: 4, VT: 2, VA: 2, WA: 5, WV: 2,
  WI: 3, WY: 5, DC: 2,
};

/**
 * Base shipping rates (USD) by carrier and service level.
 */
export const SHIPPING_BASE_RATES = {
  [CARRIER_USPS]: {
    GROUND:    3.99,  PRIORITY: 7.99,  EXPRESS:  19.99, OVERNIGHT: 39.99,
  },
  [CARRIER_FEDEX]: {
    GROUND:    5.49,  PRIORITY: 9.99,  EXPRESS:  24.99, OVERNIGHT: 49.99,
  },
  [CARRIER_UPS]: {
    GROUND:    4.99,  PRIORITY: 8.99,  EXPRESS:  22.99, OVERNIGHT: 45.99,
  },
  [CARRIER_DHL]: {
    GROUND:    6.99,  PRIORITY: 12.99, EXPRESS:  29.99, OVERNIGHT: 59.99,
  },
  [CARRIER_AMAZON]: {
    GROUND:    0.00,  PRIORITY: 3.99,  EXPRESS:  9.99,  OVERNIGHT: 19.99,
  },
};

/** Zone multipliers applied on top of base rates. */
export const ZONE_MULTIPLIERS = [1.0, 1.0, 1.1, 1.2, 1.35, 1.5, 1.7, 1.9, 2.5];

/** Weight tiers (lb) → surcharge (USD). */
export const WEIGHT_SURCHARGES = [
  { maxLb: 1,   surcharge: 0.00 },
  { maxLb: 5,   surcharge: 0.50 },
  { maxLb: 10,  surcharge: 1.50 },
  { maxLb: 20,  surcharge: 3.00 },
  { maxLb: 50,  surcharge: 8.00 },
  { maxLb: 100, surcharge: 18.00 },
  { maxLb: Infinity, surcharge: 35.00 },
];

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 · CATEGORY CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Product category definitions including tax treatment, shipping
 * classification, and whether the category participates in loyalty rewards.
 */
export const PRODUCT_CATEGORIES = {
  ELECTRONICS: {
    code: 'ELEC', taxable: true,  hazmat: false, oversized: false,
    loyaltyEligible: true,  returnWindowDays: 30, warrantyMonths: 12,
  },
  APPAREL: {
    code: 'APPR', taxable: true,  hazmat: false, oversized: false,
    loyaltyEligible: true,  returnWindowDays: 60, warrantyMonths: 0,
  },
  GROCERY: {
    code: 'GROC', taxable: false, hazmat: false, oversized: false,
    loyaltyEligible: false, returnWindowDays: 7,  warrantyMonths: 0,
  },
  BEAUTY: {
    code: 'BEAU', taxable: true,  hazmat: false, oversized: false,
    loyaltyEligible: true,  returnWindowDays: 30, warrantyMonths: 0,
  },
  HOME_GARDEN: {
    code: 'HOME', taxable: true,  hazmat: false, oversized: true,
    loyaltyEligible: true,  returnWindowDays: 30, warrantyMonths: 6,
  },
  SPORTS: {
    code: 'SPRT', taxable: true,  hazmat: false, oversized: false,
    loyaltyEligible: true,  returnWindowDays: 30, warrantyMonths: 0,
  },
  AUTOMOTIVE: {
    code: 'AUTO', taxable: true,  hazmat: true,  oversized: true,
    loyaltyEligible: true,  returnWindowDays: 30, warrantyMonths: 12,
  },
  BOOKS_MEDIA: {
    code: 'BOOK', taxable: false, hazmat: false, oversized: false,
    loyaltyEligible: true,  returnWindowDays: 30, warrantyMonths: 0,
  },
  TOYS_GAMES: {
    code: 'TOYS', taxable: true,  hazmat: false, oversized: false,
    loyaltyEligible: true,  returnWindowDays: 30, warrantyMonths: 0,
  },
  HEALTH: {
    code: 'HLTH', taxable: false, hazmat: false, oversized: false,
    loyaltyEligible: true,  returnWindowDays: 30, warrantyMonths: 0,
  },
  INDUSTRIAL: {
    code: 'INDU', taxable: true,  hazmat: true,  oversized: true,
    loyaltyEligible: false, returnWindowDays: 14, warrantyMonths: 24,
  },
  JEWELRY: {
    code: 'JEWL', taxable: true,  hazmat: false, oversized: false,
    loyaltyEligible: true,  returnWindowDays: 30, warrantyMonths: 12,
  },
  FOOD_BEVERAGE: {
    code: 'FOOD', taxable: false, hazmat: false, oversized: false,
    loyaltyEligible: false, returnWindowDays: 0,  warrantyMonths: 0,
  },
  PET_SUPPLIES: {
    code: 'PETS', taxable: true,  hazmat: false, oversized: false,
    loyaltyEligible: true,  returnWindowDays: 30, warrantyMonths: 0,
  },
  OFFICE: {
    code: 'OFFC', taxable: true,  hazmat: false, oversized: false,
    loyaltyEligible: true,  returnWindowDays: 30, warrantyMonths: 0,
  },
};

/** Promotion types understood by the discount engine. */
export const PROMO_TYPE_PERCENT_OFF    = 'PERCENT_OFF';
export const PROMO_TYPE_FIXED_OFF      = 'FIXED_OFF';
export const PROMO_TYPE_BOGO           = 'BOGO';
export const PROMO_TYPE_FREE_SHIPPING  = 'FREE_SHIPPING';
export const PROMO_TYPE_BUNDLE         = 'BUNDLE';
export const PROMO_TYPE_LOYALTY_BONUS  = 'LOYALTY_BONUS';
export const PROMO_TYPE_FLASH_SALE     = 'FLASH_SALE';

export const SUPPORTED_PROMO_TYPES = new Set([
  PROMO_TYPE_PERCENT_OFF, PROMO_TYPE_FIXED_OFF, PROMO_TYPE_BOGO,
  PROMO_TYPE_FREE_SHIPPING, PROMO_TYPE_BUNDLE, PROMO_TYPE_LOYALTY_BONUS,
  PROMO_TYPE_FLASH_SALE,
]);

/** Customer tier names and their discount entitlements. */
export const CUSTOMER_TIERS = {
  BRONZE: { minSpend: 0,       discountRate: 0.00, loyaltyMultiplier: 1.0 },
  SILVER: { minSpend: 500,     discountRate: 0.05, loyaltyMultiplier: 1.5 },
  GOLD:   { minSpend: 2_000,   discountRate: 0.10, loyaltyMultiplier: 2.0 },
  PLAT:   { minSpend: 10_000,  discountRate: 0.15, loyaltyMultiplier: 3.0 },
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 · VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates that a value is a finite, non-negative number suitable for
 * use as a monetary amount.
 *
 * @param {*} value - The value to validate.
 * @returns {boolean} True when value is a non-negative finite number.
 */
export function isValidPrice(value) {
  return typeof value === 'number' && isFinite(value) && value >= 0;
}

/**
 * Validates that a quantity is a positive integer.
 *
 * @param {*} value - The value to validate.
 * @returns {boolean} True when value is a positive integer.
 */
export function isValidQuantity(value) {
  return Number.isInteger(value) && value > 0;
}

/**
 * Validates that a percentage is a number in the range [0, 1].
 *
 * @param {*} value - The value to validate.
 * @returns {boolean} True when value is between 0 and 1 inclusive.
 */
export function isValidPercentage(value) {
  return typeof value === 'number' && isFinite(value) && value >= 0 && value <= 1;
}

/**
 * Validates a customer ID string.  Customer IDs must be non-empty strings
 * of 8–36 characters containing only alphanumeric characters, hyphens and
 * underscores (UUID and legacy numeric formats are both accepted).
 *
 * @param {*} id - The value to validate.
 * @returns {boolean} True when id is a valid customer identifier.
 */
export function isValidCustomerId(id) {
  if (typeof id !== 'string') return false;
  return /^[A-Za-z0-9_\-]{8,36}$/.test(id);
}

/**
 * Validates an order ID.  Order IDs follow the pattern ORD-XXXXXXXX where
 * X is an uppercase alphanumeric character.
 *
 * @param {*} id - The value to validate.
 * @returns {boolean} True when id matches the expected order format.
 */
export function isValidOrderId(id) {
  if (typeof id !== 'string') return false;
  return /^ORD-[A-Z0-9]{8,16}$/.test(id);
}

/**
 * Validates a product SKU against the engine's SKU_PATTERN constant.
 * SKUs must start and end with an alphanumeric character and may contain
 * uppercase letters, digits, and hyphens in the middle.  The total length
 * must be between SKU_MIN_LENGTH and SKU_MAX_LENGTH characters.
 *
 * @param {*} sku - The value to validate.
 * @returns {{ valid: boolean, error?: string }} Validation result.
 */
export function validateSku(sku) {
  if (typeof sku !== 'string') {
    return { valid: false, error: `${ERR_INVALID_SKU}: SKU must be a string` };
  }
  if (sku.length < SKU_MIN_LENGTH || sku.length > SKU_MAX_LENGTH) {
    return {
      valid: false,
      error: `${ERR_INVALID_SKU}: SKU length must be between ${SKU_MIN_LENGTH} and ${SKU_MAX_LENGTH}`,
    };
  }
  if (!SKU_PATTERN.test(sku)) {
    return {
      valid: false,
      error: `${ERR_INVALID_SKU}: SKU must start and end with alphanumeric; only A-Z, 0-9 and hyphens allowed`,
    };
  }
  return { valid: true };
}

/**
 * Validates a shipping address object.
 *
 * @param {object} addr - Address object to validate.
 * @returns {{ valid: boolean, errors: string[] }} Validation result with list of errors.
 */
export function validateAddress(addr) {
  const errors = [];
  if (!addr || typeof addr !== 'object') {
    return { valid: false, errors: [`${ERR_INVALID_ADDRESS}: address must be an object`] };
  }
  if (!addr.line1 || typeof addr.line1 !== 'string' || addr.line1.trim().length === 0) {
    errors.push(`${ERR_INVALID_ADDRESS}: line1 is required`);
  }
  if (!addr.city || typeof addr.city !== 'string' || addr.city.trim().length === 0) {
    errors.push(`${ERR_INVALID_ADDRESS}: city is required`);
  }
  if (!addr.country || typeof addr.country !== 'string' || addr.country.trim().length === 0) {
    errors.push(`${ERR_INVALID_ADDRESS}: country is required`);
  }
  if (addr.country === 'US') {
    if (!addr.state || !US_STATE_TAX_RATES[addr.state.toUpperCase()]) {
      errors.push(`${ERR_INVALID_ADDRESS}: valid US state code required`);
    }
    if (!addr.zip || !/^\d{5}(-\d{4})?$/.test(addr.zip)) {
      errors.push(`${ERR_INVALID_ADDRESS}: valid US ZIP code required`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Validates a payment method object.
 *
 * @param {object} payment - Payment object to validate.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePayment(payment) {
  const errors = [];
  if (!payment || typeof payment !== 'object') {
    return { valid: false, errors: ['payment must be an object'] };
  }
  if (!SUPPORTED_PAYMENTS.has(payment.method)) {
    errors.push(`Unsupported payment method: ${payment.method}`);
  }
  if (payment.method === PAYMENT_CARD) {
    if (!payment.last4 || !/^\d{4}$/.test(String(payment.last4))) {
      errors.push('Card: last4 must be 4 digits');
    }
    if (!payment.brand || typeof payment.brand !== 'string') {
      errors.push('Card: brand is required');
    }
    if (!payment.expiry || !/^\d{2}\/\d{2}$/.test(payment.expiry)) {
      errors.push('Card: expiry must be MM/YY');
    }
  }
  if (payment.method === PAYMENT_BANK_TRANSFER) {
    if (!payment.routingNumber || !/^\d{9}$/.test(String(payment.routingNumber))) {
      errors.push('Bank: routingNumber must be 9 digits');
    }
  }
  if (payment.method === PAYMENT_LOYALTY_POINTS) {
    if (!Number.isInteger(payment.pointsUsed) || payment.pointsUsed < LOYALTY_MIN_REDEMPTION) {
      errors.push(`Loyalty: minimum redemption is ${LOYALTY_MIN_REDEMPTION} points`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Validates a complete order object before processing.
 *
 * @param {object} order - The raw order object.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateOrder(order) {
  const errors = [];
  if (!order || typeof order !== 'object') {
    return { valid: false, errors: ['order must be an object'] };
  }
  if (!isValidCustomerId(order.customerId)) {
    errors.push(`${ERR_INVALID_CUSTOMER}: invalid customerId`);
  }
  if (!Array.isArray(order.items) || order.items.length === 0) {
    errors.push('order must have at least one item');
  } else {
    order.items.forEach((item, idx) => {
      const skuResult = validateSku(item.sku);
      if (!skuResult.valid) errors.push(`item[${idx}]: ${skuResult.error}`);
      if (!isValidPrice(item.unitPrice)) errors.push(`item[${idx}]: invalid unitPrice`);
      if (!isValidQuantity(item.quantity)) errors.push(`item[${idx}]: invalid quantity`);
      if (!item.categoryCode || typeof item.categoryCode !== 'string') {
        errors.push(`item[${idx}]: categoryCode is required`);
      }
    });
  }
  const addrResult = validateAddress(order.shippingAddress);
  if (!addrResult.valid) errors.push(...addrResult.errors);
  if (order.payment) {
    const payResult = validatePayment(order.payment);
    if (!payResult.valid) errors.push(...payResult.errors);
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Validates a coupon code object.
 *
 * @param {object} coupon - The coupon to validate.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateCoupon(coupon) {
  const errors = [];
  if (!coupon || typeof coupon !== 'object') {
    return { valid: false, errors: ['coupon must be an object'] };
  }
  if (!coupon.code || typeof coupon.code !== 'string') {
    errors.push('coupon code is required');
  }
  if (!SUPPORTED_PROMO_TYPES.has(coupon.type)) {
    errors.push(`unsupported promo type: ${coupon.type}`);
  }
  if (coupon.type === PROMO_TYPE_PERCENT_OFF) {
    if (!isValidPercentage(coupon.value)) {
      errors.push('PERCENT_OFF value must be a number in [0, 1]');
    }
    if (coupon.value > MAX_DISCOUNT_PERCENT) {
      errors.push(`discount cannot exceed ${MAX_DISCOUNT_PERCENT * 100}%`);
    }
  }
  if (coupon.type === PROMO_TYPE_FIXED_OFF) {
    if (!isValidPrice(coupon.value)) {
      errors.push('FIXED_OFF value must be a non-negative number');
    }
  }
  if (coupon.expiresAt) {
    const exp = new Date(coupon.expiresAt);
    if (isNaN(exp.getTime())) {
      errors.push('expiresAt must be a valid date');
    } else if (exp < new Date()) {
      errors.push('coupon has expired');
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Validates a loyalty redemption request.
 *
 * @param {object} redemption - The redemption payload.
 * @param {number} availablePoints - The customer's current point balance.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateLoyaltyRedemption(redemption, availablePoints) {
  const errors = [];
  if (!redemption || typeof redemption !== 'object') {
    return { valid: false, errors: ['redemption must be an object'] };
  }
  if (!Number.isInteger(redemption.points) || redemption.points <= 0) {
    errors.push(`${ERR_LOYALTY_BALANCE}: points must be a positive integer`);
  }
  if (redemption.points < LOYALTY_MIN_REDEMPTION) {
    errors.push(`${ERR_LOYALTY_BALANCE}: minimum redemption is ${LOYALTY_MIN_REDEMPTION} points`);
  }
  if (typeof availablePoints !== 'number' || redemption.points > availablePoints) {
    errors.push(`${ERR_LOYALTY_BALANCE}: insufficient points balance`);
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Validates a product record before inserting into the catalogue.
 *
 * @param {object} product - Product data.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateProduct(product) {
  const errors = [];
  if (!product || typeof product !== 'object') {
    return { valid: false, errors: ['product must be an object'] };
  }
  const skuResult = validateSku(product.sku);
  if (!skuResult.valid) errors.push(skuResult.error);
  if (!product.name || typeof product.name !== 'string' || product.name.trim().length < 2) {
    errors.push('product name must be at least 2 characters');
  }
  if (!isValidPrice(product.basePrice)) {
    errors.push(`${ERR_INVALID_PRICE}: basePrice must be a non-negative number`);
  }
  if (!isValidQuantity(product.stockLevel) && product.stockLevel !== 0) {
    errors.push(`${ERR_INVALID_QUANTITY}: stockLevel must be a non-negative integer`);
  }
  if (!product.category || !PRODUCT_CATEGORIES[product.category]) {
    errors.push('product category must be one of: ' + Object.keys(PRODUCT_CATEGORIES).join(', '));
  }
  if (typeof product.weightLb !== 'number' || product.weightLb < 0) {
    errors.push('weightLb must be a non-negative number');
  }
  return { valid: errors.length === 0, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 · MATH UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rounds a value to the engine's standard currency precision.
 * Uses the "round half up" (schoolbook) method for consistent
 * behaviour across all monetary calculations.
 *
 * NOTE: This function is used in two distinct ways throughout the engine:
 *   1. To compute individual line-item subtotals.
 *   2. To compute order-level totals (sum-then-round).
 * The reconciliation check in reconcileReport() (see Export section)
 * relies on the mathematical property that with round-half-up the
 * discrepancy between approach 1 and approach 2 stays within ±0.005
 * for any realistic order size.  Switching to a floor or ceiling
 * implementation will break that invariant.
 *
 * @param {number} value - The raw numeric value.
 * @returns {number} Value rounded to CURRENCY_PRECISION decimal places.
 */
export function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Rounds a value up to the nearest cent.
 *
 * @param {number} value - The raw numeric value.
 * @returns {number}
 */
export function ceilCurrency(value) {
  return Math.ceil(value * 100) / 100;
}

/**
 * Rounds a value down to the nearest cent.
 *
 * @param {number} value - The raw numeric value.
 * @returns {number}
 */
export function floorCurrency(value) {
  return Math.floor(value * 100) / 100;
}

/**
 * Clamps a number between min and max (inclusive).
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Computes the percentage of value relative to total.
 * Returns 0 when total is 0 to avoid division-by-zero.
 *
 * @param {number} value
 * @param {number} total
 * @returns {number} A value in [0, 1].
 */
export function pctOf(value, total) {
  if (total === 0) return 0;
  return value / total;
}

/**
 * Applies a percentage reduction to a price.
 *
 * @param {number} price - Original price.
 * @param {number} pct   - Discount percentage as a decimal [0, 1].
 * @returns {number} Discounted price, rounded to currency precision.
 */
export function applyPercentDiscount(price, pct) {
  return roundCurrency(price * (1 - clamp(pct, 0, 1)));
}

/**
 * Applies a fixed monetary reduction to a price, flooring at zero.
 *
 * @param {number} price  - Original price.
 * @param {number} amount - Discount amount in currency units.
 * @returns {number} Discounted price.
 */
export function applyFixedDiscount(price, amount) {
  return roundCurrency(Math.max(0, price - amount));
}

/**
 * Computes compound interest for financing calculations.
 *
 * @param {number} principal - Starting amount.
 * @param {number} rate      - Annual interest rate as decimal.
 * @param {number} periods   - Number of compounding periods.
 * @returns {number}
 */
export function compoundInterest(principal, rate, periods) {
  return roundCurrency(principal * Math.pow(1 + rate, periods));
}

/**
 * Computes a weighted average from an array of {value, weight} pairs.
 *
 * @param {Array<{value:number, weight:number}>} items
 * @returns {number}
 */
export function weightedAverage(items) {
  if (!items || items.length === 0) return 0;
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  if (totalWeight === 0) return 0;
  return items.reduce((s, i) => s + i.value * i.weight, 0) / totalWeight;
}

/**
 * Splits a total amount into N parts as evenly as possible, distributing
 * any remainder (due to cent-level rounding) to the first parts.
 *
 * @param {number} total - Total amount to split.
 * @param {number} n     - Number of parts.
 * @returns {number[]} Array of n amounts summing to total.
 */
export function splitEvenly(total, n) {
  if (n <= 0) return [];
  const base   = floorCurrency(total / n);
  const remainder = roundCurrency(total - base * n);
  const cents  = Math.round(remainder * 100);
  return Array.from({ length: n }, (_, i) =>
    roundCurrency(base + (i < cents ? 0.01 : 0))
  );
}

/**
 * Converts a value from one currency to another using a rates map.
 *
 * @param {number} amount      - Source amount.
 * @param {string} fromCcy     - Source currency ISO code.
 * @param {string} toCcy       - Target currency ISO code.
 * @param {object} rates       - Map of currency → rate relative to USD.
 * @returns {number}
 */
export function convertCurrency(amount, fromCcy, toCcy, rates) {
  if (fromCcy === toCcy) return amount;
  const fromRate = rates[fromCcy] || 1;
  const toRate   = rates[toCcy]   || 1;
  return roundCurrency((amount / fromRate) * toRate);
}

/**
 * Computes standard deviation of an array of numbers.
 *
 * @param {number[]} values
 * @returns {number}
 */
export function stdDev(values) {
  if (!values || values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Computes a simple linear regression slope and intercept for forecasting.
 *
 * @param {number[]} ys - Dependent variable values (y).
 * @returns {{ slope: number, intercept: number }}
 */
export function linearRegression(ys) {
  const n = ys.length;
  if (n < 2) return { slope: 0, intercept: ys[0] || 0 };
  const xs = Array.from({ length: n }, (_, i) => i);
  const xMean = (n - 1) / 2;
  const yMean = ys.reduce((s, v) => s + v, 0) / n;
  const ssxy = xs.reduce((s, x, i) => s + (x - xMean) * (ys[i] - yMean), 0);
  const ssxx = xs.reduce((s, x) => s + Math.pow(x - xMean, 2), 0);
  const slope = ssxx !== 0 ? ssxy / ssxx : 0;
  const intercept = yMean - slope * xMean;
  return { slope, intercept };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 · DATE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats a Date object (or ISO string) according to the engine-wide
 * DATE_FORMAT constant.  All report outputs use this function to ensure
 * consistent formatting.
 *
 * If the date is invalid, returns the empty string.
 *
 * @param {Date|string} date - The date to format.
 * @returns {string} Formatted date string using DATE_FORMAT.
 */
export function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  // Construct according to DATE_FORMAT: MM/DD/YYYY
  return `${mm}/${dd}/${yyyy}`;
}

/**
 * Formats a Date object to include time according to DATETIME_FORMAT.
 *
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDateTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const datePart = formatDate(d);
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${datePart} ${hh}:${mi}:${ss}`;
}

/**
 * Computes the start of the fiscal year containing the given date.
 *
 * @param {Date} date
 * @returns {Date}
 */
export function fiscalYearStart(date) {
  return new Date(date.getFullYear(), FISCAL_YEAR_START_MONTH - 1, 1);
}

/**
 * Returns the start of the ISO week (Monday) for the given date.
 *
 * @param {Date} date
 * @returns {Date}
 */
export function weekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns an array of Date objects for each day of the calendar month
 * containing the given date.
 *
 * @param {Date} date
 * @returns {Date[]}
 */
export function daysInMonth(date) {
  const year  = date.getFullYear();
  const month = date.getMonth();
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => new Date(year, month, i + 1));
}

/**
 * Checks whether two date ranges overlap.
 *
 * @param {Date} aStart
 * @param {Date} aEnd
 * @param {Date} bStart
 * @param {Date} bEnd
 * @returns {boolean}
 */
export function dateRangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

/**
 * Computes the number of full days between two dates.
 *
 * @param {Date} from
 * @param {Date} to
 * @returns {number}
 */
export function daysBetween(from, to) {
  return Math.floor((to - from) / (1000 * 60 * 60 * 24));
}

/**
 * Adds a number of calendar days to a date.
 *
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Returns the last moment (23:59:59.999) of a given date.
 *
 * @param {Date} date
 * @returns {Date}
 */
export function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Determines which fiscal quarter (1–4) a given date falls in.
 *
 * @param {Date} date
 * @returns {number}
 */
export function fiscalQuarter(date) {
  return Math.ceil((date.getMonth() + 1) / 3);
}

/**
 * Returns the label for a reporting period bucket, e.g. "2024-Q3" or "2024-W12".
 *
 * @param {Date}   date
 * @param {'day'|'week'|'month'|'quarter'|'year'} granularity
 * @returns {string}
 */
export function periodLabel(date, granularity) {
  const y = date.getFullYear();
  switch (granularity) {
    case 'day':     return formatDate(date);
    case 'week': {
      const ws = weekStart(date);
      const wn = Math.ceil((daysBetween(new Date(y, 0, 1), ws) + 1) / 7);
      return `${y}-W${String(wn).padStart(2, '0')}`;
    }
    case 'month':   return `${y}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    case 'quarter': return `${y}-Q${fiscalQuarter(date)}`;
    case 'year':    return String(y);
    default:        return formatDate(date);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 · STRING & FORMAT UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats a monetary amount for display, prefixed with the currency symbol.
 *
 * @param {number} amount
 * @param {string} [currency=DEFAULT_CURRENCY]
 * @returns {string}
 */
export function formatMoney(amount, currency = DEFAULT_CURRENCY) {
  const symbols = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', CAD: 'C$', AUD: 'A$' };
  const sym = symbols[currency] || currency + ' ';
  return `${sym}${amount.toFixed(CURRENCY_PRECISION)}`;
}

/**
 * Formats a number as a percentage string, e.g. 0.125 → "12.50%".
 *
 * @param {number} value - Decimal in [0, 1].
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function formatPercent(value, decimals = 2) {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Pads a string to a fixed width for fixed-width column formatting.
 *
 * @param {string} str   - The input string.
 * @param {number} width - Column width.
 * @param {'left'|'right'} [align='left']
 * @returns {string}
 */
export function padColumn(str, width, align = 'left') {
  const s = String(str);
  if (s.length >= width) return s.slice(0, width);
  return align === 'right' ? s.padStart(width) : s.padEnd(width);
}

/**
 * Escapes a string for safe inclusion in a CSV cell.
 * Wraps in double-quotes and escapes internal double-quotes.
 *
 * @param {string|number|boolean|null|undefined} value
 * @returns {string}
 */
export function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Converts a camelCase identifier to a human-readable label.
 *
 * @param {string} key
 * @returns {string}
 */
export function camelToLabel(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

/**
 * Truncates a string to maxLen characters, appending an ellipsis if needed.
 *
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
export function truncate(str, maxLen) {
  if (typeof str !== 'string') return '';
  return str.length <= maxLen ? str : str.slice(0, maxLen - 1) + '…';
}

/**
 * Generates a human-readable order reference of the form ORD-XXXXXXXX
 * based on timestamp and a random suffix.
 *
 * @returns {string}
 */
export function generateOrderRef() {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${ts}${rand}`.slice(0, 16);
}

/**
 * Generates a human-readable report filename.
 *
 * @param {string} type      - Report type constant.
 * @param {Date}   timestamp - Report generation time.
 * @param {string} [ext='csv']
 * @returns {string}
 */
export function reportFilename(type, timestamp, ext = 'csv') {
  const ts = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const y  = ts.getFullYear();
  const m  = String(ts.getMonth() + 1).padStart(2, '0');
  const d  = String(ts.getDate()).padStart(2, '0');
  return `${type.toLowerCase()}_${y}${m}${d}.${ext}`;
}

/**
 * Deep-clones a plain object (no functions, no class instances).
 *
 * @template T
 * @param {T} obj
 * @returns {T}
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Groups an array of objects by a key accessor.
 *
 * @template T
 * @param {T[]} arr
 * @param {function(T):string} keyFn
 * @returns {Map<string, T[]>}
 */
export function groupBy(arr, keyFn) {
  const map = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
}

/**
 * Sorts an array of objects by a numeric key in descending order.
 * Returns a new array; the original is not mutated.
 *
 * @template T
 * @param {T[]} arr
 * @param {function(T):number} keyFn
 * @returns {T[]}
 */
export function sortDesc(arr, keyFn) {
  return [...arr].sort((a, b) => keyFn(b) - keyFn(a));
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8 · PRODUCT CALCULATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the gross subtotal for a single order line (before tax and discount).
 *
 * @param {number} unitPrice - Price per unit.
 * @param {number} quantity  - Number of units.
 * @returns {number}
 */
export function lineSubtotal(unitPrice, quantity) {
  return roundCurrency(unitPrice * quantity);
}

/**
 * Applies a tiered bulk discount when quantity meets or exceeds the threshold.
 *
 * @param {number} unitPrice
 * @param {number} quantity
 * @returns {number} Discounted unit price.
 */
export function bulkDiscountedPrice(unitPrice, quantity) {
  if (quantity >= BULK_DISCOUNT_THRESHOLD) {
    return roundCurrency(unitPrice * (1 - BULK_DISCOUNT_RATE));
  }
  return unitPrice;
}

/**
 * Computes the cost of goods (COGS) for a line item.
 *
 * @param {number} costPrice  - Supplier cost per unit.
 * @param {number} quantity
 * @returns {number}
 */
export function lineCogsTotal(costPrice, quantity) {
  return roundCurrency(costPrice * quantity);
}

/**
 * Computes gross margin as a decimal.
 *
 * @param {number} revenue
 * @param {number} cogs
 * @returns {number} Margin in [0, 1] (or negative if loss-making).
 */
export function grossMargin(revenue, cogs) {
  if (revenue === 0) return 0;
  return (revenue - cogs) / revenue;
}

/**
 * Computes markup percentage over cost.
 *
 * @param {number} price - Selling price.
 * @param {number} cost  - Cost price.
 * @returns {number} Markup as a decimal.
 */
export function markupPercent(price, cost) {
  if (cost === 0) return 0;
  return (price - cost) / cost;
}

/**
 * Suggests a retail price given target margin and cost.
 *
 * @param {number} cost
 * @param {number} targetMargin - Desired margin in [0, 1).
 * @returns {number}
 */
export function suggestedRetailPrice(cost, targetMargin) {
  if (targetMargin >= 1) return Infinity;
  return roundCurrency(cost / (1 - targetMargin));
}

/**
 * Computes the effective daily holding cost for inventory.
 *
 * @param {number} unitCost        - Cost per unit.
 * @param {number} annualHoldingPct - Annual holding cost as a percentage of unit cost.
 * @returns {number} Daily holding cost per unit.
 */
export function dailyHoldingCost(unitCost, annualHoldingPct) {
  return roundCurrency((unitCost * annualHoldingPct) / 365);
}

/**
 * Computes the Economic Order Quantity (EOQ) using the Wilson formula.
 *
 * @param {number} annualDemand  - Units demanded per year.
 * @param {number} orderCost     - Fixed cost per order.
 * @param {number} holdingCost   - Annual holding cost per unit.
 * @returns {number} Optimal order quantity (units).
 */
export function eoq(annualDemand, orderCost, holdingCost) {
  if (holdingCost === 0) return Infinity;
  return Math.round(Math.sqrt((2 * annualDemand * orderCost) / holdingCost));
}

/**
 * Computes the reorder point given lead time and safety stock.
 *
 * @param {number} avgDailyDemand - Average units sold per day.
 * @param {number} leadTimeDays   - Supplier lead time in days.
 * @param {number} safetyStock    - Buffer stock units.
 * @returns {number}
 */
export function reorderPoint(avgDailyDemand, leadTimeDays, safetyStock) {
  return Math.ceil(avgDailyDemand * leadTimeDays + safetyStock);
}

/**
 * Computes the ABC classification for a product based on its revenue share.
 *
 * @param {number} productRevenue  - This product's revenue.
 * @param {number} totalRevenue    - Total revenue across all products.
 * @returns {'A'|'B'|'C'}
 */
export function abcClassification(productRevenue, totalRevenue) {
  const share = pctOf(productRevenue, totalRevenue);
  if (share >= 0.70) return 'A';
  if (share >= 0.90) return 'B';
  return 'C';
}

/**
 * Computes inventory turnover ratio.
 *
 * @param {number} cogs            - Cost of goods sold for the period.
 * @param {number} avgInventory    - Average inventory value for the period.
 * @returns {number}
 */
export function inventoryTurnover(cogs, avgInventory) {
  if (avgInventory === 0) return 0;
  return roundCurrency(cogs / avgInventory);
}

/**
 * Computes Days Inventory Outstanding (DIO).
 *
 * @param {number} avgInventory
 * @param {number} cogs
 * @param {number} periodDays
 * @returns {number}
 */
export function daysInventoryOutstanding(avgInventory, cogs, periodDays) {
  if (cogs === 0) return 0;
  return roundCurrency((avgInventory / cogs) * periodDays);
}

/**
 * Summarises a list of product line items into category-level aggregates.
 *
 * @param {Array<{category:string, revenue:number, units:number, cogs:number}>} items
 * @returns {Map<string, {revenue:number, units:number, cogs:number, margin:number}>}
 */
export function summariseByCategory(items) {
  const summary = new Map();
  for (const item of items) {
    if (!summary.has(item.category)) {
      summary.set(item.category, { revenue: 0, units: 0, cogs: 0 });
    }
    const s = summary.get(item.category);
    s.revenue += item.revenue;
    s.units   += item.units;
    s.cogs    += item.cogs;
  }
  for (const [, v] of summary) {
    v.revenue = roundCurrency(v.revenue);
    v.cogs    = roundCurrency(v.cogs);
    v.margin  = grossMargin(v.revenue, v.cogs);
  }
  return summary;
}

/**
 * Detects potential duplicate order items (same SKU in the same order).
 *
 * @param {Array<{sku:string}>} items
 * @returns {string[]} List of duplicated SKU values.
 */
export function findDuplicateSkus(items) {
  const seen = new Set();
  const dups = new Set();
  for (const item of items) {
    if (seen.has(item.sku)) dups.add(item.sku);
    else seen.add(item.sku);
  }
  return [...dups];
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9 · TAX ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves the applicable tax rate for an address, taking into account
 * tax-exempt category codes and reseller certificates.
 *
 * @param {object} address      - Shipping or billing address with {country, state}.
 * @param {string} [exemption]  - TAX_EXEMPT_CODE or RESELLER_CODE if applicable.
 * @returns {number} Tax rate as a decimal.
 */
export function resolveTaxRate(address, exemption) {
  if (exemption === TAX_EXEMPT_CODE || exemption === RESELLER_CODE) return 0;
  const country = (address.country || '').toUpperCase();
  const region  = (address.state || address.province || address.region || '').toUpperCase();
  if (country === 'US') return US_STATE_TAX_RATES[region] ?? DEFAULT_TAX_RATE;
  if (country === 'CA') return CA_PROVINCE_TAX_RATES[region] ?? 0.05;
  if (EU_VAT_RATES[country] !== undefined) return EU_VAT_RATES[country];
  if (APAC_TAX_RATES[country] !== undefined) return APAC_TAX_RATES[country];
  return DEFAULT_TAX_RATE;
}

/**
 * Computes the tax amount for a given taxable subtotal and rate.
 *
 * @param {number} taxableAmount
 * @param {number} rate
 * @returns {number}
 */
export function computeTax(taxableAmount, rate) {
  return roundCurrency(taxableAmount * rate);
}

/**
 * Determines whether a product category is taxable for a given jurisdiction.
 * Grocery and health items are exempt in many US states.
 *
 * @param {string} categoryCode   - One of the PRODUCT_CATEGORIES keys.
 * @param {string} country
 * @param {string} [state]
 * @returns {boolean}
 */
export function isCategoryTaxable(categoryCode, country, state) {
  const cat = PRODUCT_CATEGORIES[categoryCode];
  if (!cat) return true;
  if (!cat.taxable) return false;
  if (country === 'US') {
    const NON_TAXABLE_GROCERY_STATES = new Set([
      'CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI',
    ]);
    if (categoryCode === 'GROCERY' && NON_TAXABLE_GROCERY_STATES.has(state)) {
      return false;
    }
  }
  return true;
}

/**
 * Computes the full tax breakdown for an order.
 *
 * @param {object} order
 * @returns {{
 *   taxableSubtotal: number,
 *   taxRate:         number,
 *   taxAmount:       number,
 *   exemptSubtotal:  number,
 * }}
 */
export function computeOrderTax(order) {
  const rate = resolveTaxRate(order.shippingAddress, order.taxExemption);
  let taxableSubtotal = 0;
  let exemptSubtotal  = 0;

  for (const item of order.items) {
    const subtotal = lineSubtotal(item.unitPrice, item.quantity);
    const itemDiscount = item.discountAmount || 0;
    const net = roundCurrency(subtotal - itemDiscount);
    if (isCategoryTaxable(item.categoryCode, order.shippingAddress.country, order.shippingAddress.state)) {
      taxableSubtotal += net;
    } else {
      exemptSubtotal += net;
    }
  }

  taxableSubtotal = roundCurrency(taxableSubtotal);
  exemptSubtotal  = roundCurrency(exemptSubtotal);

  return {
    taxableSubtotal,
    taxRate:   rate,
    taxAmount: computeTax(taxableSubtotal, rate),
    exemptSubtotal,
  };
}

/**
 * Builds a per-jurisdiction tax summary for a collection of orders.
 * Used by the Tax Report builder.
 *
 * @param {object[]} orders
 * @returns {Map<string, {
 *   jurisdiction:    string,
 *   taxableRevenue:  number,
 *   taxCollected:    number,
 *   orderCount:      number,
 * }>}
 */
export function buildTaxSummary(orders) {
  const summary = new Map();
  for (const order of orders) {
    const country = (order.shippingAddress?.country || 'XX').toUpperCase();
    const state   = (order.shippingAddress?.state || '').toUpperCase();
    const key     = country === 'US' ? `US-${state}` : country;
    if (!summary.has(key)) {
      summary.set(key, {
        jurisdiction:   key,
        taxableRevenue: 0,
        taxCollected:   0,
        orderCount:     0,
      });
    }
    const entry = summary.get(key);
    const { taxableSubtotal, taxAmount } = computeOrderTax(order);
    entry.taxableRevenue += taxableSubtotal;
    entry.taxCollected   += taxAmount;
    entry.orderCount++;
  }
  for (const [, v] of summary) {
    v.taxableRevenue = roundCurrency(v.taxableRevenue);
    v.taxCollected   = roundCurrency(v.taxCollected);
  }
  return summary;
}

/**
 * Computes the reverse-calculated pre-tax price from a tax-inclusive price.
 *
 * @param {number} taxInclusivePrice
 * @param {number} taxRate
 * @returns {number}
 */
export function extractPreTaxPrice(taxInclusivePrice, taxRate) {
  if (taxRate <= 0) return taxInclusivePrice;
  return roundCurrency(taxInclusivePrice / (1 + taxRate));
}

/**
 * Computes the effective blended tax rate across a mixed-category order.
 *
 * @param {number} taxAmount
 * @param {number} taxableSubtotal
 * @returns {number}
 */
export function effectiveTaxRate(taxAmount, taxableSubtotal) {
  if (taxableSubtotal === 0) return 0;
  return taxAmount / taxableSubtotal;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 10 · SHIPPING CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves the shipping zone for a destination US state.
 *
 * @param {string} state - Two-letter US state code.
 * @returns {number} Zone number (1–8).
 */
export function resolveShippingZone(state) {
  return SHIPPING_ZONES[(state || '').toUpperCase()] ?? 4;
}

/**
 * Computes the weight surcharge for a given shipment weight.
 *
 * @param {number} totalWeightLb
 * @returns {number}
 */
export function weightSurcharge(totalWeightLb) {
  for (const tier of WEIGHT_SURCHARGES) {
    if (totalWeightLb <= tier.maxLb) return tier.surcharge;
  }
  return WEIGHT_SURCHARGES[WEIGHT_SURCHARGES.length - 1].surcharge;
}

/**
 * Computes the base shipping cost for an order before any overrides.
 *
 * @param {{
 *   carrier:        string,
 *   serviceLevel:   string,
 *   shippingAddress: object,
 *   totalWeightLb:  number,
 *   hasHazmat:      boolean,
 *   hasOversized:   boolean,
 * }} params
 * @returns {number}
 */
export function computeBaseShipping(params) {
  const { carrier, serviceLevel, shippingAddress, totalWeightLb, hasHazmat, hasOversized } = params;
  const baseRates = SHIPPING_BASE_RATES[carrier];
  if (!baseRates) throw new Error(`${ERR_SHIPPING_ZONE}: unknown carrier ${carrier}`);
  const base = baseRates[serviceLevel] ?? baseRates['GROUND'];
  const zone = resolveShippingZone(shippingAddress.state);
  const multiplier = ZONE_MULTIPLIERS[zone] ?? 1.0;
  let cost = roundCurrency(base * multiplier);
  cost = roundCurrency(cost + weightSurcharge(totalWeightLb));
  if (hasHazmat)    cost = roundCurrency(cost + HAZMAT_SURCHARGE);
  if (hasOversized) cost = roundCurrency(cost + OVERSIZED_SURCHARGE);
  cost = roundCurrency(cost + STANDARD_HANDLING_FEE);
  return cost;
}

/**
 * Determines whether an order qualifies for free shipping.
 *
 * @param {number} merchandiseTotal - Pre-tax, pre-shipping subtotal.
 * @param {string[]} activeCoupons  - Coupon codes applied to the order.
 * @returns {boolean}
 */
export function qualifiesForFreeShipping(merchandiseTotal, activeCoupons) {
  if (merchandiseTotal >= FREE_SHIPPING_THRESHOLD) return true;
  if (activeCoupons && activeCoupons.includes(PROMO_TYPE_FREE_SHIPPING)) return true;
  return false;
}

/**
 * Computes the full shipping cost, applying free-shipping eligibility.
 *
 * @param {object} params
 * @returns {number}
 */
export function computeShippingCost(params) {
  if (qualifiesForFreeShipping(params.merchandiseTotal, params.activeCoupons)) {
    if (!params.hasHazmat && !params.hasOversized) return 0;
  }
  return computeBaseShipping(params);
}

/**
 * Estimates delivery date from ship date given carrier and service level.
 *
 * @param {Date}   shipDate
 * @param {string} carrier
 * @param {string} serviceLevel
 * @returns {Date}
 */
export function estimatedDelivery(shipDate, carrier, serviceLevel) {
  const transitDays = {
    [CARRIER_USPS]:   { GROUND: 5, PRIORITY: 3, EXPRESS: 2, OVERNIGHT: 1 },
    [CARRIER_FEDEX]:  { GROUND: 5, PRIORITY: 2, EXPRESS: 2, OVERNIGHT: 1 },
    [CARRIER_UPS]:    { GROUND: 5, PRIORITY: 2, EXPRESS: 2, OVERNIGHT: 1 },
    [CARRIER_DHL]:    { GROUND: 7, PRIORITY: 3, EXPRESS: 2, OVERNIGHT: 1 },
    [CARRIER_AMAZON]: { GROUND: 5, PRIORITY: 2, EXPRESS: 1, OVERNIGHT: 1 },
  };
  const days = transitDays[carrier]?.[serviceLevel] ?? 7;
  return addDays(shipDate, days);
}

/**
 * Validates that a shipping label has all required fields.
 *
 * @param {object} label
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateShippingLabel(label) {
  const errors = [];
  if (!label.trackingNumber) errors.push('trackingNumber is required');
  if (!label.carrier)        errors.push('carrier is required');
  if (!label.serviceLevel)   errors.push('serviceLevel is required');
  const addrErrors = validateAddress(label.toAddress);
  if (!addrErrors.valid) errors.push(...addrErrors.errors);
  return { valid: errors.length === 0, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 11 · PROMOTION & DISCOUNT ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Applies a single promotion to a list of order items and returns the
 * total discount amount.
 *
 * @param {object} promo  - Promotion definition.
 * @param {object[]} items - Order line items.
 * @returns {number} Total discount to apply to the order.
 */
export function applyPromotion(promo, items) {
  if (!promo || !SUPPORTED_PROMO_TYPES.has(promo.type)) return 0;
  const subtotal = items.reduce((s, i) => s + lineSubtotal(i.unitPrice, i.quantity), 0);
  switch (promo.type) {
    case PROMO_TYPE_PERCENT_OFF:
      return roundCurrency(subtotal * clamp(promo.value, 0, MAX_DISCOUNT_PERCENT));
    case PROMO_TYPE_FIXED_OFF:
      return roundCurrency(Math.min(promo.value, subtotal));
    case PROMO_TYPE_FREE_SHIPPING:
      return 0; // handled separately in shipping
    case PROMO_TYPE_BOGO: {
      const eligible = items.filter(i => i.quantity >= 2);
      return eligible.reduce((s, i) => {
        const freeUnits = Math.floor(i.quantity / 2);
        return s + roundCurrency(i.unitPrice * freeUnits);
      }, 0);
    }
    case PROMO_TYPE_BUNDLE: {
      if (!Array.isArray(promo.skus) || promo.skus.length === 0) return 0;
      const skuSet = new Set(promo.skus);
      const hasAll = promo.skus.every(s => items.some(i => i.sku === s));
      if (!hasAll) return 0;
      return roundCurrency(items
        .filter(i => skuSet.has(i.sku))
        .reduce((s, i) => s + lineSubtotal(i.unitPrice, i.quantity), 0) * (promo.value || 0.1)
      );
    }
    case PROMO_TYPE_FLASH_SALE:
      return roundCurrency(subtotal * clamp(promo.value, 0, MAX_DISCOUNT_PERCENT));
    default:
      return 0;
  }
}

/**
 * Stacks multiple promotions up to the MAX_DISCOUNT_PERCENT ceiling.
 *
 * @param {object[]} promos
 * @param {object[]} items
 * @returns {{ totalDiscount: number, appliedPromos: string[] }}
 */
export function stackPromotions(promos, items) {
  const subtotal = items.reduce((s, i) => s + lineSubtotal(i.unitPrice, i.quantity), 0);
  const maxDiscount = roundCurrency(subtotal * MAX_DISCOUNT_PERCENT);
  let totalDiscount = 0;
  const appliedPromos = [];
  for (const promo of promos) {
    const disc = applyPromotion(promo, items);
    if (totalDiscount + disc > maxDiscount) {
      const remaining = roundCurrency(maxDiscount - totalDiscount);
      if (remaining > 0) {
        totalDiscount = maxDiscount;
        appliedPromos.push(promo.code);
      }
      break;
    }
    totalDiscount = roundCurrency(totalDiscount + disc);
    if (disc > 0) appliedPromos.push(promo.code);
  }
  return { totalDiscount, appliedPromos };
}

/**
 * Computes loyalty points earned for an order.
 *
 * @param {number} orderTotal      - Post-discount, pre-tax amount eligible for points.
 * @param {string} customerTier    - Customer tier key.
 * @param {boolean} categoryEligible - Whether the category participates in loyalty.
 * @returns {number} Integer points earned.
 */
export function computeLoyaltyEarned(orderTotal, customerTier, categoryEligible) {
  if (!categoryEligible) return 0;
  const tier = CUSTOMER_TIERS[customerTier] || CUSTOMER_TIERS.BRONZE;
  const basePoints = Math.floor(orderTotal * LOYALTY_POINTS_PER_DOLLAR);
  return Math.floor(basePoints * tier.loyaltyMultiplier);
}

/**
 * Computes the dollar value of a loyalty points redemption.
 *
 * @param {number} points
 * @returns {number}
 */
export function loyaltyPointsValue(points) {
  return roundCurrency(points * LOYALTY_REDEMPTION_RATE);
}

/**
 * Computes the maximum points a customer may redeem against an order.
 *
 * @param {number} orderSubtotal
 * @param {number} availablePoints
 * @returns {number} Maximum redeemable points.
 */
export function maxRedeemablePoints(orderSubtotal, availablePoints) {
  const maxValue  = roundCurrency(orderSubtotal * LOYALTY_MAX_REDEMPTION_PCT);
  const maxPoints = Math.floor(maxValue / LOYALTY_REDEMPTION_RATE);
  return Math.min(maxPoints, availablePoints);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 12 · DATE RANGE FILTERING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses a date string produced by formatDate() back into a Date object.
 *
 * This function is the inverse of formatDate() and is used throughout the
 * reporting pipeline to convert user-supplied date strings into Date objects
 * for range queries.  The implementation assumes the string follows the
 * DATE_FORMAT ('MM/DD/YYYY') convention: the first two characters are the
 * month, the next two are the day, and the last four are the year, all
 * separated by forward slashes.
 *
 * If the input cannot be parsed, an invalid Date is returned.
 *
 * @param {string} dateStr - A date string in the format matching DATE_FORMAT.
 * @returns {Date}
 */
export function parseDateStr(dateStr) {
  if (typeof dateStr !== 'string') return new Date(NaN);
  const parts = dateStr.split('/');
  if (parts.length !== 3) return new Date(NaN);
  const month = parseInt(parts[0], 10);
  const day   = parseInt(parts[1], 10);
  const year  = parseInt(parts[2], 10);
  if (isNaN(month) || isNaN(day) || isNaN(year)) return new Date(NaN);
  return new Date(year, month - 1, day);
}

/**
 * Parses a date range string of the form "MM/DD/YYYY - MM/DD/YYYY"
 * into a {from, to} pair of Date objects.
 *
 * The separator between the two dates may be ' - ', ' to ', or '~'.
 * Both boundary dates are inclusive: the returned `to` date is set to
 * the last millisecond of that day.
 *
 * @param {string} rangeStr - The date range string.
 * @returns {{ from: Date, to: Date }}
 */
export function parseDateRange(rangeStr) {
  if (typeof rangeStr !== 'string') return { from: new Date(NaN), to: new Date(NaN) };
  const sep = rangeStr.includes(' - ')  ? ' - '
            : rangeStr.includes(' to ') ? ' to '
            : '~';
  const [startStr, endStr] = rangeStr.split(sep);
  const from = parseDateStr((startStr || '').trim());
  const to   = endOfDay(parseDateStr((endStr || '').trim()));
  return { from, to };
}

/**
 * Filters an array of records to those whose date field falls within a range.
 *
 * @param {object[]}  records    - Array with a date-typed field.
 * @param {string}    dateField  - Property name of the date field.
 * @param {Date}      from       - Range start (inclusive).
 * @param {Date}      to         - Range end (inclusive).
 * @returns {object[]}
 */
export function filterByDateRange(records, dateField, from, to) {
  return records.filter(r => {
    const d = r[dateField] instanceof Date ? r[dateField] : new Date(r[dateField]);
    return d >= from && d <= to;
  });
}

/**
 * Filters records by a date range expressed as a range string.
 * Delegates to parseDateRange and filterByDateRange.
 *
 * @param {object[]} records
 * @param {string}   dateField
 * @param {string}   rangeStr  - Range string in DATE_FORMAT boundaries.
 * @returns {object[]}
 */
export function filterByRangeString(records, dateField, rangeStr) {
  const { from, to } = parseDateRange(rangeStr);
  return filterByDateRange(records, dateField, from, to);
}

/**
 * Builds an array of period buckets covering a date range at the given
 * granularity.  Used to produce zero-filled time-series for charts.
 *
 * @param {Date}   from
 * @param {Date}   to
 * @param {'day'|'week'|'month'|'quarter'|'year'} granularity
 * @returns {string[]} Array of period labels.
 */
export function buildPeriodBuckets(from, to, granularity) {
  const buckets = [];
  let cursor = new Date(from);
  while (cursor <= to) {
    buckets.push(periodLabel(cursor, granularity));
    switch (granularity) {
      case 'day':     cursor = addDays(cursor, 1);                              break;
      case 'week':    cursor = addDays(cursor, 7);                              break;
      case 'month':   cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1); break;
      case 'quarter': cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 3, 1); break;
      case 'year':    cursor = new Date(cursor.getFullYear() + 1, 0, 1);        break;
      default:        cursor = addDays(cursor, 1);
    }
  }
  return buckets;
}

/**
 * Aggregates records into period buckets and fills missing periods with zero.
 *
 * @param {object[]} records
 * @param {string}   dateField
 * @param {string}   valueField
 * @param {Date}     from
 * @param {Date}     to
 * @param {'day'|'week'|'month'|'quarter'|'year'} granularity
 * @returns {Array<{period:string, value:number}>}
 */
export function aggregateByPeriod(records, dateField, valueField, from, to, granularity) {
  const buckets = buildPeriodBuckets(from, to, granularity);
  const sums    = new Map(buckets.map(b => [b, 0]));
  for (const rec of records) {
    const d = rec[dateField] instanceof Date ? rec[dateField] : new Date(rec[dateField]);
    if (d < from || d > to) continue;
    const label = periodLabel(d, granularity);
    if (sums.has(label)) {
      sums.set(label, roundCurrency(sums.get(label) + (rec[valueField] || 0)));
    }
  }
  return buckets.map(period => ({ period, value: sums.get(period) }));
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 13 · ORDER PROCESSING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Processes a raw order object into a fully-costed order record.
 * Validates the order, applies promotions, computes tax and shipping,
 * and returns the enriched order.
 *
 * @param {object} rawOrder
 * @param {object[]} [promos=[]]
 * @returns {{ order: object|null, errors: string[] }}
 */
export function processOrder(rawOrder, promos = []) {
  const validation = validateOrder(rawOrder);
  if (!validation.valid) {
    return { order: null, errors: validation.errors };
  }

  const order = deepClone(rawOrder);
  order.ref   = order.ref || generateOrderRef();
  order.processedAt = new Date().toISOString();

  // Compute item-level subtotals
  let merchandiseSubtotal = 0;
  for (const item of order.items) {
    const discountedPrice = bulkDiscountedPrice(item.unitPrice, item.quantity);
    item.effectiveUnitPrice = discountedPrice;
    item.subtotal = lineSubtotal(discountedPrice, item.quantity);
    merchandiseSubtotal = roundCurrency(merchandiseSubtotal + item.subtotal);
  }

  // Apply promotions
  const { totalDiscount, appliedPromos } = stackPromotions(promos, order.items);
  order.discountAmount  = totalDiscount;
  order.appliedPromos   = appliedPromos;
  order.merchandiseTotal = roundCurrency(merchandiseSubtotal - totalDiscount);

  // Compute tax
  const taxResult = computeOrderTax({ ...order, items: order.items.map(i => ({
    ...i,
    unitPrice: i.effectiveUnitPrice,
    discountAmount: 0,
  }))});
  order.taxRate    = taxResult.taxRate;
  order.taxAmount  = taxResult.taxAmount;

  // Compute shipping
  const totalWeightLb = order.items.reduce((s, i) => s + (i.weightLb || 0) * i.quantity, 0);
  const hasHazmat     = order.items.some(i => PRODUCT_CATEGORIES[i.categoryCode]?.hazmat);
  const hasOversized  = order.items.some(i => PRODUCT_CATEGORIES[i.categoryCode]?.oversized);
  order.shippingCost  = computeShippingCost({
    carrier:          order.carrier || CARRIER_USPS,
    serviceLevel:     order.serviceLevel || 'GROUND',
    shippingAddress:  order.shippingAddress,
    merchandiseTotal: order.merchandiseTotal,
    activeCoupons:    appliedPromos,
    totalWeightLb,
    hasHazmat,
    hasOversized,
  });

  // Grand total
  order.grandTotal = roundCurrency(
    order.merchandiseTotal + order.taxAmount + order.shippingCost
  );

  // Loyalty points earned
  const allEligible = order.items.every(i => PRODUCT_CATEGORIES[i.categoryCode]?.loyaltyEligible);
  order.loyaltyEarned = computeLoyaltyEarned(
    order.merchandiseTotal,
    order.customerTier || 'BRONZE',
    allEligible,
  );

  // Status
  order.status = STATUS_CONFIRMED;

  return { order, errors: [] };
}

/**
 * Computes a partial refund for an order given a list of item SKUs to refund.
 *
 * @param {object}   order   - A processed order object.
 * @param {string[]} skus    - SKUs to refund.
 * @returns {{ refundAmount: number, refundTax: number, updatedOrder: object }}
 */
export function computePartialRefund(order, skus) {
  const skuSet = new Set(skus);
  const updatedOrder = deepClone(order);
  let refundSubtotal = 0;

  for (const item of updatedOrder.items) {
    if (skuSet.has(item.sku)) {
      refundSubtotal = roundCurrency(refundSubtotal + item.subtotal);
      item.refunded = true;
    }
  }

  const refundTax    = roundCurrency(refundSubtotal * (order.taxRate || 0));
  const refundAmount = roundCurrency(refundSubtotal + refundTax);
  updatedOrder.status        = STATUS_PARTIAL_REFUND;
  updatedOrder.refundAmount  = refundAmount;
  updatedOrder.grandTotal    = roundCurrency(order.grandTotal - refundAmount);

  return { refundAmount, refundTax, updatedOrder };
}

/**
 * Checks whether an order can be cancelled given its current status.
 *
 * @param {object} order
 * @returns {boolean}
 */
export function canCancelOrder(order) {
  return !TERMINAL_STATUSES.has(order.status) && order.status !== STATUS_SHIPPED;
}

/**
 * Transitions an order to the next logical status.
 *
 * @param {object} order
 * @returns {string} New status.
 */
export function advanceOrderStatus(order) {
  const transitions = {
    [STATUS_PENDING]:     STATUS_CONFIRMED,
    [STATUS_CONFIRMED]:   STATUS_PROCESSING,
    [STATUS_PROCESSING]:  STATUS_SHIPPED,
    [STATUS_SHIPPED]:     STATUS_DELIVERED,
  };
  return transitions[order.status] || order.status;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 14 · INVENTORY MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reserves stock for a set of order items, returning the updated
 * stock levels and any fulfilment errors.
 *
 * @param {Map<string, number>} stockMap  - SKU → available quantity.
 * @param {Array<{sku:string, quantity:number}>} items
 * @returns {{ updated: Map<string, number>, errors: string[] }}
 */
export function reserveStock(stockMap, items) {
  const updated = new Map(stockMap);
  const errors  = [];
  for (const item of items) {
    const available = updated.get(item.sku) ?? 0;
    if (available < item.quantity) {
      errors.push(`${ERR_INSUFFICIENT_STOCK}: SKU ${item.sku} has ${available} units (needed ${item.quantity})`);
    } else {
      updated.set(item.sku, available - item.quantity);
    }
  }
  return { updated, errors };
}

/**
 * Releases previously reserved stock back to available inventory.
 *
 * @param {Map<string, number>} stockMap
 * @param {Array<{sku:string, quantity:number}>} items
 * @returns {Map<string, number>}
 */
export function releaseStock(stockMap, items) {
  const updated = new Map(stockMap);
  for (const item of items) {
    updated.set(item.sku, (updated.get(item.sku) ?? 0) + item.quantity);
  }
  return updated;
}

/**
 * Identifies products that have fallen below their reorder threshold.
 *
 * @param {Map<string, number>} stockMap
 * @param {Map<string, number>} thresholds  - SKU → reorder point.
 * @returns {string[]} SKUs needing replenishment.
 */
export function findLowStockItems(stockMap, thresholds) {
  const lowStock = [];
  for (const [sku, qty] of stockMap) {
    const threshold = thresholds.get(sku) ?? 0;
    if (qty <= threshold) lowStock.push(sku);
  }
  return lowStock;
}

/**
 * Computes the total inventory value at cost.
 *
 * @param {Map<string, number>} stockMap
 * @param {Map<string, number>} costMap  - SKU → cost price.
 * @returns {number}
 */
export function inventoryValue(stockMap, costMap) {
  let total = 0;
  for (const [sku, qty] of stockMap) {
    total += qty * (costMap.get(sku) ?? 0);
  }
  return roundCurrency(total);
}

/**
 * Produces a stock movement record for audit purposes.
 *
 * @param {string} sku
 * @param {number} quantityDelta  - Positive for receipts, negative for issues.
 * @param {string} reason
 * @returns {object}
 */
export function stockMovement(sku, quantityDelta, reason) {
  return {
    sku,
    quantityDelta,
    reason,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Applies a list of stock movements to a stock map and returns the updated map.
 *
 * @param {Map<string, number>} stockMap
 * @param {object[]} movements
 * @returns {Map<string, number>}
 */
export function applyStockMovements(stockMap, movements) {
  const updated = new Map(stockMap);
  for (const mv of movements) {
    updated.set(mv.sku, Math.max(0, (updated.get(mv.sku) ?? 0) + mv.quantityDelta));
  }
  return updated;
}

/**
 * Computes shrinkage rate as a percentage of expected inventory.
 *
 * @param {number} expectedUnits
 * @param {number} actualUnits
 * @returns {number} Shrinkage rate in [0, 1].
 */
export function shrinkageRate(expectedUnits, actualUnits) {
  if (expectedUnits === 0) return 0;
  return Math.max(0, (expectedUnits - actualUnits) / expectedUnits);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 15 · REPORT BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a structured sales report for a collection of processed orders.
 *
 * @param {object[]} orders     - Processed order objects.
 * @param {object}   options
 * @param {Date}     options.from
 * @param {Date}     options.to
 * @param {string}   [options.granularity='day']
 * @returns {object} Report object.
 */
export function buildSalesReport(orders, options = {}) {
  const { from, to, granularity = 'day' } = options;
  const rangeOrders = from && to
    ? filterByDateRange(orders, 'processedAt', from, to)
    : orders;

  const report = {
    type:         REPORT_TYPE_SALES,
    generatedAt:  new Date().toISOString(),
    periodFrom:   from ? formatDate(from) : null,
    periodTo:     to   ? formatDate(to)   : null,
    orderCount:   rangeOrders.length,
    lineItems:    [],
    totals:       {},
    warnings:     [],
  };

  let totalRevenue   = 0;
  let totalTax       = 0;
  let totalShipping  = 0;
  let totalDiscount  = 0;
  let totalUnits     = 0;

  for (const order of rangeOrders) {
    for (const item of (order.items || [])) {
      const subtotal = roundCurrency(item.subtotal || lineSubtotal(item.unitPrice, item.quantity));
      report.lineItems.push({
        orderRef:    order.ref,
        sku:         item.sku,
        quantity:    item.quantity,
        unitPrice:   item.effectiveUnitPrice || item.unitPrice,
        subtotal,
        category:    item.categoryCode,
        orderedAt:   order.processedAt,
      });
      totalRevenue  = roundCurrency(totalRevenue + subtotal);
      totalUnits   += item.quantity;
    }
    totalTax      = roundCurrency(totalTax      + (order.taxAmount    || 0));
    totalShipping = roundCurrency(totalShipping + (order.shippingCost || 0));
    totalDiscount = roundCurrency(totalDiscount + (order.discountAmount || 0));
  }

  report.totals = {
    revenue:   totalRevenue,
    tax:       totalTax,
    shipping:  totalShipping,
    discount:  totalDiscount,
    units:     totalUnits,
    grandTotal: roundCurrency(totalRevenue + totalTax + totalShipping),
  };

  if (from && to) {
    report.timeSeries = aggregateByPeriod(rangeOrders, 'processedAt', 'grandTotal', from, to, granularity);
  }

  // Reconcile line items against grand total
  reconcileReport(report);

  return report;
}

/**
 * Builds an inventory snapshot report.
 *
 * @param {Map<string, number>} stockMap
 * @param {Map<string, number>} costMap
 * @param {Map<string, number>} reorderMap
 * @returns {object}
 */
export function buildInventoryReport(stockMap, costMap, reorderMap) {
  const lines = [];
  for (const [sku, qty] of stockMap) {
    const cost      = costMap.get(sku) ?? 0;
    const reorder   = reorderMap.get(sku) ?? 0;
    const lineValue = roundCurrency(qty * cost);
    lines.push({ sku, qty, cost, lineValue, belowReorder: qty <= reorder });
  }
  const totalValue = roundCurrency(lines.reduce((s, l) => s + l.lineValue, 0));
  return {
    type:        REPORT_TYPE_INVENTORY,
    generatedAt: new Date().toISOString(),
    lines,
    totalValue,
    lowStockSkus: lines.filter(l => l.belowReorder).map(l => l.sku),
  };
}

/**
 * Builds a tax liability report grouped by jurisdiction.
 *
 * @param {object[]} orders
 * @returns {object}
 */
export function buildTaxReport(orders) {
  const summary = buildTaxSummary(orders);
  const lines = [];
  let totalCollected = 0;
  for (const [, entry] of summary) {
    lines.push(entry);
    totalCollected = roundCurrency(totalCollected + entry.taxCollected);
  }
  return {
    type:           REPORT_TYPE_TAX,
    generatedAt:    new Date().toISOString(),
    lines,
    totalCollected,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 16 · RECONCILIATION & EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifies that the sum of individual line-item subtotals in a sales report
 * matches the declared grandTotal within an acceptable tolerance.
 *
 * The tolerance is set to half a cent (0.005) which is the maximum possible
 * rounding discrepancy when using "round half up" throughout.  If a different
 * rounding strategy is used in roundCurrency() this invariant may not hold
 * and reports will carry a RECONCILIATION_ERROR warning.
 *
 * This function is called automatically by buildSalesReport() and should not
 * need to be invoked directly.
 *
 * @param {object} report - A report object with lineItems[] and totals.grandTotal.
 * @returns {void}  Mutates report.warnings in place.
 */
export function reconcileReport(report) {
  const lineSum = report.lineItems.reduce((sum, item) => {
    return roundCurrency(sum + (item.subtotal || 0));
  }, 0);

  const declared = report.totals?.grandTotal ?? 0;
  const tax      = report.totals?.tax        ?? 0;
  const shipping = report.totals?.shipping   ?? 0;
  const expected = roundCurrency(lineSum + tax + shipping);

  const discrepancy = Math.abs(expected - declared);
  if (discrepancy > 0.005) {
    report.warnings = report.warnings || [];
    report.warnings.push(
      `${ERR_RECONCILIATION}: line-item sum ${formatMoney(lineSum)} + tax ${formatMoney(tax)} ` +
      `+ shipping ${formatMoney(shipping)} = ${formatMoney(expected)} ` +
      `but declared grandTotal is ${formatMoney(declared)} ` +
      `(discrepancy: ${formatMoney(discrepancy)})`
    );
  }
}

/**
 * Exports a report as a CSV string.
 *
 * @param {object}   report
 * @param {string[]} fields  - Field names to include in column order.
 * @returns {string}
 */
export function exportReportCsv(report, fields) {
  const header = fields.map(f => csvEscape(camelToLabel(f))).join(',');
  const rows   = (report.lineItems || []).map(item =>
    fields.map(f => csvEscape(item[f])).join(',')
  );
  const footer = `,,,,Generated: ${formatDateTime(new Date())}`;
  return [header, ...rows, footer].join('\n');
}

/**
 * Exports a report as a JSON string with metadata.
 *
 * @param {object} report
 * @returns {string}
 */
export function exportReportJson(report) {
  return JSON.stringify({
    metadata: {
      engine:      ENGINE_VERSION,
      exportedAt:  new Date().toISOString(),
      type:        report.type,
    },
    ...report,
  }, null, 2);
}

/**
 * Exports a report as a minimal XML string.
 *
 * @param {object}   report
 * @param {string[]} fields
 * @returns {string}
 */
export function exportReportXml(report, fields) {
  const escape = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<report type="${report.type}" generated="${new Date().toISOString()}">`,
  ];
  for (const item of (report.lineItems || [])) {
    lines.push('  <lineItem>');
    for (const f of fields) {
      lines.push(`    <${f}>${escape(item[f])}</${f}>`);
    }
    lines.push('  </lineItem>');
  }
  lines.push('</report>');
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 17 · DASHBOARD METRICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the key performance indicators for a dashboard summary card.
 *
 * @param {object[]} currentPeriodOrders
 * @param {object[]} previousPeriodOrders
 * @returns {object}
 */
export function computeKpis(currentPeriodOrders, previousPeriodOrders) {
  const sum = orders => orders.reduce((s, o) => s + (o.grandTotal || 0), 0);
  const cur  = roundCurrency(sum(currentPeriodOrders));
  const prev = roundCurrency(sum(previousPeriodOrders));
  const growth = prev === 0 ? null : pctOf(cur - prev, prev);

  const avgOrderValue = currentPeriodOrders.length > 0
    ? roundCurrency(cur / currentPeriodOrders.length)
    : 0;

  const uniqueCustomers = new Set(currentPeriodOrders.map(o => o.customerId)).size;
  const repeatCustomers = new Set(
    currentPeriodOrders
      .filter(o => previousPeriodOrders.some(p => p.customerId === o.customerId))
      .map(o => o.customerId)
  ).size;

  return {
    totalRevenue:    cur,
    previousRevenue: prev,
    revenueGrowth:   growth,
    avgOrderValue,
    orderCount:      currentPeriodOrders.length,
    uniqueCustomers,
    repeatCustomers,
    retentionRate:   uniqueCustomers > 0 ? pctOf(repeatCustomers, uniqueCustomers) : 0,
  };
}

/**
 * Computes a conversion funnel from session and order data.
 *
 * @param {number} sessions       - Total sessions in the period.
 * @param {number} productViews   - Sessions that viewed at least one product.
 * @param {number} addToCart      - Sessions that added to cart.
 * @param {number} checkoutStart  - Sessions that started checkout.
 * @param {number} orders         - Completed orders.
 * @returns {object}
 */
export function conversionFunnel(sessions, productViews, addToCart, checkoutStart, orders) {
  return {
    sessions,
    productViews,    productViewRate:   pctOf(productViews,  sessions),
    addToCart,       addToCartRate:     pctOf(addToCart,     productViews),
    checkoutStart,   checkoutStartRate: pctOf(checkoutStart, addToCart),
    orders,          conversionRate:    pctOf(orders,        sessions),
    cartAbandonRate: addToCart > 0 ? pctOf(addToCart - orders, addToCart) : 0,
  };
}

/**
 * Produces a top-N ranking of products by revenue.
 *
 * @param {object[]} orders
 * @param {number}   n
 * @returns {Array<{sku:string, revenue:number, units:number}>}
 */
export function topProducts(orders, n = 10) {
  const skuMap = new Map();
  for (const order of orders) {
    for (const item of (order.items || [])) {
      const existing = skuMap.get(item.sku) || { sku: item.sku, revenue: 0, units: 0 };
      existing.revenue = roundCurrency(existing.revenue + (item.subtotal || 0));
      existing.units  += item.quantity;
      skuMap.set(item.sku, existing);
    }
  }
  return sortDesc([...skuMap.values()], p => p.revenue).slice(0, n);
}

/**
 * Computes cohort retention: for each acquisition cohort (month), what
 * fraction of customers returned in each subsequent month.
 *
 * @param {Array<{customerId:string, orderedAt:string}>} events
 * @returns {Map<string, number[]>} cohort label → array of retention rates.
 */
export function cohortRetention(events) {
  const firstOrder = new Map();
  for (const e of events) {
    const id = e.customerId;
    const d  = new Date(e.orderedAt);
    if (!firstOrder.has(id) || d < firstOrder.get(id).date) {
      firstOrder.set(id, { date: d, cohort: periodLabel(d, 'month') });
    }
  }

  const cohorts = new Map();
  for (const [id, info] of firstOrder) {
    if (!cohorts.has(info.cohort)) cohorts.set(info.cohort, new Set());
    cohorts.get(info.cohort).add(id);
  }

  const result = new Map();
  for (const [cohortLabel, cohortCustomers] of cohorts) {
    const maxMonths = 12;
    const cohortStart = new Date(cohortLabel + '-01');
    const retention = [];
    for (let m = 0; m < maxMonths; m++) {
      const windowStart = new Date(cohortStart.getFullYear(), cohortStart.getMonth() + m, 1);
      const windowEnd   = new Date(cohortStart.getFullYear(), cohortStart.getMonth() + m + 1, 0);
      const active = new Set(
        events
          .filter(e => {
            const d = new Date(e.orderedAt);
            return d >= windowStart && d <= windowEnd && cohortCustomers.has(e.customerId);
          })
          .map(e => e.customerId)
      );
      retention.push(pctOf(active.size, cohortCustomers.size));
    }
    result.set(cohortLabel, retention);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 18 · FORECASTING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Produces a simple linear revenue forecast for the next N periods.
 *
 * @param {number[]} historicalRevenue - Ordered revenue values (oldest first).
 * @param {number}   periodsAhead      - How many periods to forecast.
 * @returns {number[]}
 */
export function forecastRevenue(historicalRevenue, periodsAhead) {
  const { slope, intercept } = linearRegression(historicalRevenue);
  const n = historicalRevenue.length;
  return Array.from({ length: periodsAhead }, (_, i) => {
    const raw = intercept + slope * (n + i);
    return roundCurrency(Math.max(0, raw));
  });
}

/**
 * Computes a seasonality index for each period based on historical data.
 *
 * @param {number[]} values       - Ordered period values.
 * @param {number}   cycleLength  - Periods per cycle (e.g. 12 for monthly).
 * @returns {number[]} Seasonality indices aligned to the cycle.
 */
export function seasonalityIndex(values, cycleLength) {
  if (values.length < cycleLength) return Array(cycleLength).fill(1);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  if (avg === 0) return Array(cycleLength).fill(1);
  const indices = Array(cycleLength).fill(0);
  const counts  = Array(cycleLength).fill(0);
  values.forEach((v, i) => {
    const pos = i % cycleLength;
    indices[pos] += v / avg;
    counts[pos]++;
  });
  return indices.map((sum, i) => counts[i] > 0 ? sum / counts[i] : 1);
}

/**
 * Applies seasonality adjustments to a base forecast.
 *
 * @param {number[]} baseForecast  - Raw forecasted values.
 * @param {number[]} seasonality   - Seasonality indices.
 * @param {number}   startPeriod   - Offset into the seasonality cycle.
 * @returns {number[]}
 */
export function applySeasonality(baseForecast, seasonality, startPeriod) {
  const len = seasonality.length;
  return baseForecast.map((v, i) => {
    const idx = (startPeriod + i) % len;
    return roundCurrency(v * (seasonality[idx] || 1));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 19 · CUSTOMER ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the Customer Lifetime Value (CLV) using the BG/NBD simplified model.
 *
 * @param {number} avgOrderValue   - Average value per order.
 * @param {number} purchaseFreq    - Average orders per year.
 * @param {number} customerLifespan - Expected years as a customer.
 * @param {number} [margin=0.3]    - Gross margin rate.
 * @returns {number}
 */
export function customerLifetimeValue(avgOrderValue, purchaseFreq, customerLifespan, margin = 0.3) {
  return roundCurrency(avgOrderValue * purchaseFreq * customerLifespan * margin);
}

/**
 * Assigns a customer to a tier based on their total spend.
 *
 * @param {number} totalSpend
 * @returns {string} Tier key.
 */
export function assignCustomerTier(totalSpend) {
  const tiers = Object.entries(CUSTOMER_TIERS).sort((a, b) => b[1].minSpend - a[1].minSpend);
  for (const [tier, config] of tiers) {
    if (totalSpend >= config.minSpend) return tier;
  }
  return 'BRONZE';
}

/**
 * Computes an RFM (Recency, Frequency, Monetary) score for a customer.
 *
 * @param {object} customer - Customer record with orders[].
 * @param {Date}   asOf     - Evaluation date.
 * @returns {{ recency: number, frequency: number, monetary: number, score: number }}
 */
export function rfmScore(customer, asOf) {
  const orders = customer.orders || [];
  if (orders.length === 0) return { recency: 0, frequency: 0, monetary: 0, score: 0 };

  const lastOrder  = orders.reduce((latest, o) => {
    const d = new Date(o.processedAt);
    return d > latest ? d : latest;
  }, new Date(0));

  const recency    = daysBetween(lastOrder, asOf);
  const frequency  = orders.length;
  const monetary   = roundCurrency(orders.reduce((s, o) => s + (o.grandTotal || 0), 0) / frequency);

  // Score: lower recency is better; higher frequency and monetary are better
  const recencyScore   = recency < 30 ? 5 : recency < 90 ? 4 : recency < 180 ? 3 : recency < 365 ? 2 : 1;
  const frequencyScore = frequency > 20 ? 5 : frequency > 10 ? 4 : frequency > 5 ? 3 : frequency > 2 ? 2 : 1;
  const monetaryScore  = monetary > 500 ? 5 : monetary > 200 ? 4 : monetary > 100 ? 3 : monetary > 50 ? 2 : 1;

  return {
    recency: recencyScore,
    frequency: frequencyScore,
    monetary: monetaryScore,
    score: recencyScore * 100 + frequencyScore * 10 + monetaryScore,
  };
}

/**
 * Identifies customers at risk of churn (no purchase in the past N days).
 *
 * @param {object[]} customers
 * @param {Date}     asOf
 * @param {number}   [windowDays=90]
 * @returns {object[]}
 */
export function churnRiskCustomers(customers, asOf, windowDays = 90) {
  const cutoff = addDays(asOf, -windowDays);
  return customers.filter(c => {
    const orders = c.orders || [];
    if (orders.length === 0) return true;
    const lastDate = orders.reduce((latest, o) => {
      const d = new Date(o.processedAt);
      return d > latest ? d : latest;
    }, new Date(0));
    return lastDate < cutoff;
  });
}

/**
 * Segments customers by their RFM scores into actionable groups.
 *
 * @param {object[]} customers
 * @param {Date}     asOf
 * @returns {Map<string, object[]>}
 */
export function segmentCustomers(customers, asOf) {
  const segments = new Map([
    ['champions',      []],
    ['loyal',          []],
    ['at_risk',        []],
    ['lost',           []],
    ['new',            []],
    ['promising',      []],
  ]);

  for (const customer of customers) {
    const { recency, frequency, monetary } = rfmScore(customer, asOf);
    if (recency >= 4 && frequency >= 4 && monetary >= 4) {
      segments.get('champions').push(customer);
    } else if (frequency >= 3 && monetary >= 3) {
      segments.get('loyal').push(customer);
    } else if (recency <= 2 && frequency >= 2) {
      segments.get('at_risk').push(customer);
    } else if (recency === 1) {
      segments.get('lost').push(customer);
    } else if (frequency === 1) {
      segments.get('new').push(customer);
    } else {
      segments.get('promising').push(customer);
    }
  }
  return segments;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 20 · PUBLIC API SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

export default {
  // Config
  ENGINE_VERSION, DATE_FORMAT, DEFAULT_CURRENCY,
  // Validators
  isValidPrice, isValidQuantity, validateSku, validateOrder, validateAddress,
  validatePayment, validateCoupon, validateLoyaltyRedemption, validateProduct,
  // Math
  roundCurrency, ceilCurrency, floorCurrency, applyPercentDiscount,
  applyFixedDiscount, splitEvenly, convertCurrency, stdDev, linearRegression,
  // Date
  formatDate, formatDateTime, parseDateStr, parseDateRange,
  filterByDateRange, filterByRangeString, buildPeriodBuckets, aggregateByPeriod,
  weekStart, daysBetween, addDays, periodLabel,
  // Products
  lineSubtotal, bulkDiscountedPrice, grossMargin, suggestedRetailPrice,
  summariseByCategory, eoq, reorderPoint,
  // Tax
  resolveTaxRate, computeTax, computeOrderTax, buildTaxSummary,
  // Shipping
  computeShippingCost, computeBaseShipping, qualifiesForFreeShipping,
  estimatedDelivery, weightSurcharge,
  // Promotions
  applyPromotion, stackPromotions, computeLoyaltyEarned, loyaltyPointsValue,
  maxRedeemablePoints,
  // Orders
  processOrder, computePartialRefund, canCancelOrder, advanceOrderStatus,
  // Inventory
  reserveStock, releaseStock, findLowStockItems, inventoryValue,
  stockMovement, applyStockMovements, shrinkageRate,
  // Reports
  buildSalesReport, buildInventoryReport, buildTaxReport,
  reconcileReport, exportReportCsv, exportReportJson, exportReportXml,
  // Dashboard
  computeKpis, conversionFunnel, topProducts, cohortRetention,
  // Forecast
  forecastRevenue, seasonalityIndex, applySeasonality,
  // Customers
  customerLifetimeValue, assignCustomerTier, rfmScore,
  churnRiskCustomers, segmentCustomers,
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 21 · LOYALTY PROGRAMME ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate points earned for a purchase.
 * Points are awarded on the pre-tax subtotal after discounts.
 */
export function calculatePointsEarned(subtotal) {
  if (!Number.isFinite(subtotal) || subtotal < 0) return 0;
  return Math.floor(subtotal * LOYALTY_POINTS_PER_DOLLAR);
}

/**
 * Calculate the dollar value redeemable for a given point balance.
 */
export function calculateRedemptionValue(points) {
  if (!Number.isFinite(points) || points < LOYALTY_MIN_REDEMPTION) return 0;
  return roundCurrency(points * LOYALTY_REDEMPTION_RATE);
}

/**
 * Apply loyalty redemption to an order, capping at LOYALTY_MAX_REDEMPTION_PCT
 * of the order subtotal.
 */
export function applyLoyaltyRedemption(order, pointsToRedeem) {
  if (!order || pointsToRedeem < LOYALTY_MIN_REDEMPTION) {
    return { discount: 0, pointsUsed: 0 };
  }
  const maxDiscount = roundCurrency(order.subtotal * LOYALTY_MAX_REDEMPTION_PCT);
  const requestedDiscount = calculateRedemptionValue(pointsToRedeem);
  const actualDiscount = Math.min(requestedDiscount, maxDiscount);
  const pointsUsed = Math.ceil(actualDiscount / LOYALTY_REDEMPTION_RATE);
  return { discount: actualDiscount, pointsUsed };
}

/**
 * Tier definitions for the loyalty programme.
 * Tier determines multiplier on points earned.
 */
export const LOYALTY_TIERS = [
  { name: 'Bronze',   minPoints:      0, multiplier: 1.0 },
  { name: 'Silver',   minPoints:  5_000, multiplier: 1.25 },
  { name: 'Gold',     minPoints: 15_000, multiplier: 1.5 },
  { name: 'Platinum', minPoints: 50_000, multiplier: 2.0 },
];

export function getLoyaltyTier(lifetimePoints) {
  let tier = LOYALTY_TIERS[0];
  for (const t of LOYALTY_TIERS) {
    if (lifetimePoints >= t.minPoints) tier = t;
  }
  return tier;
}

export function calculateTieredPoints(subtotal, lifetimePoints) {
  const base = calculatePointsEarned(subtotal);
  const { multiplier } = getLoyaltyTier(lifetimePoints);
  return Math.floor(base * multiplier);
}

/**
 * Compute a full loyalty summary for a customer.
 */
export function buildLoyaltySummary(customer) {
  const tier = getLoyaltyTier(customer.lifetimePoints || 0);
  const nextTier = LOYALTY_TIERS.find(t => t.minPoints > (customer.lifetimePoints || 0));
  const pointsToNextTier = nextTier ? nextTier.minPoints - (customer.lifetimePoints || 0) : 0;
  const redeemableValue = calculateRedemptionValue(customer.currentPoints || 0);
  return {
    customerId: customer.id,
    currentPoints: customer.currentPoints || 0,
    lifetimePoints: customer.lifetimePoints || 0,
    tier: tier.name,
    multiplier: tier.multiplier,
    nextTier: nextTier ? nextTier.name : null,
    pointsToNextTier,
    redeemableValue,
  };
}

/**
 * Process a loyalty transaction (earn or redeem).
 */
export function processLoyaltyTransaction(customer, type, amount) {
  const result = { success: false, pointsDelta: 0, newBalance: customer.currentPoints || 0 };
  if (type === 'EARN') {
    const points = calculateTieredPoints(amount, customer.lifetimePoints || 0);
    result.pointsDelta = points;
    result.newBalance = (customer.currentPoints || 0) + points;
    result.success = true;
  } else if (type === 'REDEEM') {
    const { discount, pointsUsed } = applyLoyaltyRedemption({ subtotal: amount }, customer.currentPoints || 0);
    if (discount > 0) {
      result.pointsDelta = -pointsUsed;
      result.newBalance = (customer.currentPoints || 0) - pointsUsed;
      result.discount = discount;
      result.success = true;
    }
  }
  return result;
}

/**
 * Aggregate loyalty statistics across a set of customers.
 */
export function aggregateLoyaltyStats(customers) {
  let totalPoints = 0;
  let totalRedeemable = 0;
  const tierCounts = {};
  for (const t of LOYALTY_TIERS) tierCounts[t.name] = 0;

  for (const c of customers) {
    totalPoints += c.currentPoints || 0;
    totalRedeemable += calculateRedemptionValue(c.currentPoints || 0);
    const tier = getLoyaltyTier(c.lifetimePoints || 0);
    tierCounts[tier.name] = (tierCounts[tier.name] || 0) + 1;
  }

  return {
    totalCustomers: customers.length,
    totalOutstandingPoints: totalPoints,
    totalRedeemableValue: roundCurrency(totalRedeemable),
    tierDistribution: tierCounts,
    averagePointsPerCustomer: customers.length > 0
      ? Math.round(totalPoints / customers.length) : 0,
  };
}

/**
 * Generate points expiry report — identifies points expiring within days.
 */
export function getExpiringPoints(transactions, days = 90) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  const expiring = [];
  for (const tx of transactions) {
    if (tx.type === 'EARN' && tx.expiresAt) {
      const expiresAt = new Date(tx.expiresAt);
      if (expiresAt <= cutoff && expiresAt > new Date()) {
        expiring.push({
          customerId: tx.customerId,
          points: tx.points,
          expiresAt: tx.expiresAt,
          daysRemaining: Math.ceil((expiresAt - new Date()) / 86_400_000),
        });
      }
    }
  }
  expiring.sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));
  return expiring;
}

/**
 * Check if a loyalty redemption is valid for a given order.
 */
export function validateLoyaltyRedemption(customer, order, pointsRequested) {
  const errors = [];
  if ((customer.currentPoints || 0) < pointsRequested) {
    errors.push('Insufficient points balance');
  }
  if (pointsRequested < LOYALTY_MIN_REDEMPTION) {
    errors.push(`Minimum redemption is ${LOYALTY_MIN_REDEMPTION} points`);
  }
  const maxDiscount = order.subtotal * LOYALTY_MAX_REDEMPTION_PCT;
  const requestedDiscount = pointsRequested * LOYALTY_REDEMPTION_RATE;
  if (requestedDiscount > maxDiscount) {
    errors.push(`Cannot redeem more than ${LOYALTY_MAX_REDEMPTION_PCT * 100}% of order value`);
  }
  return { valid: errors.length === 0, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 22 · RETURN & REFUND ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export const RETURN_WINDOW_DAYS       = 30;
export const RESTOCKING_FEE_RATE      = 0.15;
export const RETURN_LABEL_COST        = 5.99;
export const FULL_REFUND_WINDOW_DAYS  = 7;

export const RETURN_REASON_DEFECTIVE     = 'DEFECTIVE';
export const RETURN_REASON_WRONG_ITEM    = 'WRONG_ITEM';
export const RETURN_REASON_NOT_AS_DESC   = 'NOT_AS_DESCRIBED';
export const RETURN_REASON_CHANGED_MIND  = 'CHANGED_MIND';
export const RETURN_REASON_DAMAGED       = 'DAMAGED_IN_SHIPPING';

export const NO_RESTOCK_REASONS = new Set([
  RETURN_REASON_DEFECTIVE,
  RETURN_REASON_WRONG_ITEM,
  RETURN_REASON_DAMAGED,
]);

/**
 * Determine if a return is within the return window.
 */
export function isReturnEligible(orderDate, returnRequestDate) {
  const orderTime = new Date(orderDate).getTime();
  const requestTime = new Date(returnRequestDate).getTime();
  const daysDiff = (requestTime - orderTime) / 86_400_000;
  return daysDiff >= 0 && daysDiff <= RETURN_WINDOW_DAYS;
}

/**
 * Determine if a return qualifies for a full refund (no restocking fee).
 */
export function isFullRefundEligible(orderDate, returnRequestDate, reason) {
  if (NO_RESTOCK_REASONS.has(reason)) return true;
  const orderTime = new Date(orderDate).getTime();
  const requestTime = new Date(returnRequestDate).getTime();
  const daysDiff = (requestTime - orderTime) / 86_400_000;
  return daysDiff <= FULL_REFUND_WINDOW_DAYS;
}

/**
 * Calculate refund amount for a return.
 */
export function calculateRefundAmount(order, items, reason, returnDate) {
  if (!isReturnEligible(order.createdAt, returnDate)) {
    return { eligible: false, refundAmount: 0, restockingFee: 0 };
  }

  let itemTotal = 0;
  for (const returnItem of items) {
    const orderItem = order.items.find(i => i.sku === returnItem.sku);
    if (orderItem) {
      itemTotal += orderItem.unitPrice * returnItem.quantity;
    }
  }
  itemTotal = roundCurrency(itemTotal);

  const fullRefund = isFullRefundEligible(order.createdAt, returnDate, reason);
  const restockingFee = fullRefund ? 0 : roundCurrency(itemTotal * RESTOCKING_FEE_RATE);
  const refundAmount = roundCurrency(itemTotal - restockingFee);

  return {
    eligible: true,
    refundAmount,
    restockingFee,
    itemTotal,
    fullRefund,
    labelCost: reason === RETURN_REASON_DEFECTIVE ? 0 : RETURN_LABEL_COST,
  };
}

/**
 * Process a return and produce a return record.
 */
export function processReturn(order, returnRequest) {
  const { items, reason, requestDate } = returnRequest;
  const refund = calculateRefundAmount(order, items, reason, requestDate);

  return {
    orderId: order.id,
    returnId: `RET-${order.id}-${Date.now()}`,
    status: refund.eligible ? STATUS_REFUNDED : STATUS_CANCELLED,
    reason,
    requestDate,
    processedDate: new Date().toISOString(),
    items,
    refundAmount: refund.refundAmount,
    restockingFee: refund.restockingFee,
    labelCost: refund.labelCost,
    netRefund: roundCurrency(refund.refundAmount - refund.labelCost),
    eligible: refund.eligible,
  };
}

/**
 * Aggregate return statistics for a report period.
 */
export function aggregateReturnStats(returns) {
  let totalReturns = 0;
  let totalRefunded = 0;
  let totalRestocking = 0;
  const reasonCounts = {};

  for (const r of returns) {
    totalReturns++;
    totalRefunded += r.refundAmount || 0;
    totalRestocking += r.restockingFee || 0;
    reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1;
  }

  const topReason = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])[0];

  return {
    totalReturns,
    totalRefunded: roundCurrency(totalRefunded),
    totalRestockingFees: roundCurrency(totalRestocking),
    topReturnReason: topReason ? topReason[0] : null,
    reasonBreakdown: reasonCounts,
    averageRefund: totalReturns > 0
      ? roundCurrency(totalRefunded / totalReturns) : 0,
  };
}

/**
 * Identify high-return customers (potentially fraudulent behaviour).
 */
export function flagHighReturnCustomers(orders, returns, threshold = 0.30) {
  const ordersByCustomer = {};
  for (const o of orders) {
    ordersByCustomer[o.customerId] = (ordersByCustomer[o.customerId] || []);
    ordersByCustomer[o.customerId].push(o);
  }

  const returnsByCustomer = {};
  for (const r of returns) {
    const order = orders.find(o => o.id === r.orderId);
    if (!order) continue;
    returnsByCustomer[order.customerId] = (returnsByCustomer[order.customerId] || 0) + 1;
  }

  const flagged = [];
  for (const [customerId, customerOrders] of Object.entries(ordersByCustomer)) {
    const returnCount = returnsByCustomer[customerId] || 0;
    const returnRate = returnCount / customerOrders.length;
    if (returnRate >= threshold && returnCount >= 3) {
      flagged.push({ customerId, returnRate, returnCount, orderCount: customerOrders.length });
    }
  }

  flagged.sort((a, b) => b.returnRate - a.returnRate);
  return flagged;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 23 · COUPON & VOUCHER ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export const COUPON_TYPE_PERCENT    = 'PERCENT';
export const COUPON_TYPE_FIXED      = 'FIXED';
export const COUPON_TYPE_BOGO       = 'BOGO';
export const COUPON_TYPE_FREE_SHIP  = 'FREE_SHIPPING';

/**
 * Validate a coupon code format.
 * Valid codes are 6-16 uppercase alphanumeric characters with optional dashes.
 */
export function validateCouponCode(code) {
  if (typeof code !== 'string') return false;
  return /^[A-Z0-9][A-Z0-9\-]{4,14}[A-Z0-9]$/.test(code);
}

/**
 * Check if a coupon is currently active.
 */
export function isCouponActive(coupon, now = new Date()) {
  if (!coupon || coupon.disabled) return false;
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return false;
  if (coupon.startsAt && new Date(coupon.startsAt) > now) return false;
  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) return false;
  return true;
}

/**
 * Calculate discount from a coupon for the given order.
 */
export function applyCoupon(coupon, order) {
  if (!isCouponActive(coupon)) {
    return { valid: false, discount: 0, reason: 'Coupon is not active' };
  }
  if (coupon.minOrderValue && order.subtotal < coupon.minOrderValue) {
    return {
      valid: false,
      discount: 0,
      reason: `Minimum order value of $${coupon.minOrderValue.toFixed(2)} required`,
    };
  }

  let discount = 0;
  if (coupon.type === COUPON_TYPE_PERCENT) {
    const rate = Math.min(coupon.value / 100, MAX_DISCOUNT_PERCENT);
    discount = roundCurrency(order.subtotal * rate);
  } else if (coupon.type === COUPON_TYPE_FIXED) {
    discount = roundCurrency(Math.min(coupon.value, order.subtotal));
  } else if (coupon.type === COUPON_TYPE_FREE_SHIP) {
    discount = order.shippingCost || 0;
  } else if (coupon.type === COUPON_TYPE_BOGO) {
    const eligibleItems = (order.items || [])
      .filter(i => !coupon.excludedSkus || !coupon.excludedSkus.includes(i.sku))
      .sort((a, b) => a.unitPrice - b.unitPrice);
    if (eligibleItems.length >= 2) {
      discount = roundCurrency(eligibleItems[0].unitPrice);
    }
  }

  if (coupon.maxDiscountAmount) {
    discount = Math.min(discount, coupon.maxDiscountAmount);
  }

  return { valid: true, discount, couponCode: coupon.code };
}

/**
 * Stack multiple coupons, returning total discount.
 * Only the first applicable coupon is used unless stackable is set.
 */
export function stackCoupons(coupons, order) {
  const applicable = coupons.filter(c => isCouponActive(c) && c.stackable !== false);
  if (applicable.length === 0) {
    const first = coupons.find(c => isCouponActive(c));
    return first ? applyCoupon(first, order) : { valid: false, discount: 0 };
  }

  let totalDiscount = 0;
  const applied = [];
  for (const coupon of applicable) {
    const result = applyCoupon(coupon, order);
    if (result.valid && result.discount > 0) {
      totalDiscount += result.discount;
      applied.push(coupon.code);
    }
  }
  return {
    valid: applied.length > 0,
    discount: roundCurrency(Math.min(totalDiscount, order.subtotal)),
    appliedCoupons: applied,
  };
}

/**
 * Generate a random coupon code.
 */
export function generateCouponCode(prefix = '') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = prefix.toUpperCase();
  const remaining = 12 - code.length;
  for (let i = 0; i < remaining; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Build a coupon usage report.
 */
export function buildCouponUsageReport(coupons, orders) {
  const usageMap = {};
  for (const order of orders) {
    for (const code of (order.appliedCoupons || [])) {
      if (!usageMap[code]) usageMap[code] = { uses: 0, totalDiscount: 0 };
      usageMap[code].uses++;
      usageMap[code].totalDiscount += order.couponDiscount || 0;
    }
  }

  return coupons.map(coupon => ({
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    maxUses: coupon.maxUses,
    expiresAt: coupon.expiresAt,
    uses: usageMap[coupon.code]?.uses || 0,
    totalDiscount: roundCurrency(usageMap[coupon.code]?.totalDiscount || 0),
    redemptionRate: coupon.maxUses
      ? (usageMap[coupon.code]?.uses || 0) / coupon.maxUses
      : null,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 24 · PRODUCT CATALOGUE ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalise a product object to a canonical form.
 */
export function normaliseProduct(raw) {
  return {
    sku: (raw.sku || '').toUpperCase().trim(),
    title: (raw.title || raw.name || '').trim(),
    description: (raw.description || '').trim(),
    price: roundCurrency(parseFloat(raw.price || raw.unitPrice || 0)),
    compareAtPrice: raw.compareAtPrice ? roundCurrency(parseFloat(raw.compareAtPrice)) : null,
    category: (raw.category || 'UNCATEGORISED').toUpperCase(),
    tags: Array.isArray(raw.tags) ? raw.tags.map(t => t.toLowerCase().trim()) : [],
    weight: parseFloat(raw.weight || 0),
    dimensions: {
      length: parseFloat(raw.length || raw.dimensions?.length || 0),
      width:  parseFloat(raw.width  || raw.dimensions?.width  || 0),
      height: parseFloat(raw.height || raw.dimensions?.height || 0),
    },
    isOversized: (raw.weight || 0) > 70 || (raw.dimensions?.length || 0) > 108,
    isHazmat: Boolean(raw.hazmat || raw.isHazmat),
    stock: parseInt(raw.stock || raw.quantity || 0, 10),
    active: raw.active !== false && raw.status !== 'INACTIVE',
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

/**
 * Calculate the discount percentage between price and compare-at price.
 */
export function calculateSalePercentage(price, compareAtPrice) {
  if (!compareAtPrice || compareAtPrice <= price) return 0;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

/**
 * Check if a product qualifies for a category discount.
 */
export function getCategoryDiscount(product, discountRules) {
  if (!discountRules || discountRules.length === 0) return 0;
  for (const rule of discountRules) {
    if (rule.category === product.category) return rule.discountRate;
    if (rule.tags && rule.tags.some(t => (product.tags || []).includes(t))) {
      return rule.discountRate;
    }
  }
  return 0;
}

/**
 * Compute effective price after applying category and coupon discounts.
 */
export function getEffectivePrice(product, categoryDiscountRate = 0, couponDiscount = 0) {
  const afterCategory = roundCurrency(product.price * (1 - categoryDiscountRate));
  return roundCurrency(Math.max(0, afterCategory - couponDiscount));
}

/**
 * Build a product search index for fast lookup.
 */
export function buildProductIndex(products) {
  const byId = new Map();
  const bySku = new Map();
  const byCategory = new Map();

  for (const p of products) {
    byId.set(p.id, p);
    bySku.set(p.sku, p);
    const cat = p.category || 'UNCATEGORISED';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(p);
  }

  return { byId, bySku, byCategory };
}

/**
 * Search products by query string across title, description, and tags.
 */
export function searchProducts(products, query, options = {}) {
  const { category, minPrice, maxPrice, inStock, limit = 50 } = options;
  const q = query.toLowerCase().trim();
  let results = products;

  if (q) {
    results = results.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.includes(q))
    );
  }
  if (category) results = results.filter(p => p.category === category.toUpperCase());
  if (minPrice != null) results = results.filter(p => p.price >= minPrice);
  if (maxPrice != null) results = results.filter(p => p.price <= maxPrice);
  if (inStock) results = results.filter(p => p.stock > 0);

  return results.slice(0, limit);
}

/**
 * Recommend related products based on category and tags overlap.
 */
export function getRelatedProducts(product, allProducts, limit = 6) {
  const scored = allProducts
    .filter(p => p.sku !== product.sku && p.active)
    .map(p => {
      let score = 0;
      if (p.category === product.category) score += 3;
      const sharedTags = (p.tags || []).filter(t => (product.tags || []).includes(t));
      score += sharedTags.length;
      return { product: p, score };
    })
    .filter(x => x.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(x => x.product);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 25 · CUSTOMER SEGMENTATION
// ─────────────────────────────────────────────────────────────────────────────

export const SEGMENT_VIP          = 'VIP';
export const SEGMENT_LOYAL        = 'LOYAL';
export const SEGMENT_AT_RISK      = 'AT_RISK';
export const SEGMENT_LAPSED       = 'LAPSED';
export const SEGMENT_NEW          = 'NEW';
export const SEGMENT_ONE_TIME     = 'ONE_TIME';
export const SEGMENT_PROSPECT     = 'PROSPECT';

/**
 * RFM scoring: Recency, Frequency, Monetary.
 * Each dimension scored 1-5; higher is better.
 */
export function scoreRfm(customer, allCustomers) {
  const now = Date.now();

  // Recency
  const daysSinceLast = customer.lastOrderAt
    ? (now - new Date(customer.lastOrderAt).getTime()) / 86_400_000 : 9999;
  let recencyScore = 1;
  if (daysSinceLast <= 30)  recencyScore = 5;
  else if (daysSinceLast <= 90)  recencyScore = 4;
  else if (daysSinceLast <= 180) recencyScore = 3;
  else if (daysSinceLast <= 365) recencyScore = 2;

  // Frequency
  const orderCount = customer.orderCount || 0;
  let frequencyScore = 1;
  if (orderCount >= 20) frequencyScore = 5;
  else if (orderCount >= 10) frequencyScore = 4;
  else if (orderCount >= 5)  frequencyScore = 3;
  else if (orderCount >= 2)  frequencyScore = 2;

  // Monetary
  const ltv = customer.lifetimeValue || 0;
  let monetaryScore = 1;
  if (ltv >= 5000) monetaryScore = 5;
  else if (ltv >= 2000) monetaryScore = 4;
  else if (ltv >= 1000) monetaryScore = 3;
  else if (ltv >= 300)  monetaryScore = 2;

  const total = recencyScore + frequencyScore + monetaryScore;
  return { recencyScore, frequencyScore, monetaryScore, total };
}

/**
 * Assign a segment label based on RFM scores.
 */
export function assignSegment(rfm, orderCount) {
  if (orderCount === 0) return SEGMENT_PROSPECT;
  if (orderCount === 1) return SEGMENT_ONE_TIME;
  if (rfm.total >= 13) return SEGMENT_VIP;
  if (rfm.recencyScore <= 2 && rfm.frequencyScore >= 3) return SEGMENT_AT_RISK;
  if (rfm.recencyScore === 1) return SEGMENT_LAPSED;
  if (rfm.total >= 9) return SEGMENT_LOYAL;
  if (orderCount <= 3) return SEGMENT_NEW;
  return SEGMENT_ONE_TIME;
}

/**
 * Segment a list of customers.
 */
export function segmentCustomers(customers) {
  return customers.map(c => {
    const rfm = scoreRfm(c, customers);
    const segment = assignSegment(rfm, c.orderCount || 0);
    return { ...c, rfm, segment };
  });
}

/**
 * Count customers per segment.
 */
export function segmentDistribution(customers) {
  const dist = {};
  for (const c of customers) {
    dist[c.segment] = (dist[c.segment] || 0) + 1;
  }
  return dist;
}

/**
 * Compute average LTV per segment.
 */
export function avgLtvBySegment(segmentedCustomers) {
  const sums = {};
  const counts = {};
  for (const c of segmentedCustomers) {
    sums[c.segment] = (sums[c.segment] || 0) + (c.lifetimeValue || 0);
    counts[c.segment] = (counts[c.segment] || 0) + 1;
  }
  const result = {};
  for (const seg of Object.keys(sums)) {
    result[seg] = roundCurrency(sums[seg] / counts[seg]);
  }
  return result;
}

/**
 * Generate win-back campaign targets from lapsed / at-risk customers.
 */
export function getWinBackTargets(segmentedCustomers, maxCount = 1000) {
  const eligible = segmentedCustomers.filter(
    c => c.segment === SEGMENT_LAPSED || c.segment === SEGMENT_AT_RISK
  );
  eligible.sort((a, b) => (b.lifetimeValue || 0) - (a.lifetimeValue || 0));
  return eligible.slice(0, maxCount).map(c => ({
    customerId: c.id,
    email: c.email,
    segment: c.segment,
    daysSinceLast: c.lastOrderAt
      ? Math.round((Date.now() - new Date(c.lastOrderAt).getTime()) / 86_400_000)
      : null,
    lifetimeValue: c.lifetimeValue,
    suggestedIncentive: c.lifetimeValue >= 2000 ? '20% OFF' : '10% OFF',
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 26 · A/B TEST TRACKING
// ─────────────────────────────────────────────────────────────────────────────

export const VARIANT_CONTROL    = 'CONTROL';
export const VARIANT_TREATMENT  = 'TREATMENT';

/**
 * Hash a customer ID to a test bucket deterministically.
 * Returns a float in [0, 1).
 */
export function hashToBucket(customerId, testId) {
  const combined = `${testId}:${customerId}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (Math.imul(31, hash) + combined.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) / 2_147_483_648;
}

/**
 * Assign a customer to a test variant.
 */
export function assignVariant(customerId, testId, trafficPercent = 0.50) {
  const bucket = hashToBucket(customerId, testId);
  if (bucket >= trafficPercent) return null; // Not in test
  return bucket < trafficPercent / 2 ? VARIANT_CONTROL : VARIANT_TREATMENT;
}

/**
 * Compute conversion rate for a variant.
 */
export function conversionRate(variantResults) {
  if (!variantResults || variantResults.exposed === 0) return 0;
  return variantResults.converted / variantResults.exposed;
}

/**
 * Compute relative lift between control and treatment.
 */
export function computeLift(control, treatment) {
  const cr = conversionRate(control);
  const tr = conversionRate(treatment);
  if (cr === 0) return null;
  return (tr - cr) / cr;
}

/**
 * Simple z-test for proportion difference (two-tailed).
 * Returns z-score; reject null if |z| > 1.96 (p < 0.05).
 */
export function zTestProportions(n1, p1, n2, p2) {
  const pPool = (n1 * p1 + n2 * p2) / (n1 + n2);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
  if (se === 0) return 0;
  return (p1 - p2) / se;
}

/**
 * Summarise A/B test results.
 */
export function summarizeAbTest(test) {
  const ctrl = test.variants[VARIANT_CONTROL];
  const treat = test.variants[VARIANT_TREATMENT];
  if (!ctrl || !treat) return null;

  const crControl   = conversionRate(ctrl);
  const crTreatment = conversionRate(treat);
  const lift        = computeLift(ctrl, treat);
  const zScore      = zTestProportions(ctrl.exposed, crControl, treat.exposed, crTreatment);

  return {
    testId: test.id,
    name: test.name,
    control:   { n: ctrl.exposed,  cvr: crControl,   converted: ctrl.converted  },
    treatment: { n: treat.exposed, cvr: crTreatment, converted: treat.converted },
    lift,
    zScore,
    significant: Math.abs(zScore) > 1.96,
    winner: Math.abs(zScore) > 1.96 ? (lift > 0 ? VARIANT_TREATMENT : VARIANT_CONTROL) : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 27 · PAYMENT PROCESSING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const PAYMENT_STATUS_PENDING    = 'PENDING';
export const PAYMENT_STATUS_AUTHORISED = 'AUTHORISED';
export const PAYMENT_STATUS_CAPTURED   = 'CAPTURED';
export const PAYMENT_STATUS_FAILED     = 'FAILED';
export const PAYMENT_STATUS_REFUNDED   = 'REFUNDED';
export const PAYMENT_STATUS_CHARGEBACK = 'CHARGEBACK';

/**
 * Validate a credit card number using the Luhn algorithm.
 */
export function luhnCheck(cardNumber) {
  const digits = String(cardNumber).replace(/\D/g, '').split('').map(Number);
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits[i];
    if (alternate) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

/**
 * Detect card brand from number prefix.
 */
export function detectCardBrand(cardNumber) {
  const n = String(cardNumber).replace(/\D/g, '');
  if (/^4/.test(n)) return 'VISA';
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'MASTERCARD';
  if (/^3[47]/.test(n)) return 'AMEX';
  if (/^6(?:011|5)/.test(n)) return 'DISCOVER';
  return 'UNKNOWN';
}

/**
 * Mask a card number for display.
 */
export function maskCardNumber(cardNumber) {
  const n = String(cardNumber).replace(/\D/g, '');
  return `****-****-****-${n.slice(-4)}`;
}

/**
 * Compute payment processing fee based on provider rates.
 */
export function calculateProcessingFee(amount, method) {
  const FEES = {
    CARD:          { pct: 0.029, fixed: 0.30 },
    PAYPAL:        { pct: 0.034, fixed: 0.30 },
    BANK_TRANSFER: { pct: 0.008, fixed: 0.00 },
    CRYPTO:        { pct: 0.010, fixed: 0.00 },
    STORE_CREDIT:  { pct: 0.000, fixed: 0.00 },
    LOYALTY_POINTS:{ pct: 0.000, fixed: 0.00 },
  };
  const fee = FEES[method] || FEES.CARD;
  return roundCurrency(amount * fee.pct + fee.fixed);
}

/**
 * Summarise payment method distribution across orders.
 */
export function paymentMethodBreakdown(orders) {
  const totals = {};
  const counts = {};
  for (const order of orders) {
    const m = order.paymentMethod || 'UNKNOWN';
    totals[m] = (totals[m] || 0) + (order.total || 0);
    counts[m] = (counts[m] || 0) + 1;
  }
  return Object.keys(counts).map(method => ({
    method,
    orderCount: counts[method],
    totalRevenue: roundCurrency(totals[method]),
    averageOrder: roundCurrency(totals[method] / counts[method]),
    shareOfOrders: orders.length > 0 ? counts[method] / orders.length : 0,
  }));
}

/**
 * Detect potentially fraudulent payments.
 */
export function detectFraudSignals(order) {
  const signals = [];
  if (order.shippingAddress?.country !== order.billingAddress?.country) {
    signals.push('BILLING_SHIPPING_COUNTRY_MISMATCH');
  }
  if (order.total >= LARGE_ORDER_THRESHOLD) {
    signals.push('LARGE_ORDER');
  }
  if (order.paymentMethod === PAYMENT_CARD && !order.avs) {
    signals.push('NO_AVS_CHECK');
  }
  if (order.ipCountry && order.billingAddress?.country !== order.ipCountry) {
    signals.push('IP_COUNTRY_MISMATCH');
  }
  if ((order.items || []).length === 1 && order.total >= 500) {
    signals.push('HIGH_VALUE_SINGLE_ITEM');
  }
  return { fraudSignals: signals, riskScore: signals.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 28 · EMAIL NOTIFICATION TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build order confirmation email data.
 */
export function buildOrderConfirmationEmail(order, customer) {
  const itemLines = (order.items || []).map(item => ({
    sku: item.sku,
    title: item.title,
    quantity: item.quantity,
    unitPrice: formatCurrency(item.unitPrice),
    subtotal: formatCurrency(item.unitPrice * item.quantity),
  }));

  return {
    to: customer.email,
    subject: `Order Confirmed #${order.id}`,
    templateId: 'ORDER_CONFIRMATION',
    data: {
      customerName: customer.name,
      orderId: order.id,
      orderDate: formatDate(new Date(order.createdAt)),
      items: itemLines,
      subtotal: formatCurrency(order.subtotal),
      discount: order.discount > 0 ? formatCurrency(order.discount) : null,
      tax: formatCurrency(order.tax),
      shipping: formatCurrency(order.shippingCost),
      total: formatCurrency(order.total),
      estimatedDelivery: order.estimatedDelivery
        ? formatDate(new Date(order.estimatedDelivery)) : 'TBD',
      trackingNumber: order.trackingNumber || null,
    },
  };
}

/**
 * Build shipping notification email data.
 */
export function buildShippingEmail(order, customer, tracking) {
  return {
    to: customer.email,
    subject: `Your order #${order.id} has shipped!`,
    templateId: 'SHIPPING_NOTIFICATION',
    data: {
      customerName: customer.name,
      orderId: order.id,
      trackingNumber: tracking.number,
      carrier: tracking.carrier,
      trackingUrl: tracking.url,
      estimatedDelivery: tracking.estimatedDelivery
        ? formatDate(new Date(tracking.estimatedDelivery)) : 'TBD',
    },
  };
}

/**
 * Build return confirmation email data.
 */
export function buildReturnEmail(returnRecord, customer) {
  return {
    to: customer.email,
    subject: `Return Request Received #${returnRecord.returnId}`,
    templateId: 'RETURN_CONFIRMATION',
    data: {
      customerName: customer.name,
      returnId: returnRecord.returnId,
      orderId: returnRecord.orderId,
      refundAmount: formatCurrency(returnRecord.netRefund),
      reason: returnRecord.reason,
      labelIncluded: returnRecord.labelCost === 0,
    },
  };
}

/**
 * Build win-back campaign email data.
 */
export function buildWinBackEmail(customer, incentive) {
  return {
    to: customer.email,
    subject: `We miss you! Here's ${incentive} off your next order`,
    templateId: 'WIN_BACK',
    data: {
      customerName: customer.name,
      incentive,
      couponCode: generateCouponCode('WB'),
      expiresAt: formatDate(new Date(Date.now() + 30 * 86_400_000)),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 29 · WEBHOOK EVENT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

export const EVENT_ORDER_CREATED      = 'order.created';
export const EVENT_ORDER_UPDATED      = 'order.updated';
export const EVENT_ORDER_FULFILLED    = 'order.fulfilled';
export const EVENT_ORDER_CANCELLED    = 'order.cancelled';
export const EVENT_ORDER_REFUNDED     = 'order.refunded';
export const EVENT_CUSTOMER_CREATED   = 'customer.created';
export const EVENT_PRODUCT_UPDATED    = 'product.updated';
export const EVENT_INVENTORY_LOW      = 'inventory.low';

/**
 * Build a webhook event payload.
 */
export function buildWebhookEvent(type, payload, source = 'analytics-engine') {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type,
    created: new Date().toISOString(),
    source,
    apiVersion: ENGINE_VERSION,
    data: payload,
  };
}

/**
 * Sign a webhook payload with an HMAC-like signature.
 * In production this should use crypto.createHmac('sha256', secret).
 * This is a simplified stand-in for demonstration.
 */
export function signWebhookPayload(payload, secret) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  let hash = 0;
  const key = String(secret);
  for (let i = 0; i < body.length; i++) {
    hash = (Math.imul(31, hash) + body.charCodeAt(i)) | 0;
    hash ^= key.charCodeAt(i % key.length);
  }
  return `sha256=${Math.abs(hash).toString(16).padStart(8, '0')}`;
}

/**
 * Verify a webhook signature.
 */
export function verifyWebhookSignature(payload, signature, secret) {
  const expected = signWebhookPayload(payload, secret);
  return signature === expected;
}

/**
 * Queue a webhook for delivery with retry metadata.
 */
export function createWebhookDelivery(event, endpoint) {
  return {
    eventId: event.id,
    endpoint,
    attempts: 0,
    maxAttempts: MAX_RETRY_ATTEMPTS,
    nextAttemptAt: new Date().toISOString(),
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 30 · ANALYTICS PIPELINE ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the full analytics pipeline for a set of orders.
 * Returns a complete report bundle.
 */
export function runAnalyticsPipeline(rawOrders, options = {}) {
  const {
    startDate,
    endDate,
    currency = DEFAULT_CURRENCY,
    includeReturns = true,
    includeLoyalty = true,
    segmentCustomers: doSegment = true,
  } = options;

  // 1. Filter by date range
  let orders = rawOrders;
  if (startDate || endDate) {
    const range = { startDate, endDate };
    orders = rawOrders.filter(o => isInDateRange(new Date(o.createdAt), range));
  }

  if (orders.length === 0) {
    return {
      summary: { orderCount: 0, revenue: 0, averageOrder: 0 },
      orders: [],
      customers: [],
      topProducts: [],
    };
  }

  // 2. Revenue summary
  const revenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const summary = {
    orderCount: orders.length,
    revenue: roundCurrency(revenue),
    averageOrder: roundCurrency(revenue / orders.length),
    currency,
    period: { startDate, endDate },
  };

  // 3. Customer data
  const customerMap = new Map();
  for (const order of orders) {
    const cid = order.customerId;
    if (!customerMap.has(cid)) {
      customerMap.set(cid, {
        id: cid,
        email: order.customerEmail,
        name: order.customerName,
        orderCount: 0,
        lifetimeValue: 0,
        lastOrderAt: null,
        currentPoints: 0,
        lifetimePoints: 0,
      });
    }
    const c = customerMap.get(cid);
    c.orderCount++;
    c.lifetimeValue += order.total || 0;
    c.lastOrderAt = order.createdAt;
    if (includeLoyalty) {
      const pts = calculatePointsEarned(order.subtotal || 0);
      c.currentPoints += pts;
      c.lifetimePoints += pts;
    }
  }

  let customers = Array.from(customerMap.values()).map(c => ({
    ...c,
    lifetimeValue: roundCurrency(c.lifetimeValue),
  }));

  if (doSegment) {
    customers = segmentCustomers(customers);
  }

  // 4. Product analytics
  const productRevenue = {};
  const productUnits = {};
  for (const order of orders) {
    for (const item of (order.items || [])) {
      productRevenue[item.sku] = (productRevenue[item.sku] || 0) + (item.unitPrice * item.quantity);
      productUnits[item.sku] = (productUnits[item.sku] || 0) + item.quantity;
    }
  }
  const topProducts = Object.entries(productRevenue)
    .map(([sku, rev]) => ({ sku, revenue: roundCurrency(rev), units: productUnits[sku] }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20);

  return { summary, orders, customers, topProducts };
}

/**
 * Partition a pipeline result into daily buckets.
 */
export function partitionByDay(orders) {
  const days = {};
  for (const order of orders) {
    const day = formatDate(new Date(order.createdAt));
    if (!days[day]) days[day] = [];
    days[day].push(order);
  }
  return days;
}

/**
 * Compute running totals across daily buckets.
 */
export function computeRunningTotals(dailyBuckets) {
  const dates = Object.keys(dailyBuckets).sort();
  let cumulativeRevenue = 0;
  let cumulativeOrders = 0;
  return dates.map(date => {
    const dayOrders = dailyBuckets[date];
    const dayRevenue = dayOrders.reduce((s, o) => s + (o.total || 0), 0);
    cumulativeRevenue += dayRevenue;
    cumulativeOrders += dayOrders.length;
    return {
      date,
      dailyRevenue: roundCurrency(dayRevenue),
      dailyOrders: dayOrders.length,
      cumulativeRevenue: roundCurrency(cumulativeRevenue),
      cumulativeOrders,
    };
  });
}

/**
 * Compute week-over-week growth for a metric.
 */
export function weekOverWeekGrowth(dailyData, metric = 'dailyRevenue') {
  const results = [];
  for (let i = 7; i < dailyData.length; i++) {
    const current = dailyData[i][metric] || 0;
    const prior   = dailyData[i - 7][metric] || 0;
    const growth  = prior === 0 ? null : (current - prior) / prior;
    results.push({ date: dailyData[i].date, current, prior, growth });
  }
  return results;
}

/**
 * Compute month-over-month growth.
 */
export function monthOverMonthGrowth(monthlyData, metric = 'revenue') {
  const results = [];
  for (let i = 1; i < monthlyData.length; i++) {
    const current = monthlyData[i][metric] || 0;
    const prior   = monthlyData[i - 1][metric] || 0;
    const growth  = prior === 0 ? null : (current - prior) / prior;
    results.push({
      month: monthlyData[i].month,
      current: roundCurrency(current),
      prior: roundCurrency(prior),
      growth,
      growthFormatted: growth != null ? `${(growth * 100).toFixed(1)}%` : 'N/A',
    });
  }
  return results;
}

/**
 * Generate a full executive dashboard snapshot.
 */
export function generateExecutiveDashboard(orders, customers, returns = []) {
  const revenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const refunded = returns.reduce((s, r) => s + (r.refundAmount || 0), 0);

  const topCustomers = [...customers]
    .sort((a, b) => (b.lifetimeValue || 0) - (a.lifetimeValue || 0))
    .slice(0, 10);

  const returnStats = aggregateReturnStats(returns);
  const paymentBreakdown = paymentMethodBreakdown(orders);

  return {
    generatedAt: new Date().toISOString(),
    period: { orders: orders.length, customers: customers.length },
    revenue: {
      gross: roundCurrency(revenue),
      refunded: roundCurrency(refunded),
      net: roundCurrency(revenue - refunded),
    },
    averageOrderValue: orders.length > 0 ? roundCurrency(revenue / orders.length) : 0,
    topCustomers,
    returnStats,
    paymentBreakdown,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 31 · CARRIER & TRACKING INTEGRATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const TRACKING_STATUS_CREATED    = 'CREATED';
export const TRACKING_STATUS_PICKED_UP  = 'PICKED_UP';
export const TRACKING_STATUS_IN_TRANSIT = 'IN_TRANSIT';
export const TRACKING_STATUS_OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY';
export const TRACKING_STATUS_DELIVERED  = 'DELIVERED';
export const TRACKING_STATUS_EXCEPTION  = 'EXCEPTION';
export const TRACKING_STATUS_RETURNED   = 'RETURNED_TO_SENDER';

/**
 * Normalise a carrier tracking event to a common format.
 */
export function normaliseTrackingEvent(raw, carrier) {
  return {
    carrier,
    trackingNumber: raw.trackingNumber || raw.tracking_number || raw.number,
    status: normaliseTrackingStatus(raw.status || raw.event_type, carrier),
    location: [
      raw.city || raw.location?.city,
      raw.state || raw.location?.state,
      raw.country || raw.location?.country,
    ].filter(Boolean).join(', '),
    timestamp: raw.timestamp || raw.event_time || raw.datetime,
    description: raw.description || raw.message || '',
  };
}

export function normaliseTrackingStatus(rawStatus, carrier) {
  const s = (rawStatus || '').toUpperCase();
  if (s.includes('DELIV')) return TRACKING_STATUS_DELIVERED;
  if (s.includes('OUT_FOR') || s.includes('WITH_COURIER')) return TRACKING_STATUS_OUT_FOR_DELIVERY;
  if (s.includes('TRANSIT') || s.includes('IN_FLIGHT') || s.includes('ON_THE_WAY')) return TRACKING_STATUS_IN_TRANSIT;
  if (s.includes('PICKUP') || s.includes('PICKED')) return TRACKING_STATUS_PICKED_UP;
  if (s.includes('EXCEPTION') || s.includes('DELAY') || s.includes('HOLD')) return TRACKING_STATUS_EXCEPTION;
  if (s.includes('RETURN') || s.includes('RTS')) return TRACKING_STATUS_RETURNED;
  return TRACKING_STATUS_CREATED;
}

/**
 * Compute expected delivery window for a carrier zone.
 */
export function computeDeliveryWindow(carrier, zone, shippingMethod) {
  const BASE_DAYS = {
    USPS:            { ground: [5, 8], priority: [2, 3], express: [1, 2] },
    FEDEX:           { ground: [3, 7], priority: [2, 3], express: [1, 1] },
    UPS:             { ground: [3, 7], priority: [2, 3], express: [1, 1] },
    DHL:             { ground: [5, 9], priority: [3, 5], express: [2, 3] },
    AMAZON_LOGISTICS:{ ground: [3, 5], priority: [2, 3], express: [1, 2] },
  };

  const carrierDays = BASE_DAYS[carrier] || BASE_DAYS.USPS;
  const methodDays  = carrierDays[shippingMethod] || carrierDays.ground;
  const zoneAdj     = Math.max(0, (zone || 1) - 4);

  const earliest = new Date();
  earliest.setDate(earliest.getDate() + methodDays[0] + Math.floor(zoneAdj / 2));
  const latest = new Date();
  latest.setDate(latest.getDate() + methodDays[1] + zoneAdj);

  return { earliest: earliest.toISOString(), latest: latest.toISOString() };
}

/**
 * Check if a shipment is overdue based on expected delivery window.
 */
export function isShipmentOverdue(tracking, orderCreatedAt, carrier, zone, shippingMethod) {
  if (tracking.status === TRACKING_STATUS_DELIVERED) return false;
  const window = computeDeliveryWindow(carrier, zone, shippingMethod);
  return new Date() > new Date(window.latest);
}

/**
 * Aggregate shipment on-time performance.
 */
export function shippingOnTimeReport(shipments) {
  let total = 0;
  let onTime = 0;
  let late = 0;
  let missing = 0;
  const byCarrier = {};

  for (const s of shipments) {
    total++;
    const carrier = s.carrier || 'UNKNOWN';
    if (!byCarrier[carrier]) byCarrier[carrier] = { total: 0, onTime: 0, late: 0 };
    byCarrier[carrier].total++;

    if (!s.deliveredAt) {
      missing++;
    } else {
      const deliveredAt = new Date(s.deliveredAt).getTime();
      const expected = new Date(s.expectedDeliveryBy).getTime();
      if (deliveredAt <= expected) {
        onTime++;
        byCarrier[carrier].onTime++;
      } else {
        late++;
        byCarrier[carrier].late++;
      }
    }
  }

  return {
    total,
    onTime,
    late,
    missing,
    onTimeRate: total > 0 ? onTime / total : 0,
    byCarrier: Object.entries(byCarrier).map(([carrier, data]) => ({
      carrier,
      ...data,
      onTimeRate: data.total > 0 ? data.onTime / data.total : 0,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 32 · AUDIT LOG ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export const AUDIT_ACTION_CREATE  = 'CREATE';
export const AUDIT_ACTION_UPDATE  = 'UPDATE';
export const AUDIT_ACTION_DELETE  = 'DELETE';
export const AUDIT_ACTION_VIEW    = 'VIEW';
export const AUDIT_ACTION_EXPORT  = 'EXPORT';
export const AUDIT_ACTION_LOGIN   = 'LOGIN';
export const AUDIT_ACTION_LOGOUT  = 'LOGOUT';

/**
 * Create an audit log entry.
 */
export function createAuditEntry(actor, action, resource, resourceId, changes = null) {
  return {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
    actor: {
      id: actor.id,
      email: actor.email,
      role: actor.role,
    },
    action,
    resource,
    resourceId,
    changes,
    ip: actor.ip || null,
    userAgent: actor.userAgent || null,
  };
}

/**
 * Diff two objects and return changed fields.
 */
export function diffObjects(before, after) {
  const changes = {};
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  for (const key of allKeys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes[key] = { before: before[key], after: after[key] };
    }
  }
  return Object.keys(changes).length > 0 ? changes : null;
}

/**
 * Filter audit log entries by actor, resource, or action.
 */
export function queryAuditLog(entries, filters = {}) {
  const { actorId, resource, action, startDate, endDate } = filters;
  return entries.filter(entry => {
    if (actorId && entry.actor?.id !== actorId) return false;
    if (resource && entry.resource !== resource) return false;
    if (action && entry.action !== action) return false;
    if (startDate && new Date(entry.timestamp) < new Date(startDate)) return false;
    if (endDate && new Date(entry.timestamp) > new Date(endDate)) return false;
    return true;
  });
}

/**
 * Summarise audit log activity for a given period.
 */
export function auditLogSummary(entries) {
  const byActor  = {};
  const byAction = {};
  const byResource = {};

  for (const e of entries) {
    const actorKey = e.actor?.email || 'unknown';
    byActor[actorKey] = (byActor[actorKey] || 0) + 1;
    byAction[e.action] = (byAction[e.action] || 0) + 1;
    byResource[e.resource] = (byResource[e.resource] || 0) + 1;
  }

  return {
    totalEntries: entries.length,
    uniqueActors: Object.keys(byActor).length,
    byAction,
    byResource,
    mostActiveActors: Object.entries(byActor)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([email, count]) => ({ email, count })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 33 · RATE LIMITER & QUOTA MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Token bucket rate limiter state.
 * In production, bucket state should be stored in Redis.
 */
export function createBucket(capacity, refillRate) {
  return {
    capacity,
    refillRate,       // tokens per second
    tokens: capacity,
    lastRefill: Date.now(),
  };
}

export function refillBucket(bucket) {
  const now = Date.now();
  const elapsed = (now - bucket.lastRefill) / 1000;
  const refilled = elapsed * bucket.refillRate;
  bucket.tokens = Math.min(bucket.capacity, bucket.tokens + refilled);
  bucket.lastRefill = now;
  return bucket;
}

export function consumeToken(bucket, count = 1) {
  refillBucket(bucket);
  if (bucket.tokens < count) return false;
  bucket.tokens -= count;
  return true;
}

/**
 * Quota definitions per plan tier.
 */
export const PLAN_QUOTAS = {
  FREE:       { apiCallsPerDay: 1_000,   exportRowsPerMonth: 10_000,   seats: 1  },
  STARTER:    { apiCallsPerDay: 10_000,  exportRowsPerMonth: 100_000,  seats: 3  },
  GROWTH:     { apiCallsPerDay: 100_000, exportRowsPerMonth: 1_000_000,seats: 10 },
  ENTERPRISE: { apiCallsPerDay: Infinity,exportRowsPerMonth: Infinity,  seats: Infinity },
};

export function getQuota(planTier) {
  return PLAN_QUOTAS[planTier] || PLAN_QUOTAS.FREE;
}

export function checkQuota(usage, plan) {
  const quota = getQuota(plan);
  return {
    apiCalls: {
      used: usage.apiCallsToday,
      limit: quota.apiCallsPerDay,
      remaining: Math.max(0, quota.apiCallsPerDay - usage.apiCallsToday),
      exceeded: usage.apiCallsToday >= quota.apiCallsPerDay,
    },
    exports: {
      used: usage.exportRowsThisMonth,
      limit: quota.exportRowsPerMonth,
      remaining: Math.max(0, quota.exportRowsPerMonth - usage.exportRowsThisMonth),
      exceeded: usage.exportRowsThisMonth >= quota.exportRowsPerMonth,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 34 · MULTI-CURRENCY SUPPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exchange rate table (relative to USD).
 * In production this should be fetched from a live FX API.
 */
export const EXCHANGE_RATES = {
  USD: 1.000,
  EUR: 0.924,
  GBP: 0.792,
  CAD: 1.364,
  AUD: 1.532,
  JPY: 149.50,
  CNY: 7.236,
  INR: 83.12,
  BRL: 4.972,
  MXN: 17.15,
  SGD: 1.343,
  CHF: 0.901,
};

/**
 * Convert an amount from one currency to another.
 */
export function convertCurrency(amount, fromCurrency, toCurrency, rates = EXCHANGE_RATES) {
  if (fromCurrency === toCurrency) return roundCurrency(amount);
  const fromRate = rates[fromCurrency];
  const toRate   = rates[toCurrency];
  if (!fromRate || !toRate) throw new Error(`Unsupported currency: ${fromCurrency} or ${toCurrency}`);
  const usd = amount / fromRate;
  return roundCurrency(usd * toRate);
}

/**
 * Format an amount in a given currency with locale-appropriate formatting.
 */
export function formatCurrencyAmount(amount, currency) {
  const symbols = {
    USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$',
    JPY: '¥', CNY: '¥', INR: '₹', BRL: 'R$', MXN: 'MX$',
    SGD: 'S$', CHF: 'Fr.',
  };
  const sym = symbols[currency] || currency + ' ';
  if (currency === 'JPY') return `${sym}${Math.round(amount).toLocaleString()}`;
  return `${sym}${amount.toFixed(2)}`;
}

/**
 * Convert all monetary fields in an order to a target currency.
 */
export function convertOrderCurrency(order, targetCurrency, rates = EXCHANGE_RATES) {
  const from = order.currency || DEFAULT_CURRENCY;
  const convert = (v) => convertCurrency(v, from, targetCurrency, rates);
  return {
    ...order,
    currency: targetCurrency,
    subtotal:     convert(order.subtotal     || 0),
    discount:     convert(order.discount     || 0),
    tax:          convert(order.tax          || 0),
    shippingCost: convert(order.shippingCost || 0),
    total:        convert(order.total        || 0),
  };
}

/**
 * Summarise revenue by currency.
 */
export function revenueByOriginalCurrency(orders) {
  const totals = {};
  for (const o of orders) {
    const currency = o.currency || DEFAULT_CURRENCY;
    totals[currency] = (totals[currency] || 0) + (o.total || 0);
  }
  return Object.entries(totals).map(([currency, total]) => ({
    currency,
    total: roundCurrency(total),
    totalUsd: convertCurrency(total, currency, 'USD'),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 35 · DATA QUALITY & VALIDATION PIPELINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate an order record and return a list of validation errors.
 */
export function validateOrder(order) {
  const errors = [];

  if (!order.id) errors.push({ field: 'id', message: 'Order ID is required' });
  if (!order.customerId) errors.push({ field: 'customerId', message: 'Customer ID is required' });
  if (!order.createdAt) errors.push({ field: 'createdAt', message: 'Created date is required' });
  if (!Array.isArray(order.items) || order.items.length === 0) {
    errors.push({ field: 'items', message: 'Order must have at least one item' });
  }

  for (let i = 0; i < (order.items || []).length; i++) {
    const item = order.items[i];
    if (!validateSku(item.sku)) {
      errors.push({ field: `items[${i}].sku`, message: `Invalid SKU: ${item.sku}` });
    }
    if (!validatePrice(item.unitPrice)) {
      errors.push({ field: `items[${i}].unitPrice`, message: `Invalid price: ${item.unitPrice}` });
    }
    if (!validateQuantity(item.quantity)) {
      errors.push({ field: `items[${i}].quantity`, message: `Invalid quantity: ${item.quantity}` });
    }
  }

  if (order.total < 0) {
    errors.push({ field: 'total', message: 'Order total cannot be negative' });
  }

  if (order.status && !Object.values({
    STATUS_PENDING, STATUS_CONFIRMED, STATUS_PROCESSING,
    STATUS_SHIPPED, STATUS_DELIVERED, STATUS_CANCELLED,
    STATUS_REFUNDED, STATUS_PARTIAL_REFUND,
  }).includes(order.status)) {
    errors.push({ field: 'status', message: `Unknown status: ${order.status}` });
  }

  return errors;
}

/**
 * Validate a customer record.
 */
export function validateCustomer(customer) {
  const errors = [];
  if (!customer.id) errors.push({ field: 'id', message: 'Customer ID is required' });
  if (!customer.email || !validateEmail(customer.email)) {
    errors.push({ field: 'email', message: 'Valid email is required' });
  }
  if (!customer.name || customer.name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
  }
  return errors;
}

/**
 * Run data quality checks on a batch of orders.
 */
export function runDataQualityCheck(orders) {
  let valid = 0;
  let invalid = 0;
  const errorSummary = {};

  for (const order of orders) {
    const errors = validateOrder(order);
    if (errors.length === 0) {
      valid++;
    } else {
      invalid++;
      for (const err of errors) {
        errorSummary[err.field] = (errorSummary[err.field] || 0) + 1;
      }
    }
  }

  return {
    total: orders.length,
    valid,
    invalid,
    qualityScore: orders.length > 0 ? valid / orders.length : 1,
    topErrors: Object.entries(errorSummary)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([field, count]) => ({ field, count })),
  };
}

/**
 * Deduplicate orders by ID, keeping the most recently seen version.
 */
export function deduplicateOrders(orders) {
  const seen = new Map();
  for (const order of orders) {
    const existing = seen.get(order.id);
    if (!existing || new Date(order.updatedAt || order.createdAt) > new Date(existing.updatedAt || existing.createdAt)) {
      seen.set(order.id, order);
    }
  }
  return Array.from(seen.values());
}

/**
 * Merge two order datasets, deduplicating and resolving conflicts.
 */
export function mergeOrderDatasets(primary, secondary) {
  const combined = [...primary, ...secondary];
  return deduplicateOrders(combined);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 36 · GEOGRAPHIC & TIMEZONE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export const STATE_ABBREVIATIONS = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
  'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
  'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
  'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
  'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
  'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
  'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
  'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
  'Wisconsin': 'WI', 'Wyoming': 'WY',
};

export function normaliseStateCode(state) {
  if (!state) return null;
  const trimmed = state.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return STATE_ABBREVIATIONS[trimmed] || trimmed.toUpperCase();
}

/**
 * Parse a US ZIP code and return region metadata.
 */
export function parseZipCode(zip) {
  const cleaned = String(zip).replace(/\D/g, '').padStart(5, '0').slice(0, 5);
  const prefix = parseInt(cleaned.slice(0, 3), 10);

  let region = 'UNKNOWN';
  if (prefix >= 0   && prefix <= 99)  region = 'NORTHEAST';
  else if (prefix <= 299) region = 'SOUTHEAST';
  else if (prefix <= 499) region = 'MIDWEST';
  else if (prefix <= 599) region = 'PLAINS';
  else if (prefix <= 699) region = 'SOUTH';
  else if (prefix <= 799) region = 'SOUTHWEST';
  else if (prefix <= 899) region = 'WEST';
  else                    region = 'PACIFIC';

  return { zip: cleaned, region };
}

/**
 * Group orders by geographic region.
 */
export function groupOrdersByRegion(orders) {
  const regions = {};
  for (const order of orders) {
    const zip = order.shippingAddress?.zip || order.billingAddress?.zip || '';
    const { region } = parseZipCode(zip);
    if (!regions[region]) regions[region] = [];
    regions[region].push(order);
  }
  return regions;
}

/**
 * Compute revenue by region.
 */
export function revenueByRegion(orders) {
  const grouped = groupOrdersByRegion(orders);
  return Object.entries(grouped).map(([region, regionOrders]) => ({
    region,
    orderCount: regionOrders.length,
    revenue: roundCurrency(regionOrders.reduce((s, o) => s + (o.total || 0), 0)),
    shareOfOrders: orders.length > 0 ? regionOrders.length / orders.length : 0,
  })).sort((a, b) => b.revenue - a.revenue);
}

/**
 * Convert a UTC timestamp to a given IANA timezone.
 * Returns ISO string representation in the target timezone.
 * Note: Full timezone support requires Intl.DateTimeFormat.
 */
export function convertToTimezone(date, timezone = DEFAULT_TIMEZONE) {
  try {
    const d = new Date(date);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    return formatter.format(d);
  } catch {
    return new Date(date).toISOString();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 37 · SUBSCRIPTION & RECURRING REVENUE
// ─────────────────────────────────────────────────────────────────────────────

export const SUB_STATUS_ACTIVE     = 'ACTIVE';
export const SUB_STATUS_PAUSED     = 'PAUSED';
export const SUB_STATUS_CANCELLED  = 'CANCELLED';
export const SUB_STATUS_TRIALING   = 'TRIALING';
export const SUB_STATUS_PAST_DUE   = 'PAST_DUE';

export const SUB_INTERVAL_MONTHLY  = 'MONTHLY';
export const SUB_INTERVAL_ANNUAL   = 'ANNUAL';
export const SUB_INTERVAL_WEEKLY   = 'WEEKLY';
export const SUB_INTERVAL_QUARTERLY= 'QUARTERLY';

/**
 * Compute Monthly Recurring Revenue (MRR) from a set of subscriptions.
 */
export function computeMrr(subscriptions) {
  const INTERVAL_MONTHS = {
    WEEKLY: 1 / 4.33,
    MONTHLY: 1,
    QUARTERLY: 1 / 3,
    ANNUAL: 1 / 12,
  };

  let mrr = 0;
  for (const sub of subscriptions) {
    if (sub.status !== SUB_STATUS_ACTIVE && sub.status !== SUB_STATUS_PAST_DUE) continue;
    const factor = INTERVAL_MONTHS[sub.interval] || 1;
    mrr += (sub.amount || 0) * factor;
  }
  return roundCurrency(mrr);
}

/**
 * Compute Annual Recurring Revenue (ARR).
 */
export function computeArr(subscriptions) {
  return roundCurrency(computeMrr(subscriptions) * 12);
}

/**
 * Calculate churn rate for a period.
 */
export function calculateChurnRate(startCount, churned) {
  if (startCount === 0) return 0;
  return churned / startCount;
}

/**
 * Calculate net revenue retention (NRR).
 */
export function calculateNrr(startMrr, expansionMrr, contractionMrr, churnedMrr) {
  if (startMrr === 0) return 1;
  return (startMrr + expansionMrr - contractionMrr - churnedMrr) / startMrr;
}

/**
 * Forecast subscription revenue for the next N months.
 */
export function forecastSubscriptionRevenue(subscriptions, months = 12, assumedChurnRate = 0.03) {
  let currentMrr = computeMrr(subscriptions);
  const forecast = [];
  for (let i = 1; i <= months; i++) {
    currentMrr = roundCurrency(currentMrr * (1 - assumedChurnRate));
    const month = new Date();
    month.setMonth(month.getMonth() + i);
    forecast.push({
      month: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`,
      mrr: currentMrr,
      arr: roundCurrency(currentMrr * 12),
    });
  }
  return forecast;
}

/**
 * Compute cohort retention for subscription customers.
 * Cohort key: month of first subscription (YYYY-MM).
 */
export function subscriptionCohortRetention(subscriptions) {
  const cohorts = {};

  for (const sub of subscriptions) {
    const startMonth = (sub.startedAt || sub.createdAt || '').slice(0, 7);
    if (!cohorts[startMonth]) cohorts[startMonth] = { started: 0, active: 0 };
    cohorts[startMonth].started++;
    if (sub.status === SUB_STATUS_ACTIVE || sub.status === SUB_STATUS_TRIALING) {
      cohorts[startMonth].active++;
    }
  }

  return Object.entries(cohorts).map(([cohort, data]) => ({
    cohort,
    started: data.started,
    active: data.active,
    retentionRate: data.started > 0 ? data.active / data.started : 0,
  })).sort((a, b) => a.cohort.localeCompare(b.cohort));
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 38 · INVENTORY FORECASTING & REORDER
// ─────────────────────────────────────────────────────────────────────────────

export const REORDER_SAFETY_STOCK_MULTIPLIER = 1.5;
export const LEAD_TIME_DAYS_DEFAULT          = 14;

/**
 * Compute average daily sales velocity for a product.
 */
export function computeSalesVelocity(orders, sku, days = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  let totalUnits = 0;
  for (const order of orders) {
    if (new Date(order.createdAt) < cutoff) continue;
    for (const item of (order.items || [])) {
      if (item.sku === sku) totalUnits += item.quantity;
    }
  }
  return totalUnits / days;
}

/**
 * Compute reorder point for a product.
 * Reorder Point = (Average Daily Sales × Lead Time) × Safety Stock Multiplier
 */
export function computeReorderPoint(dailyVelocity, leadTimeDays = LEAD_TIME_DAYS_DEFAULT) {
  return Math.ceil(dailyVelocity * leadTimeDays * REORDER_SAFETY_STOCK_MULTIPLIER);
}

/**
 * Compute days of stock remaining at current velocity.
 */
export function computeDaysOfStock(currentStock, dailyVelocity) {
  if (dailyVelocity <= 0) return Infinity;
  return Math.floor(currentStock / dailyVelocity);
}

/**
 * Generate reorder alerts for products below their reorder point.
 */
export function generateReorderAlerts(products, orders) {
  const alerts = [];
  for (const product of products) {
    const velocity = computeSalesVelocity(orders, product.sku);
    const reorderPoint = computeReorderPoint(velocity);
    const daysOfStock = computeDaysOfStock(product.stock, velocity);

    if (product.stock <= reorderPoint) {
      alerts.push({
        sku: product.sku,
        title: product.title,
        currentStock: product.stock,
        reorderPoint,
        daysOfStock: isFinite(daysOfStock) ? daysOfStock : null,
        urgency: product.stock === 0 ? 'OUT_OF_STOCK'
          : daysOfStock <= 7 ? 'CRITICAL'
          : daysOfStock <= 14 ? 'HIGH'
          : 'MEDIUM',
        suggestedOrderQty: Math.ceil(velocity * 60),  // 60-day supply
      });
    }
  }
  alerts.sort((a, b) => {
    const urgencyRank = { OUT_OF_STOCK: 0, CRITICAL: 1, HIGH: 2, MEDIUM: 3 };
    return urgencyRank[a.urgency] - urgencyRank[b.urgency];
  });
  return alerts;
}

/**
 * Project inventory levels for the next N days.
 */
export function projectInventory(product, orders, days = 30) {
  const velocity = computeSalesVelocity(orders, product.sku);
  const projection = [];
  let stock = product.stock;
  for (let d = 1; d <= days; d++) {
    stock = Math.max(0, stock - velocity);
    const date = new Date();
    date.setDate(date.getDate() + d);
    projection.push({
      date: formatDate(date),
      stock: Math.round(stock),
      depleted: stock <= 0,
    });
  }
  return projection;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 39 · ADVANCED REPORT EXPORTERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Export a report to CSV format.
 * Handles nested objects by flattening up to 2 levels.
 */
export function exportToCsv(rows, columns) {
  if (!rows || rows.length === 0) return '';
  const header = columns.map(c => csvEscape(c.label || c.key)).join(',');
  const lines = [header];

  for (const row of rows) {
    const values = columns.map(col => {
      const keys = col.key.split('.');
      let value = row;
      for (const k of keys) value = value?.[k];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return csvEscape(JSON.stringify(value));
      return csvEscape(String(value));
    });
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

export function csvEscape(value) {
  if (typeof value !== 'string') return value;
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Export a report to JSON Lines format (one JSON object per line).
 */
export function exportToJsonLines(rows) {
  return rows.map(r => JSON.stringify(r)).join('\n');
}

/**
 * Export a report to XML format.
 */
export function exportToXml(rows, rootTag = 'report', rowTag = 'record') {
  const lines = [`<?xml version="1.0" encoding="UTF-8"?>`, `<${rootTag}>`];
  for (const row of rows) {
    lines.push(`  <${rowTag}>`);
    for (const [key, value] of Object.entries(row)) {
      const escaped = String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
      lines.push(`    <${key}>${escaped}</${key}>`);
    }
    lines.push(`  </${rowTag}>`);
  }
  lines.push(`</${rootTag}>`);
  return lines.join('\n');
}

/**
 * Build a standard column definition for common report types.
 */
export function getSalesReportColumns() {
  return [
    { key: 'id',            label: 'Order ID'       },
    { key: 'createdAt',     label: 'Date'           },
    { key: 'customerId',    label: 'Customer ID'    },
    { key: 'customerName',  label: 'Customer Name'  },
    { key: 'status',        label: 'Status'         },
    { key: 'subtotal',      label: 'Subtotal'       },
    { key: 'discount',      label: 'Discount'       },
    { key: 'tax',           label: 'Tax'            },
    { key: 'shippingCost',  label: 'Shipping'       },
    { key: 'total',         label: 'Total'          },
    { key: 'paymentMethod', label: 'Payment Method' },
    { key: 'currency',      label: 'Currency'       },
  ];
}

export function getInventoryReportColumns() {
  return [
    { key: 'sku',         label: 'SKU'            },
    { key: 'title',       label: 'Product Name'   },
    { key: 'category',    label: 'Category'       },
    { key: 'stock',       label: 'Stock'          },
    { key: 'price',       label: 'Unit Price'     },
    { key: 'reorderPoint',label: 'Reorder Point'  },
    { key: 'daysOfStock', label: 'Days of Stock'  },
    { key: 'urgency',     label: 'Urgency'        },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 40 · FINAL SUMMARY EXPORT MAP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Master export registry for the analytics engine.
 * All public functions and constants are listed here for documentation
 * and tree-shaking purposes.
 */
export const ANALYTICS_MODULES = {
  constants: {
    ENGINE_VERSION, ENGINE_BUILD,
    DATE_FORMAT, DATETIME_FORMAT, TIME_FORMAT, ISO_DATE_FORMAT,
    DEFAULT_CURRENCY, CURRENCY_PRECISION,
    LOYALTY_TIERS, PLAN_QUOTAS, EXCHANGE_RATES,
  },
  validators: {
    validateSku, validatePrice, validateQuantity, validateEmail,
    validateAddress, validateCouponCode, validateOrder, validateCustomer,
  },
  math: {
    roundCurrency, clampPercent, lerp, weightedAverage, standardDeviation,
  },
  dates: {
    formatDate, parseDateStr, parseDateRange, isInDateRange,
    getDateRangeForPeriod, getWeekBounds, getFiscalQuarter,
  },
  loyalty: {
    calculatePointsEarned, calculateRedemptionValue, applyLoyaltyRedemption,
    getLoyaltyTier, buildLoyaltySummary, processLoyaltyTransaction,
    aggregateLoyaltyStats, getExpiringPoints,
  },
  returns: {
    isReturnEligible, isFullRefundEligible, calculateRefundAmount,
    processReturn, aggregateReturnStats, flagHighReturnCustomers,
  },
  coupons: {
    validateCouponCode, isCouponActive, applyCoupon, stackCoupons,
    generateCouponCode, buildCouponUsageReport,
  },
  products: {
    normaliseProduct, calculateSalePercentage, getCategoryDiscount,
    getEffectivePrice, buildProductIndex, searchProducts, getRelatedProducts,
  },
  segmentation: {
    scoreRfm, assignSegment, segmentCustomers, segmentDistribution,
    avgLtvBySegment, getWinBackTargets,
  },
  abTesting: {
    hashToBucket, assignVariant, conversionRate, computeLift,
    zTestProportions, summarizeAbTest,
  },
  payments: {
    luhnCheck, detectCardBrand, maskCardNumber, calculateProcessingFee,
    paymentMethodBreakdown, detectFraudSignals,
  },
  subscriptions: {
    computeMrr, computeArr, calculateChurnRate, calculateNrr,
    forecastSubscriptionRevenue, subscriptionCohortRetention,
  },
  inventory: {
    computeSalesVelocity, computeReorderPoint, computeDaysOfStock,
    generateReorderAlerts, projectInventory,
  },
  export: {
    exportToCsv, exportToJsonLines, exportToXml,
    getSalesReportColumns, getInventoryReportColumns,
  },
  pipeline: {
    runAnalyticsPipeline, partitionByDay, computeRunningTotals,
    weekOverWeekGrowth, monthOverMonthGrowth, generateExecutiveDashboard,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 41 · COHORT ANALYSIS ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build an acquisition cohort matrix.
 * Cohorts are groups of customers who made their first purchase in the same month.
 * The matrix shows how many of those customers returned in each subsequent month.
 *
 * @param {Array} orders - All orders sorted by date ascending
 * @param {number} periods - Number of retention periods to compute
 * @returns {Array<Object>} Cohort rows with retention rates
 */
export function buildAcquisitionCohort(orders, periods = 6) {
  const firstPurchase = {};
  for (const order of orders) {
    const cid = order.customerId;
    const month = (order.createdAt || '').slice(0, 7);
    if (!firstPurchase[cid] || month < firstPurchase[cid]) {
      firstPurchase[cid] = month;
    }
  }

  // Group orders by customer cohort and activity month
  const cohortActivity = {};
  for (const order of orders) {
    const cid = order.customerId;
    const cohort = firstPurchase[cid];
    const actMonth = (order.createdAt || '').slice(0, 7);
    if (!cohort) continue;
    if (!cohortActivity[cohort]) cohortActivity[cohort] = {};
    cohortActivity[cohort][cid] = cohortActivity[cohort][cid] || new Set();
    cohortActivity[cohort][cid].add(actMonth);
  }

  const cohorts = Object.keys(cohortActivity).sort();
  return cohorts.map(cohort => {
    const customers = Object.keys(cohortActivity[cohort]);
    const size = customers.length;
    const retention = [size];

    for (let p = 1; p <= periods; p++) {
      const targetMonth = addMonthsToYearMonth(cohort, p);
      const retained = customers.filter(
        cid => cohortActivity[cohort][cid].has(targetMonth)
      ).length;
      retention.push(retained);
    }

    return {
      cohort,
      size,
      retention,
      retentionRates: retention.map(n => (size > 0 ? n / size : 0)),
    };
  });
}

/**
 * Add N months to a YYYY-MM string.
 */
export function addMonthsToYearMonth(ym, n) {
  const [year, month] = ym.split('-').map(Number);
  const date = new Date(year, month - 1 + n, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Compute average cohort retention across all cohorts for each period.
 */
export function avgCohortRetention(cohortMatrix) {
  if (cohortMatrix.length === 0) return [];
  const maxPeriods = Math.max(...cohortMatrix.map(c => c.retentionRates.length));
  const result = [];
  for (let p = 0; p < maxPeriods; p++) {
    const rates = cohortMatrix.map(c => c.retentionRates[p]).filter(r => r != null);
    const avg = rates.length > 0 ? rates.reduce((s, r) => s + r, 0) / rates.length : 0;
    result.push({ period: p, averageRetentionRate: avg });
  }
  return result;
}

/**
 * Compute revenue cohort: average revenue per customer by cohort.
 */
export function buildRevenueCohort(orders) {
  const firstPurchase = {};
  const revenueByCustomerMonth = {};

  for (const order of orders) {
    const cid = order.customerId;
    const month = (order.createdAt || '').slice(0, 7);
    if (!firstPurchase[cid] || month < firstPurchase[cid]) {
      firstPurchase[cid] = month;
    }
    const key = `${cid}:${month}`;
    revenueByCustomerMonth[key] = (revenueByCustomerMonth[key] || 0) + (order.total || 0);
  }

  const cohortRevenue = {};
  for (const [customerMonth, revenue] of Object.entries(revenueByCustomerMonth)) {
    const [cid, month] = customerMonth.split(':');
    const cohort = firstPurchase[cid];
    if (!cohort) continue;
    if (!cohortRevenue[cohort]) cohortRevenue[cohort] = {};
    cohortRevenue[cohort][month] = (cohortRevenue[cohort][month] || 0) + revenue;
  }

  return Object.entries(cohortRevenue).sort(([a], [b]) => a.localeCompare(b)).map(([cohort, months]) => ({
    cohort,
    monthlyRevenue: months,
    totalRevenue: roundCurrency(Object.values(months).reduce((s, r) => s + r, 0)),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 42 · FUNNEL ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

export const FUNNEL_STEP_VISIT          = 'VISIT';
export const FUNNEL_STEP_PRODUCT_VIEW   = 'PRODUCT_VIEW';
export const FUNNEL_STEP_ADD_TO_CART    = 'ADD_TO_CART';
export const FUNNEL_STEP_CHECKOUT_START = 'CHECKOUT_START';
export const FUNNEL_STEP_PAYMENT_INFO   = 'PAYMENT_INFO';
export const FUNNEL_STEP_ORDER_CONFIRM  = 'ORDER_CONFIRM';

export const STANDARD_FUNNEL = [
  FUNNEL_STEP_VISIT,
  FUNNEL_STEP_PRODUCT_VIEW,
  FUNNEL_STEP_ADD_TO_CART,
  FUNNEL_STEP_CHECKOUT_START,
  FUNNEL_STEP_PAYMENT_INFO,
  FUNNEL_STEP_ORDER_CONFIRM,
];

/**
 * Compute funnel metrics from a sequence of user events.
 * Each event: { userId, step, timestamp }
 */
export function computeFunnelMetrics(events, steps = STANDARD_FUNNEL) {
  const userSteps = {};
  for (const event of events) {
    if (!userSteps[event.userId]) userSteps[event.userId] = new Set();
    userSteps[event.userId].add(event.step);
  }

  const stepCounts = {};
  for (const step of steps) stepCounts[step] = 0;

  for (const userSet of Object.values(userSteps)) {
    for (const step of steps) {
      if (userSet.has(step)) stepCounts[step]++;
    }
  }

  const funnelRows = steps.map((step, i) => {
    const count = stepCounts[step] || 0;
    const prevCount = i === 0 ? count : (stepCounts[steps[i - 1]] || 0);
    return {
      step,
      count,
      dropoffRate: prevCount > 0 ? 1 - count / prevCount : 0,
      cumulativeRate: stepCounts[steps[0]] > 0 ? count / stepCounts[steps[0]] : 0,
    };
  });

  return funnelRows;
}

/**
 * Identify where users drop off most frequently in a funnel.
 */
export function identifyFunnelDropoff(funnelMetrics) {
  return [...funnelMetrics]
    .sort((a, b) => b.dropoffRate - a.dropoffRate)
    .slice(0, 3);
}

/**
 * Compare funnel performance between two time periods.
 */
export function compareFunnelPeriods(period1Events, period2Events, steps = STANDARD_FUNNEL) {
  const m1 = computeFunnelMetrics(period1Events, steps);
  const m2 = computeFunnelMetrics(period2Events, steps);

  return steps.map((step, i) => ({
    step,
    period1: m1[i],
    period2: m2[i],
    countDelta: m2[i].count - m1[i].count,
    dropoffDelta: m2[i].dropoffRate - m1[i].dropoffRate,
  }));
}

/**
 * Compute time-to-convert for each funnel user session.
 */
export function computeTimeToConvert(events) {
  const sessionStart = {};
  const sessionEnd = {};

  for (const event of events) {
    const ts = new Date(event.timestamp).getTime();
    if (!sessionStart[event.userId] || ts < sessionStart[event.userId]) {
      sessionStart[event.userId] = ts;
    }
    if (event.step === FUNNEL_STEP_ORDER_CONFIRM) {
      sessionEnd[event.userId] = ts;
    }
  }

  const convertedUsers = Object.keys(sessionEnd);
  const durations = convertedUsers
    .map(uid => (sessionEnd[uid] - sessionStart[uid]) / 1000)
    .filter(d => d >= 0);

  if (durations.length === 0) return { count: 0, averageSeconds: 0, medianSeconds: 0 };

  durations.sort((a, b) => a - b);
  const median = durations[Math.floor(durations.length / 2)];
  const avg = durations.reduce((s, d) => s + d, 0) / durations.length;

  return { count: durations.length, averageSeconds: Math.round(avg), medianSeconds: Math.round(median) };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 43 · SEARCH ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggregate search queries into a ranked list.
 */
export function aggregateSearchQueries(searchEvents, topN = 20) {
  const counts = {};
  const results = {};

  for (const event of searchEvents) {
    const q = (event.query || '').toLowerCase().trim();
    if (!q) continue;
    counts[q] = (counts[q] || 0) + 1;
    if (event.resultCount != null) {
      if (!results[q]) results[q] = { sum: 0, count: 0 };
      results[q].sum += event.resultCount;
      results[q].count++;
    }
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([query, count]) => ({
      query,
      count,
      avgResults: results[query]
        ? Math.round(results[query].sum / results[query].count)
        : null,
      zeroResults: results[query]?.sum === 0,
    }));
}

/**
 * Identify zero-result search queries — opportunities to add content or products.
 */
export function zeroResultQueries(searchEvents, minCount = 3) {
  const queryData = {};
  for (const event of searchEvents) {
    const q = (event.query || '').toLowerCase().trim();
    if (!q) continue;
    if (!queryData[q]) queryData[q] = { count: 0, zeroCount: 0 };
    queryData[q].count++;
    if (event.resultCount === 0) queryData[q].zeroCount++;
  }
  return Object.entries(queryData)
    .filter(([, d]) => d.zeroCount >= minCount)
    .map(([query, d]) => ({
      query,
      searches: d.count,
      zeroResultSearches: d.zeroCount,
      zeroResultRate: d.count > 0 ? d.zeroCount / d.count : 0,
    }))
    .sort((a, b) => b.zeroResultSearches - a.zeroResultSearches);
}

/**
 * Build a search-to-purchase funnel.
 * Links search sessions to subsequent orders within 30 minutes.
 */
export function searchToPurchaseFunnel(searchEvents, orders) {
  const ATTRIBUTION_WINDOW_MS = 30 * 60 * 1000;
  let attributed = 0;

  for (const order of orders) {
    const orderTime = new Date(order.createdAt).getTime();
    const customerSearches = searchEvents.filter(
      e => e.customerId === order.customerId &&
           Math.abs(new Date(e.timestamp).getTime() - orderTime) <= ATTRIBUTION_WINDOW_MS
    );
    if (customerSearches.length > 0) attributed++;
  }

  return {
    totalOrders: orders.length,
    searchAttributedOrders: attributed,
    searchAttributionRate: orders.length > 0 ? attributed / orders.length : 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 44 · PAGE PERFORMANCE METRICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute Core Web Vitals summary from performance events.
 * Metrics: LCP (Largest Contentful Paint), FID (First Input Delay), CLS.
 */
export function summariseCoreWebVitals(perfEvents) {
  const lcp = [], fid = [], cls = [];
  for (const e of perfEvents) {
    if (e.lcp != null) lcp.push(e.lcp);
    if (e.fid != null) fid.push(e.fid);
    if (e.cls != null) cls.push(e.cls);
  }

  const pct = (arr, p) => {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * p)];
  };

  return {
    lcp: { p75: pct(lcp, 0.75), good: pct(lcp, 0.75) < 2500, count: lcp.length },
    fid: { p75: pct(fid, 0.75), good: pct(fid, 0.75) < 100,  count: fid.length },
    cls: { p75: pct(cls, 0.75), good: pct(cls, 0.75) < 0.1,  count: cls.length },
  };
}

/**
 * Compute page load time distribution buckets.
 */
export function pageLoadDistribution(perfEvents, metric = 'ttfb') {
  const BUCKETS = [
    { label: '<100ms',  max: 100  },
    { label: '100-300ms', max: 300 },
    { label: '300-1s',  max: 1000 },
    { label: '1-3s',    max: 3000 },
    { label: '>3s',     max: Infinity },
  ];

  const counts = BUCKETS.map(b => ({ label: b.label, count: 0 }));

  for (const e of perfEvents) {
    const value = e[metric];
    if (value == null) continue;
    for (let i = 0; i < BUCKETS.length; i++) {
      if (value < BUCKETS[i].max) {
        counts[i].count++;
        break;
      }
    }
  }

  const total = counts.reduce((s, b) => s + b.count, 0);
  return counts.map(b => ({ ...b, share: total > 0 ? b.count / total : 0 }));
}

/**
 * Identify slowest pages by median load time.
 */
export function slowestPages(perfEvents, topN = 10) {
  const byPage = {};
  for (const e of perfEvents) {
    const page = e.page || e.url || 'unknown';
    if (!byPage[page]) byPage[page] = [];
    byPage[page].push(e.ttfb || e.loadTime || 0);
  }

  return Object.entries(byPage)
    .map(([page, times]) => {
      times.sort((a, b) => a - b);
      const median = times[Math.floor(times.length / 2)];
      return { page, medianMs: Math.round(median), samples: times.length };
    })
    .sort((a, b) => b.medianMs - a.medianMs)
    .slice(0, topN);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 45 · GEOGRAPHIC SALES HEATMAP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a sales heatmap grid indexed by state and month.
 */
export function buildStateSalesHeatmap(orders) {
  const grid = {};
  for (const order of orders) {
    const state = normaliseStateCode(
      order.shippingAddress?.state || order.billingAddress?.state || 'UNKNOWN'
    );
    const month = (order.createdAt || '').slice(0, 7);
    if (!grid[state]) grid[state] = {};
    grid[state][month] = (grid[state][month] || 0) + (order.total || 0);
  }

  // Round all values
  for (const state of Object.keys(grid)) {
    for (const month of Object.keys(grid[state])) {
      grid[state][month] = roundCurrency(grid[state][month]);
    }
  }

  return grid;
}

/**
 * Rank states by total revenue.
 */
export function rankStatesByRevenue(orders) {
  const totals = {};
  for (const order of orders) {
    const state = normaliseStateCode(
      order.shippingAddress?.state || order.billingAddress?.state || 'UNKNOWN'
    );
    totals[state] = (totals[state] || 0) + (order.total || 0);
  }
  return Object.entries(totals)
    .map(([state, revenue]) => ({ state, revenue: roundCurrency(revenue) }))
    .sort((a, b) => b.revenue - a.revenue);
}

/**
 * Identify emerging markets: states with high month-over-month growth.
 */
export function identifyEmergingMarkets(orders, threshold = 0.20) {
  const heatmap = buildStateSalesHeatmap(orders);
  const emerging = [];

  for (const [state, months] of Object.entries(heatmap)) {
    const monthKeys = Object.keys(months).sort();
    if (monthKeys.length < 2) continue;

    const lastMonth = months[monthKeys[monthKeys.length - 1]];
    const prevMonth = months[monthKeys[monthKeys.length - 2]];

    if (prevMonth > 0) {
      const growth = (lastMonth - prevMonth) / prevMonth;
      if (growth >= threshold) {
        emerging.push({ state, growth, lastMonthRevenue: lastMonth, prevMonthRevenue: prevMonth });
      }
    }
  }

  emerging.sort((a, b) => b.growth - a.growth);
  return emerging;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 46 · PRODUCT AFFINITY & BASKET ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find products frequently purchased together (co-occurrence).
 * Returns pairs sorted by co-occurrence count.
 */
export function findProductAffinities(orders, minCoOccurrence = 5) {
  const coOccurrence = {};

  for (const order of orders) {
    const skus = [...new Set((order.items || []).map(i => i.sku))];
    for (let i = 0; i < skus.length; i++) {
      for (let j = i + 1; j < skus.length; j++) {
        const key = [skus[i], skus[j]].sort().join('|');
        coOccurrence[key] = (coOccurrence[key] || 0) + 1;
      }
    }
  }

  return Object.entries(coOccurrence)
    .filter(([, count]) => count >= minCoOccurrence)
    .map(([pair, count]) => {
      const [sku1, sku2] = pair.split('|');
      return { sku1, sku2, coOccurrence: count };
    })
    .sort((a, b) => b.coOccurrence - a.coOccurrence);
}

/**
 * Compute association rules (support, confidence, lift) for product pairs.
 *
 * @param {Array} orders
 * @param {number} minSupport - Minimum fraction of orders containing the pair
 * @param {number} minConfidence - Minimum P(B|A)
 */
export function computeAssociationRules(orders, minSupport = 0.02, minConfidence = 0.30) {
  const totalOrders = orders.length;
  if (totalOrders === 0) return [];

  const skuCounts = {};
  const pairCounts = {};

  for (const order of orders) {
    const skus = [...new Set((order.items || []).map(i => i.sku))];
    for (const sku of skus) skuCounts[sku] = (skuCounts[sku] || 0) + 1;
    for (let i = 0; i < skus.length; i++) {
      for (let j = i + 1; j < skus.length; j++) {
        const key = [skus[i], skus[j]].sort().join('|');
        pairCounts[key] = (pairCounts[key] || 0) + 1;
      }
    }
  }

  const rules = [];
  for (const [pair, count] of Object.entries(pairCounts)) {
    const support = count / totalOrders;
    if (support < minSupport) continue;
    const [skuA, skuB] = pair.split('|');
    const confidenceAB = count / (skuCounts[skuA] || 1);
    const confidenceBA = count / (skuCounts[skuB] || 1);

    if (confidenceAB >= minConfidence) {
      const liftAB = confidenceAB / ((skuCounts[skuB] || 1) / totalOrders);
      rules.push({ antecedent: skuA, consequent: skuB, support, confidence: confidenceAB, lift: liftAB });
    }
    if (confidenceBA >= minConfidence) {
      const liftBA = confidenceBA / ((skuCounts[skuA] || 1) / totalOrders);
      rules.push({ antecedent: skuB, consequent: skuA, support, confidence: confidenceBA, lift: liftBA });
    }
  }

  rules.sort((a, b) => b.lift - a.lift);
  return rules;
}

/**
 * Compute average basket size and composition.
 */
export function basketAnalysis(orders) {
  const sizes = orders.map(o => (o.items || []).reduce((s, i) => s + i.quantity, 0));
  const values = orders.map(o => o.total || 0);

  if (sizes.length === 0) return { avgSize: 0, avgValue: 0, singleItemOrders: 0 };

  const avgSize = sizes.reduce((s, x) => s + x, 0) / sizes.length;
  const avgValue = values.reduce((s, x) => s + x, 0) / values.length;
  const singleItemOrders = sizes.filter(s => s === 1).length;

  return {
    avgSize: Math.round(avgSize * 100) / 100,
    avgValue: roundCurrency(avgValue),
    singleItemOrders,
    singleItemRate: orders.length > 0 ? singleItemOrders / orders.length : 0,
    maxBasketSize: Math.max(...sizes),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 47 · PREDICTIVE LEAD SCORING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lead score weights. Each attribute contributes to a 0-100 score.
 */
export const LEAD_SCORE_WEIGHTS = {
  emailOpened:       5,
  emailClicked:      10,
  siteVisit:         3,
  productView:       5,
  cartAbandoned:     15,
  pricingPageView:   20,
  supportTicket:     8,
  trialStarted:      30,
  demoRequested:     40,
  referralSource:    10,
};

/**
 * Compute a lead score for a prospect based on their activity.
 */
export function scoreLead(activities) {
  let score = 0;
  for (const activity of activities) {
    const weight = LEAD_SCORE_WEIGHTS[activity.type] || 0;
    score += weight * (activity.count || 1);
  }
  return Math.min(100, score);
}

/**
 * Classify a lead based on score threshold.
 */
export function classifyLead(score) {
  if (score >= 80) return 'HOT';
  if (score >= 50) return 'WARM';
  if (score >= 20) return 'COOL';
  return 'COLD';
}

/**
 * Rank leads by score descending.
 */
export function rankLeads(leads) {
  return leads
    .map(lead => ({
      ...lead,
      score: scoreLead(lead.activities || []),
      classification: classifyLead(scoreLead(lead.activities || [])),
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Predict conversion probability from lead score using a logistic-like mapping.
 */
export function predictConversionProbability(score) {
  // Logistic curve: p = 1 / (1 + e^(-k*(x - x0)))
  const k = 0.08;
  const x0 = 50;
  return 1 / (1 + Math.exp(-k * (score - x0)));
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 48 · FINANCIAL RECONCILIATION PIPELINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Match orders against payment gateway records to detect discrepancies.
 */
export function reconcileOrdersWithGateway(orders, gatewayRecords) {
  const gatewayMap = new Map(gatewayRecords.map(r => [r.orderId, r]));
  const matched = [];
  const unmatched = [];
  const discrepant = [];

  for (const order of orders) {
    const gateway = gatewayMap.get(order.id);
    if (!gateway) {
      unmatched.push({ orderId: order.id, issue: 'NOT_IN_GATEWAY' });
      continue;
    }
    const diff = Math.abs(order.total - gateway.amount);
    if (diff > 0.01) {
      discrepant.push({
        orderId: order.id,
        orderTotal: order.total,
        gatewayAmount: gateway.amount,
        difference: roundCurrency(diff),
      });
    } else {
      matched.push(order.id);
    }
  }

  // Check gateway records with no corresponding order
  for (const record of gatewayRecords) {
    const order = orders.find(o => o.id === record.orderId);
    if (!order) {
      unmatched.push({ orderId: record.orderId, issue: 'NOT_IN_ORDERS' });
    }
  }

  return {
    matched: matched.length,
    unmatched,
    discrepant,
    reconciliationRate: orders.length > 0 ? matched.length / orders.length : 0,
  };
}

/**
 * Generate a daily reconciliation summary.
 */
export function dailyReconciliationSummary(orders, gatewayRecords) {
  const result = reconcileOrdersWithGateway(orders, gatewayRecords);
  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const gatewayTotal = gatewayRecords.reduce((s, r) => s + (r.amount || 0), 0);

  return {
    generatedAt: new Date().toISOString(),
    orders: orders.length,
    gatewayRecords: gatewayRecords.length,
    matched: result.matched,
    unmatched: result.unmatched.length,
    discrepant: result.discrepant.length,
    totalOrderRevenue: roundCurrency(totalRevenue),
    totalGatewayRevenue: roundCurrency(gatewayTotal),
    revenueDifference: roundCurrency(Math.abs(totalRevenue - gatewayTotal)),
    reconciliationRate: result.reconciliationRate,
    status: result.discrepant.length === 0 && result.unmatched.length === 0
      ? 'CLEAN' : 'REQUIRES_REVIEW',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 49 · PROMOTIONAL CAMPAIGN ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute ROI for a promotional campaign.
 */
export function computeCampaignRoi(campaign, orders) {
  const campaignOrders = orders.filter(o =>
    (o.campaignId === campaign.id) ||
    (o.appliedCoupons || []).some(c => campaign.couponCodes?.includes(c))
  );

  const grossRevenue = campaignOrders.reduce((s, o) => s + (o.total || 0), 0);
  const discountGiven = campaignOrders.reduce((s, o) => s + (o.couponDiscount || o.discount || 0), 0);
  const netRevenue = grossRevenue - discountGiven;
  const profit = netRevenue - (campaign.cost || 0);
  const roi = campaign.cost > 0 ? profit / campaign.cost : null;

  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    orders: campaignOrders.length,
    grossRevenue: roundCurrency(grossRevenue),
    discountGiven: roundCurrency(discountGiven),
    netRevenue: roundCurrency(netRevenue),
    campaignCost: campaign.cost || 0,
    profit: roundCurrency(profit),
    roi,
    roiFormatted: roi != null ? `${(roi * 100).toFixed(1)}%` : 'N/A',
    averageOrderValue: campaignOrders.length > 0
      ? roundCurrency(grossRevenue / campaignOrders.length) : 0,
  };
}

/**
 * Attribute orders to campaigns using a last-touch model.
 */
export function lastTouchAttribution(orders, campaigns) {
  const campaignMap = new Map(campaigns.map(c => [c.id, c]));
  const attribution = {};

  for (const order of orders) {
    const campaignId = order.campaignId || order.lastTouchCampaign;
    if (!campaignId) continue;
    const campaign = campaignMap.get(campaignId);
    if (!campaign) continue;

    if (!attribution[campaignId]) {
      attribution[campaignId] = {
        campaignId,
        campaignName: campaign.name,
        orders: 0,
        revenue: 0,
      };
    }
    attribution[campaignId].orders++;
    attribution[campaignId].revenue += order.total || 0;
  }

  return Object.values(attribution)
    .map(a => ({ ...a, revenue: roundCurrency(a.revenue) }))
    .sort((a, b) => b.revenue - a.revenue);
}

/**
 * Compute email campaign performance metrics.
 */
export function emailCampaignMetrics(campaignStats) {
  const { sent, delivered, opened, clicked, unsubscribed, bounced, orders } = campaignStats;
  return {
    deliveryRate:    sent     > 0 ? delivered   / sent      : 0,
    openRate:        delivered> 0 ? opened       / delivered : 0,
    clickRate:       opened   > 0 ? clicked      / opened    : 0,
    clickToOpenRate: opened   > 0 ? clicked      / opened    : 0,
    unsubscribeRate: delivered> 0 ? unsubscribed / delivered : 0,
    bounceRate:      sent     > 0 ? bounced      / sent      : 0,
    conversionRate:  clicked  > 0 ? (orders || 0)/ clicked   : 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 50 · REAL-TIME ALERT ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export const ALERT_SEVERITY_INFO     = 'INFO';
export const ALERT_SEVERITY_WARNING  = 'WARNING';
export const ALERT_SEVERITY_CRITICAL = 'CRITICAL';

/**
 * Alert rule registry.
 * Each rule defines a condition and output alert metadata.
 */
export const ALERT_RULES = [
  {
    id: 'HIGH_REFUND_RATE',
    name: 'High Refund Rate',
    check: (metrics) => metrics.refundRate > 0.10,
    severity: ALERT_SEVERITY_WARNING,
    message: (m) => `Refund rate is ${(m.refundRate * 100).toFixed(1)}%, above 10% threshold`,
  },
  {
    id: 'ZERO_ORDERS',
    name: 'No Orders in Last Hour',
    check: (metrics) => metrics.ordersLastHour === 0 && metrics.expectedOrdersPerHour > 0,
    severity: ALERT_SEVERITY_CRITICAL,
    message: () => 'No orders received in the last hour — possible checkout issue',
  },
  {
    id: 'LOW_CONVERSION',
    name: 'Low Conversion Rate',
    check: (metrics) => metrics.conversionRate < 0.01,
    severity: ALERT_SEVERITY_WARNING,
    message: (m) => `Conversion rate is ${(m.conversionRate * 100).toFixed(2)}%, below 1% threshold`,
  },
  {
    id: 'HIGH_CART_ABANDONMENT',
    name: 'High Cart Abandonment',
    check: (metrics) => metrics.cartAbandonmentRate > 0.75,
    severity: ALERT_SEVERITY_WARNING,
    message: (m) => `Cart abandonment is ${(m.cartAbandonmentRate * 100).toFixed(1)}%`,
  },
  {
    id: 'FRAUD_SPIKE',
    name: 'Fraud Signal Spike',
    check: (metrics) => metrics.highRiskOrderRate > 0.05,
    severity: ALERT_SEVERITY_CRITICAL,
    message: (m) => `${(m.highRiskOrderRate * 100).toFixed(1)}% of orders have high fraud risk`,
  },
  {
    id: 'REVENUE_DROP',
    name: 'Revenue Drop vs Yesterday',
    check: (metrics) => metrics.revenueVsYesterday < -0.30,
    severity: ALERT_SEVERITY_WARNING,
    message: (m) => `Revenue is ${(m.revenueVsYesterday * 100).toFixed(1)}% vs yesterday`,
  },
];

/**
 * Evaluate all alert rules against current metrics.
 * Returns triggered alerts.
 */
export function evaluateAlerts(metrics) {
  const triggered = [];
  for (const rule of ALERT_RULES) {
    try {
      if (rule.check(metrics)) {
        triggered.push({
          id: rule.id,
          name: rule.name,
          severity: rule.severity,
          message: rule.message(metrics),
          triggeredAt: new Date().toISOString(),
          metrics: { ...metrics },
        });
      }
    } catch {
      // Rule evaluation errors are non-fatal
    }
  }
  return triggered;
}

/**
 * Deduplicate alerts that are already known to be firing.
 */
export function suppressDuplicateAlerts(newAlerts, activeAlerts, suppressWindowMs = 3_600_000) {
  const now = Date.now();
  const activeIds = new Set(
    activeAlerts
      .filter(a => now - new Date(a.triggeredAt).getTime() < suppressWindowMs)
      .map(a => a.id)
  );
  return newAlerts.filter(a => !activeIds.has(a.id));
}

/**
 * Route alerts to the appropriate channel based on severity.
 */
export function routeAlert(alert) {
  switch (alert.severity) {
    case ALERT_SEVERITY_CRITICAL:
      return { channel: 'PAGERDUTY', priority: 'P1' };
    case ALERT_SEVERITY_WARNING:
      return { channel: 'SLACK', priority: 'P3' };
    default:
      return { channel: 'EMAIL', priority: 'P5' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 51 · CUSTOMER LIFETIME VALUE MODELLING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute basic historical LTV for a customer.
 */
export function computeHistoricalLtv(orders, customerId) {
  return roundCurrency(
    orders
      .filter(o => o.customerId === customerId)
      .reduce((s, o) => s + (o.total || 0), 0)
  );
}

/**
 * Predict future LTV using a simple BG/NBD-style heuristic.
 * Estimates future value based on historical frequency and recency.
 *
 * @param {Object} customer - { orderCount, lifetimeValue, firstOrderAt, lastOrderAt }
 * @param {number} forecastMonths
 */
export function predictFutureLtv(customer, forecastMonths = 12) {
  const now = Date.now();
  const tenureMs = now - new Date(customer.firstOrderAt || now).getTime();
  const tenureMonths = tenureMs / (30 * 86_400_000) || 1;
  const monthlyOrderRate = (customer.orderCount || 0) / tenureMonths;
  const avgOrderValue = customer.orderCount > 0
    ? (customer.lifetimeValue || 0) / customer.orderCount : 0;

  const recencyMs = now - new Date(customer.lastOrderAt || 0).getTime();
  const recencyMonths = recencyMs / (30 * 86_400_000);
  const churnFactor = Math.exp(-0.05 * recencyMonths);

  const futurePurchases = monthlyOrderRate * forecastMonths * churnFactor;
  return roundCurrency(futurePurchases * avgOrderValue);
}

/**
 * Compute LTV distribution across all customers.
 */
export function ltvDistribution(customers) {
  const values = customers.map(c => c.lifetimeValue || 0).sort((a, b) => a - b);
  if (values.length === 0) return {};

  const pct = p => values[Math.floor(values.length * p)];
  const total = values.reduce((s, v) => s + v, 0);

  return {
    min:    roundCurrency(values[0]),
    p25:    roundCurrency(pct(0.25)),
    median: roundCurrency(pct(0.50)),
    p75:    roundCurrency(pct(0.75)),
    p90:    roundCurrency(pct(0.90)),
    p99:    roundCurrency(pct(0.99)),
    max:    roundCurrency(values[values.length - 1]),
    mean:   roundCurrency(total / values.length),
    total:  roundCurrency(total),
  };
}

/**
 * Identify top customers by predicted LTV.
 */
export function topPredictedLtvCustomers(customers, forecastMonths = 12, topN = 20) {
  return customers
    .map(c => ({
      ...c,
      predictedLtv: predictFutureLtv(c, forecastMonths),
    }))
    .sort((a, b) => b.predictedLtv - a.predictedLtv)
    .slice(0, topN);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 52 · BENCHMARK & COMPARISON UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compare a metric value against industry benchmarks.
 * Returns a rating: EXCELLENT, GOOD, AVERAGE, BELOW_AVERAGE, POOR
 */
export function benchmarkMetric(value, benchmarks) {
  const { excellent, good, average, belowAverage } = benchmarks;
  if (value >= excellent) return 'EXCELLENT';
  if (value >= good)      return 'GOOD';
  if (value >= average)   return 'AVERAGE';
  if (value >= belowAverage) return 'BELOW_AVERAGE';
  return 'POOR';
}

export const E_COMMERCE_BENCHMARKS = {
  conversionRate: { excellent: 0.05, good: 0.03, average: 0.02, belowAverage: 0.01 },
  cartAbandonmentRate: { excellent: 0.50, good: 0.60, average: 0.70, belowAverage: 0.80 },
  averageOrderValue: { excellent: 200, good: 100, average: 65, belowAverage: 40 },
  returnRate: { excellent: 0.05, good: 0.10, average: 0.15, belowAverage: 0.20 },
  emailOpenRate: { excellent: 0.35, good: 0.25, average: 0.20, belowAverage: 0.15 },
  nps: { excellent: 70, good: 50, average: 30, belowAverage: 10 },
};

/**
 * Generate a full benchmark scorecard for a set of metrics.
 */
export function generateBenchmarkScorecard(metrics) {
  const scorecard = [];
  for (const [key, benchmarks] of Object.entries(E_COMMERCE_BENCHMARKS)) {
    const value = metrics[key];
    if (value == null) continue;
    scorecard.push({
      metric: key,
      value,
      rating: benchmarkMetric(value, benchmarks),
      benchmark: benchmarks,
    });
  }
  return scorecard;
}

/**
 * Compute period-over-period comparison for a set of metrics.
 */
export function periodComparison(current, previous) {
  const result = {};
  for (const key of Object.keys(current)) {
    const curr = current[key] ?? 0;
    const prev = previous[key] ?? 0;
    result[key] = {
      current: curr,
      previous: prev,
      delta: roundCurrency(curr - prev),
      pctChange: prev !== 0 ? (curr - prev) / Math.abs(prev) : null,
    };
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 53 · SESSION ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggregate user sessions from raw event stream.
 * Sessions are groups of events from the same user within a 30-minute window.
 */
export function buildSessions(events, timeoutMs = 30 * 60 * 1000) {
  const byUser = {};
  for (const e of events) {
    if (!byUser[e.userId]) byUser[e.userId] = [];
    byUser[e.userId].push(e);
  }

  const sessions = [];
  for (const [userId, userEvents] of Object.entries(byUser)) {
    userEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    let sessionEvents = [userEvents[0]];

    for (let i = 1; i < userEvents.length; i++) {
      const gap = new Date(userEvents[i].timestamp) - new Date(userEvents[i - 1].timestamp);
      if (gap > timeoutMs) {
        sessions.push(buildSession(userId, sessionEvents));
        sessionEvents = [];
      }
      sessionEvents.push(userEvents[i]);
    }
    if (sessionEvents.length > 0) sessions.push(buildSession(userId, sessionEvents));
  }

  return sessions;
}

function buildSession(userId, events) {
  const start = new Date(events[0].timestamp);
  const end   = new Date(events[events.length - 1].timestamp);
  return {
    userId,
    sessionId: `${userId}:${start.getTime()}`,
    startedAt: start.toISOString(),
    endedAt:   end.toISOString(),
    durationMs: end - start,
    eventCount: events.length,
    pages: [...new Set(events.map(e => e.page).filter(Boolean))],
    converted: events.some(e => e.step === FUNNEL_STEP_ORDER_CONFIRM),
  };
}

/**
 * Compute session-level summary metrics.
 */
export function sessionMetrics(sessions) {
  if (sessions.length === 0) return {};
  const durations = sessions.map(s => s.durationMs);
  const avg = durations.reduce((s, d) => s + d, 0) / durations.length;
  const converted = sessions.filter(s => s.converted).length;
  return {
    totalSessions: sessions.length,
    avgDurationMs: Math.round(avg),
    avgDurationFormatted: formatDuration(avg),
    bounceRate: sessions.filter(s => s.eventCount <= 1).length / sessions.length,
    conversionRate: converted / sessions.length,
    pagesPerSession: sessions.reduce((s, sess) => s + sess.pages.length, 0) / sessions.length,
  };
}

/**
 * Format a duration in milliseconds to a human-readable string.
 */
export function formatDuration(ms) {
  const secs = Math.round(ms / 1000);
  const mins = Math.floor(secs / 60);
  const hrs  = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  if (mins > 0) return `${mins}m ${secs % 60}s`;
  return `${secs}s`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 54 · CONTENT & MERCHANDISING ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute click-through rate for homepage banners.
 */
export function bannerCtr(impressions, clicks) {
  if (!impressions || impressions === 0) return 0;
  return clicks / impressions;
}

/**
 * Rank merchandising slots by revenue contribution.
 */
export function rankMerchandisingSlots(slotData) {
  return [...slotData]
    .map(slot => ({
      ...slot,
      revenuePerImpression: slot.impressions > 0 ? slot.revenue / slot.impressions : 0,
      ctr: bannerCtr(slot.impressions, slot.clicks),
    }))
    .sort((a, b) => b.revenuePerImpression - a.revenuePerImpression);
}

/**
 * Identify underperforming product placements.
 * A slot is underperforming if its CTR is below the median CTR.
 */
export function identifyUnderperformingSlots(slotData) {
  const ctrs = slotData.map(s => bannerCtr(s.impressions, s.clicks)).sort((a, b) => a - b);
  const medianCtr = ctrs[Math.floor(ctrs.length / 2)] || 0;

  return slotData.filter(s => bannerCtr(s.impressions, s.clicks) < medianCtr * 0.5);
}

/**
 * Compute collection (category page) performance.
 */
export function collectionPerformance(pageViews, addToCartEvents, orders) {
  const byCollection = {};

  for (const pv of pageViews) {
    if (!pv.collection) continue;
    if (!byCollection[pv.collection]) byCollection[pv.collection] = { views: 0, adds: 0, orders: 0, revenue: 0 };
    byCollection[pv.collection].views++;
  }

  for (const e of addToCartEvents) {
    if (!e.collection || !byCollection[e.collection]) continue;
    byCollection[e.collection].adds++;
  }

  for (const o of orders) {
    if (!o.collection || !byCollection[o.collection]) continue;
    byCollection[o.collection].orders++;
    byCollection[o.collection].revenue += o.total || 0;
  }

  return Object.entries(byCollection).map(([collection, data]) => ({
    collection,
    ...data,
    revenue: roundCurrency(data.revenue),
    addRate: data.views > 0 ? data.adds / data.views : 0,
    purchaseRate: data.adds > 0 ? data.orders / data.adds : 0,
  })).sort((a, b) => b.revenue - a.revenue);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 55 · CONFIGURATION SCHEMA VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate an analytics engine configuration object.
 */
export function validateEngineConfig(config) {
  const errors = [];

  if (!config.currency || !Object.keys(EXCHANGE_RATES).includes(config.currency)) {
    errors.push({ field: 'currency', message: `Unsupported currency: ${config.currency}` });
  }

  if (config.pageSize != null) {
    if (!Number.isInteger(config.pageSize) || config.pageSize < 1 || config.pageSize > MAX_PAGE_SIZE) {
      errors.push({ field: 'pageSize', message: `pageSize must be between 1 and ${MAX_PAGE_SIZE}` });
    }
  }

  if (config.taxRate != null) {
    if (!Number.isFinite(config.taxRate) || config.taxRate < 0 || config.taxRate > 1) {
      errors.push({ field: 'taxRate', message: 'taxRate must be between 0 and 1' });
    }
  }

  if (config.dateFormat && config.dateFormat !== DATE_FORMAT && config.dateFormat !== ISO_DATE_FORMAT) {
    errors.push({ field: 'dateFormat', message: `Unrecognised date format: ${config.dateFormat}` });
  }

  if (config.exportFormat && !['CSV', 'JSON', 'JSONL', 'XML'].includes(config.exportFormat)) {
    errors.push({ field: 'exportFormat', message: `Unsupported export format: ${config.exportFormat}` });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Merge user config with defaults.
 */
export function mergeConfig(userConfig = {}) {
  return {
    currency:      userConfig.currency     || DEFAULT_CURRENCY,
    pageSize:      userConfig.pageSize     || DEFAULT_PAGE_SIZE,
    taxRate:       userConfig.taxRate      ?? DEFAULT_TAX_RATE,
    timezone:      userConfig.timezone     || DEFAULT_TIMEZONE,
    dateFormat:    userConfig.dateFormat   || DATE_FORMAT,
    exportFormat:  userConfig.exportFormat || 'CSV',
    maxRetries:    userConfig.maxRetries   || MAX_RETRY_ATTEMPTS,
    cacheEnabled:  userConfig.cacheEnabled ?? true,
    debug:         userConfig.debug        || false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 56 · UTILITY: NUMBER FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a number with thousand separators and fixed decimal places.
 */
export function formatNumber(value, decimals = 0, locale = 'en-US') {
  if (!Number.isFinite(value)) return 'N/A';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a percentage value.
 */
export function formatPercent(value, decimals = 1) {
  if (!Number.isFinite(value)) return 'N/A';
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a currency value.
 */
export function formatCurrency(value, currency = DEFAULT_CURRENCY) {
  return formatCurrencyAmount(value, currency);
}

/**
 * Abbreviate large numbers (e.g. 1500000 → $1.5M).
 */
export function abbreviateNumber(value, prefix = '') {
  if (!Number.isFinite(value)) return 'N/A';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${prefix}${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000)     return `${prefix}${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)         return `${prefix}${(value / 1_000).toFixed(1)}K`;
  return `${prefix}${value.toFixed(0)}`;
}

/**
 * Format a duration in seconds to a compact string.
 */
export function formatSeconds(seconds) {
  return formatDuration(seconds * 1000);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 57 · UTILITY: ARRAY & OBJECT HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Group an array of objects by a key or key function.
 */
export function groupBy(arr, keyFn) {
  const groups = {};
  for (const item of arr) {
    const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

/**
 * Sum values in an array of objects for a given key.
 */
export function sumBy(arr, key) {
  return arr.reduce((s, item) => s + (item[key] || 0), 0);
}

/**
 * Find the maximum value in an array of objects for a given key.
 */
export function maxBy(arr, key) {
  if (arr.length === 0) return null;
  return arr.reduce((best, item) => (item[key] > best[key] ? item : best), arr[0]);
}

/**
 * Find the minimum value in an array of objects for a given key.
 */
export function minBy(arr, key) {
  if (arr.length === 0) return null;
  return arr.reduce((best, item) => (item[key] < best[key] ? item : best), arr[0]);
}

/**
 * Pick specific keys from an object.
 */
export function pick(obj, keys) {
  const result = {};
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}

/**
 * Omit specific keys from an object.
 */
export function omit(obj, keys) {
  const result = { ...obj };
  for (const key of keys) delete result[key];
  return result;
}

/**
 * Deep merge two plain objects.
 */
export function deepMerge(target, source) {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value) &&
        target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
      result[key] = deepMerge(target[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Chunk an array into groups of a given size.
 */
export function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Flatten a nested array one level deep.
 */
export function flatMap(arr, fn) {
  return arr.reduce((acc, item) => acc.concat(fn(item)), []);
}

/**
 * Create a range of numbers.
 */
export function range(start, end, step = 1) {
  const result = [];
  for (let i = start; i < end; i += step) result.push(i);
  return result;
}

/**
 * Compute the intersection of two sets.
 */
export function setIntersection(a, b) {
  return new Set([...a].filter(x => b.has(x)));
}

/**
 * Compute the union of two sets.
 */
export function setUnion(a, b) {
  return new Set([...a, ...b]);
}

/**
 * Compute the difference A - B of two sets.
 */
export function setDifference(a, b) {
  return new Set([...a].filter(x => !b.has(x)));
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 58 · UTILITY: CACHE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simple in-memory TTL cache.
 * Stores { value, expiresAt } entries.
 */
export function createCache(defaultTtlMs = CACHE_TTL_REPORTS * 1000) {
  const store = new Map();
  return {
    get(key) {
      const entry = store.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    set(key, value, ttlMs = defaultTtlMs) {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    delete(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    size() {
      return store.size;
    },
    prune() {
      const now = Date.now();
      for (const [key, entry] of store) {
        if (now > entry.expiresAt) store.delete(key);
      }
    },
  };
}

/**
 * Memoize a function with a TTL cache.
 */
export function memoize(fn, ttlMs = CACHE_TTL_REPORTS * 1000) {
  const cache = createCache(ttlMs);
  return function (...args) {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    if (cached !== null) return cached;
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 59 · UTILITY: ASYNC HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retry an async function with exponential backoff.
 */
export async function withRetry(fn, maxAttempts = MAX_RETRY_ATTEMPTS, backoffMs = RETRY_BACKOFF_MS) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = backoffMs * Math.pow(RETRY_BACKOFF_FACTOR, attempt - 1);
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

/**
 * Simple sleep helper.
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run a list of async tasks with concurrency limit.
 */
export async function pLimit(tasks, concurrency = 5) {
  const results = [];
  const queue = [...tasks];

  async function worker() {
    while (queue.length > 0) {
      const task = queue.shift();
      if (task) results.push(await task());
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}

/**
 * Race a promise against a timeout.
 */
export function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 60 · END OF FILE · ENGINE INTEGRITY CHECK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify the engine module is loaded correctly.
 * Called by test harnesses to confirm all critical exports are present.
 */
export function engineIntegrityCheck() {
  const required = [
    'roundCurrency', 'formatDate', 'parseDateStr', 'parseDateRange',
    'validateSku', 'validatePrice', 'validateEmail',
    'reconcileReport', 'computeMrr', 'runAnalyticsPipeline',
    'buildAcquisitionCohort', 'computeFunnelMetrics',
    'generateExecutiveDashboard', 'evaluateAlerts',
  ];

  const missing = [];
  const moduleExports = ANALYTICS_MODULES;

  for (const name of required) {
    const found = Object.values(moduleExports).some(group =>
      typeof group === 'object' && name in group
    );
    if (!found) missing.push(name);
  }

  return {
    version: ENGINE_VERSION,
    build: ENGINE_BUILD,
    dateFormat: DATE_FORMAT,
    healthy: missing.length === 0,
    missingExports: missing,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 61 · TAX NEXUS & COMPLIANCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * US states where sales tax nexus rules apply.
 * Thresholds: { transactions: number, revenue: number }
 */
export const NEXUS_THRESHOLDS = {
  CA: { transactions: 200,   revenue: 500_000 },
  TX: { transactions: null,  revenue: 500_000 },
  NY: { transactions: 100,   revenue: 500_000 },
  FL: { transactions: 200,   revenue: 100_000 },
  WA: { transactions: null,  revenue: 100_000 },
  IL: { transactions: 200,   revenue: 100_000 },
  PA: { transactions: null,  revenue: 100_000 },
  OH: { transactions: 200,   revenue: 100_000 },
  GA: { transactions: 200,   revenue: 100_000 },
  NC: { transactions: 200,   revenue: 100_000 },
  DEFAULT: { transactions: 200, revenue: 100_000 },
};

/**
 * Check if a seller has established nexus in a state based on activity.
 */
export function hasNexus(state, transactions, revenue) {
  const threshold = NEXUS_THRESHOLDS[state] || NEXUS_THRESHOLDS.DEFAULT;
  if (threshold.revenue != null && revenue >= threshold.revenue) return true;
  if (threshold.transactions != null && transactions >= threshold.transactions) return true;
  return false;
}

/**
 * Compute nexus status for all states from a list of orders.
 */
export function computeNexusStatus(orders) {
  const byState = {};
  for (const order of orders) {
    const state = normaliseStateCode(order.shippingAddress?.state || '');
    if (!state) continue;
    if (!byState[state]) byState[state] = { transactions: 0, revenue: 0 };
    byState[state].transactions++;
    byState[state].revenue += order.total || 0;
  }

  return Object.entries(byState).map(([state, data]) => ({
    state,
    transactions: data.transactions,
    revenue: roundCurrency(data.revenue),
    nexus: hasNexus(state, data.transactions, data.revenue),
    threshold: NEXUS_THRESHOLDS[state] || NEXUS_THRESHOLDS.DEFAULT,
  })).sort((a, b) => b.revenue - a.revenue);
}

/**
 * Generate tax liability summary for a period.
 */
export function taxLiabilitySummary(orders) {
  const byState = {};
  for (const order of orders) {
    const state = normaliseStateCode(order.shippingAddress?.state || '');
    if (!state) continue;
    if (!byState[state]) byState[state] = { taxCollected: 0, taxableRevenue: 0, orders: 0 };
    byState[state].taxCollected += order.tax || 0;
    byState[state].taxableRevenue += order.subtotal || 0;
    byState[state].orders++;
  }

  return Object.entries(byState).map(([state, data]) => ({
    state,
    orders: data.orders,
    taxableRevenue: roundCurrency(data.taxableRevenue),
    taxCollected: roundCurrency(data.taxCollected),
    effectiveRate: data.taxableRevenue > 0 ? data.taxCollected / data.taxableRevenue : 0,
  })).sort((a, b) => b.taxCollected - a.taxCollected);
}

/**
 * Identify tax-exempt orders.
 */
export function filterTaxExemptOrders(orders) {
  return orders.filter(o =>
    o.taxExemptCode === TAX_EXEMPT_CODE ||
    o.customerType === RESELLER_CODE ||
    o.taxRate === 0
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 62 · FRAUD DETECTION & RISK SCORING
// ─────────────────────────────────────────────────────────────────────────────

export const FRAUD_RISK_LOW      = 'LOW';
export const FRAUD_RISK_MEDIUM   = 'MEDIUM';
export const FRAUD_RISK_HIGH     = 'HIGH';
export const FRAUD_RISK_CRITICAL = 'CRITICAL';

/**
 * Score an order for fraud risk (0-100).
 * Higher scores indicate greater risk.
 */
export function computeFraudScore(order, customerHistory) {
  let score = 0;
  const signals = detectFraudSignals(order);

  score += signals.riskScore * 15;

  // New customer with high-value order
  if (!customerHistory || customerHistory.orderCount === 0) {
    if (order.total >= 200) score += 10;
    if (order.total >= 500) score += 15;
  }

  // Unusual shipping vs billing
  if (order.shippingAddress?.zip !== order.billingAddress?.zip) score += 5;

  // Night-time order (more fraud in 2-4am)
  const hour = new Date(order.createdAt).getHours();
  if (hour >= 2 && hour <= 4) score += 5;

  // Express shipping on large order (common in fraud)
  if (order.shippingMethod === 'EXPRESS' && order.total >= 500) score += 10;

  // Multiple items of the same high-value product
  for (const item of (order.items || [])) {
    if (item.quantity > 5 && item.unitPrice >= 50) score += 15;
  }

  return Math.min(100, score);
}

/**
 * Classify fraud risk level from a score.
 */
export function classifyFraudRisk(score) {
  if (score >= 75) return FRAUD_RISK_CRITICAL;
  if (score >= 50) return FRAUD_RISK_HIGH;
  if (score >= 25) return FRAUD_RISK_MEDIUM;
  return FRAUD_RISK_LOW;
}

/**
 * Batch-score a set of orders for fraud.
 */
export function batchFraudScore(orders, customerHistoryMap = {}) {
  return orders.map(order => {
    const score = computeFraudScore(order, customerHistoryMap[order.customerId]);
    return {
      orderId: order.id,
      fraudScore: score,
      riskLevel: classifyFraudRisk(score),
      signals: detectFraudSignals(order).fraudSignals,
      requiresReview: score >= 50,
    };
  }).sort((a, b) => b.fraudScore - a.fraudScore);
}

/**
 * Compute a fraud summary for a batch of orders.
 */
export function fraudSummary(fraudScores) {
  const total = fraudScores.length;
  const byRisk = {};
  let totalScore = 0;

  for (const fs of fraudScores) {
    byRisk[fs.riskLevel] = (byRisk[fs.riskLevel] || 0) + 1;
    totalScore += fs.fraudScore;
  }

  return {
    total,
    requiresReview: fraudScores.filter(f => f.requiresReview).length,
    riskDistribution: byRisk,
    averageFraudScore: total > 0 ? Math.round(totalScore / total) : 0,
    highRiskRate: total > 0 ? (byRisk[FRAUD_RISK_HIGH] || 0) / total : 0,
    criticalRiskRate: total > 0 ? (byRisk[FRAUD_RISK_CRITICAL] || 0) / total : 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 63 · ORDER ROUTING & FULFILMENT OPTIMISATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Warehouse definitions with location and capabilities.
 */
export const WAREHOUSES = {
  EAST:  { id: 'EAST',  region: 'NORTHEAST', maxWeight: 150, carriers: ['FEDEX', 'UPS', 'USPS'] },
  WEST:  { id: 'WEST',  region: 'PACIFIC',   maxWeight: 150, carriers: ['FEDEX', 'UPS', 'AMAZON_LOGISTICS'] },
  SOUTH: { id: 'SOUTH', region: 'SOUTH',     maxWeight: 100, carriers: ['USPS', 'FEDEX'] },
  CENTRAL:{ id:'CENTRAL',region:'MIDWEST',   maxWeight: 200, carriers: ['UPS', 'FEDEX', 'USPS'] },
};

const REGION_TO_WAREHOUSE = {
  NORTHEAST: 'EAST',
  SOUTHEAST: 'EAST',
  MIDWEST:   'CENTRAL',
  PLAINS:    'CENTRAL',
  SOUTH:     'SOUTH',
  SOUTHWEST: 'WEST',
  WEST:      'WEST',
  PACIFIC:   'WEST',
};

/**
 * Route an order to the optimal warehouse.
 */
export function routeOrder(order, inventoryByWarehouse) {
  const { zip } = parseZipCode(order.shippingAddress?.zip || '');
  const { region } = parseZipCode(zip);
  const preferredWarehouse = REGION_TO_WAREHOUSE[region] || 'EAST';

  const totalWeight = (order.items || []).reduce((s, i) => s + (i.weight || 0) * i.quantity, 0);

  // Try preferred warehouse first
  const preferred = WAREHOUSES[preferredWarehouse];
  if (preferred && totalWeight <= preferred.maxWeight) {
    const inventory = inventoryByWarehouse[preferredWarehouse] || {};
    const canFulfil = (order.items || []).every(i => (inventory[i.sku] || 0) >= i.quantity);
    if (canFulfil) return { warehouse: preferredWarehouse, reason: 'OPTIMAL_REGION' };
  }

  // Fall back to any warehouse that can fulfil
  for (const [wid, warehouse] of Object.entries(WAREHOUSES)) {
    if (totalWeight > warehouse.maxWeight) continue;
    const inventory = inventoryByWarehouse[wid] || {};
    const canFulfil = (order.items || []).every(i => (inventory[i.sku] || 0) >= i.quantity);
    if (canFulfil) return { warehouse: wid, reason: 'FALLBACK' };
  }

  return { warehouse: null, reason: 'INSUFFICIENT_STOCK' };
}

/**
 * Compute fulfilment SLA compliance.
 */
export function fulfilmentSlaCompliance(orders, slaHours = 24) {
  let compliant = 0;
  let violated = 0;
  const violations = [];

  for (const order of orders) {
    if (!order.fulfilledAt) continue;
    const elapsed = (new Date(order.fulfilledAt) - new Date(order.createdAt)) / 3_600_000;
    if (elapsed <= slaHours) {
      compliant++;
    } else {
      violated++;
      violations.push({
        orderId: order.id,
        hoursElapsed: Math.round(elapsed),
        excess: Math.round(elapsed - slaHours),
      });
    }
  }

  const total = compliant + violated;
  return {
    total,
    compliant,
    violated,
    complianceRate: total > 0 ? compliant / total : 1,
    violations: violations.sort((a, b) => b.excess - a.excess).slice(0, 20),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 64 · SUBSCRIPTION DUNNING ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export const DUNNING_STEP_SOFT_DECLINE   = 'SOFT_DECLINE';
export const DUNNING_STEP_HARD_DECLINE   = 'HARD_DECLINE';
export const DUNNING_STEP_FIRST_RETRY    = 'FIRST_RETRY';
export const DUNNING_STEP_SECOND_RETRY   = 'SECOND_RETRY';
export const DUNNING_STEP_FINAL_NOTICE   = 'FINAL_NOTICE';
export const DUNNING_STEP_CANCELLATION   = 'CANCELLATION';

/**
 * Dunning schedule: days after initial failure → step.
 */
export const DUNNING_SCHEDULE = [
  { day: 1,  step: DUNNING_STEP_FIRST_RETRY  },
  { day: 3,  step: DUNNING_STEP_SECOND_RETRY },
  { day: 7,  step: DUNNING_STEP_FINAL_NOTICE },
  { day: 14, step: DUNNING_STEP_CANCELLATION },
];

/**
 * Determine the next dunning action for a failed subscription payment.
 */
export function getNextDunningAction(subscription, failedAt) {
  const daysSinceFailure = (Date.now() - new Date(failedAt).getTime()) / 86_400_000;
  for (const step of DUNNING_SCHEDULE) {
    if (daysSinceFailure <= step.day) {
      return {
        step: step.step,
        scheduledAt: new Date(new Date(failedAt).getTime() + step.day * 86_400_000).toISOString(),
      };
    }
  }
  return { step: DUNNING_STEP_CANCELLATION, scheduledAt: new Date().toISOString() };
}

/**
 * Build a dunning report for past-due subscriptions.
 */
export function buildDunningReport(subscriptions) {
  const pastDue = subscriptions.filter(s => s.status === SUB_STATUS_PAST_DUE);
  const byStep = {};

  for (const sub of pastDue) {
    const action = getNextDunningAction(sub, sub.paymentFailedAt);
    byStep[action.step] = (byStep[action.step] || 0) + 1;
  }

  return {
    totalPastDue: pastDue.length,
    totalMrrAtRisk: computeMrr(pastDue),
    byDunningStep: byStep,
    immediateActions: pastDue
      .filter(s => {
        const action = getNextDunningAction(s, s.paymentFailedAt);
        return new Date(action.scheduledAt) <= new Date();
      })
      .map(s => ({
        subscriptionId: s.id,
        customerId: s.customerId,
        mrr: roundCurrency(s.amount || 0),
        action: getNextDunningAction(s, s.paymentFailedAt),
      })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 65 · DATA EXPORT PIPELINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a paginated export job for large datasets.
 */
export function createExportJob(datasetType, filters, format, requestedBy) {
  return {
    jobId: `export_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    datasetType,
    filters,
    format,
    requestedBy,
    requestedAt: new Date().toISOString(),
    status: 'QUEUED',
    totalRows: null,
    processedRows: 0,
    outputUrl: null,
    expiresAt: new Date(Date.now() + 24 * 3_600_000).toISOString(),
  };
}

/**
 * Validate export job parameters before queuing.
 */
export function validateExportJob(job) {
  const errors = [];
  if (!['ORDERS', 'CUSTOMERS', 'PRODUCTS', 'INVENTORY', 'TAX'].includes(job.datasetType)) {
    errors.push({ field: 'datasetType', message: `Unknown dataset type: ${job.datasetType}` });
  }
  if (!['CSV', 'JSON', 'JSONL', 'XML'].includes(job.format)) {
    errors.push({ field: 'format', message: `Unsupported format: ${job.format}` });
  }
  if (job.filters?.startDate && job.filters?.endDate) {
    if (new Date(job.filters.startDate) > new Date(job.filters.endDate)) {
      errors.push({ field: 'filters.startDate', message: 'Start date must be before end date' });
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Estimate export job size in rows.
 */
export function estimateExportSize(datasetType, filters, totalCounts) {
  const base = totalCounts[datasetType.toLowerCase()] || 0;
  if (!filters?.startDate && !filters?.endDate) return base;
  const days = filters.startDate && filters.endDate
    ? (new Date(filters.endDate) - new Date(filters.startDate)) / 86_400_000
    : 30;
  const dailyRate = base / 365;
  return Math.round(dailyRate * days);
}

/**
 * Chunk an export across multiple output files if it exceeds row limit.
 */
export function planExportChunks(estimatedRows, chunkSize = MAX_EXPORT_ROWS) {
  const chunks = Math.ceil(estimatedRows / chunkSize);
  return Array.from({ length: chunks }, (_, i) => ({
    chunkIndex: i,
    offset: i * chunkSize,
    limit: chunkSize,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 66 · PRICE ELASTICITY & OPTIMISATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute price elasticity of demand.
 * Elasticity = (% change in quantity) / (% change in price)
 */
export function computePriceElasticity(priceBefore, priceAfter, qtyBefore, qtyAfter) {
  const pctPriceChange = (priceAfter - priceBefore) / priceBefore;
  const pctQtyChange   = (qtyAfter  - qtyBefore)  / qtyBefore;
  if (pctPriceChange === 0) return null;
  return pctQtyChange / pctPriceChange;
}

/**
 * Estimate optimal price to maximise revenue given an elasticity model.
 * Uses the inverse-elasticity formula for constant-elasticity demand.
 */
export function estimateOptimalPrice(currentPrice, currentRevenue, elasticity, priceRange) {
  const { min, max } = priceRange;
  let bestPrice = currentPrice;
  let bestRevenue = currentRevenue;

  for (let price = min; price <= max; price += 1) {
    const qtyRatio = Math.pow(price / currentPrice, elasticity);
    const estRevenue = price * qtyRatio * (currentRevenue / currentPrice);
    if (estRevenue > bestRevenue) {
      bestRevenue = estRevenue;
      bestPrice = price;
    }
  }

  return {
    optimalPrice: bestPrice,
    estimatedRevenue: roundCurrency(bestRevenue),
    revenueIncrease: roundCurrency(bestRevenue - currentRevenue),
    pctIncrease: currentRevenue > 0 ? (bestRevenue - currentRevenue) / currentRevenue : 0,
  };
}

/**
 * Compute revenue impact of a price change.
 */
export function revenueImpact(currentPrice, newPrice, units, elasticity) {
  const pctPriceChange = (newPrice - currentPrice) / currentPrice;
  const newUnits = units * (1 + elasticity * pctPriceChange);
  const currentRevenue = currentPrice * units;
  const newRevenue     = newPrice * Math.max(0, newUnits);
  return {
    currentRevenue: roundCurrency(currentRevenue),
    newRevenue:     roundCurrency(newRevenue),
    delta:          roundCurrency(newRevenue - currentRevenue),
    newUnits:       Math.max(0, Math.round(newUnits)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 67 · SUPPLY CHAIN ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute supplier performance score from delivery records.
 */
export function supplierPerformanceScore(deliveries) {
  if (deliveries.length === 0) return 0;

  let onTime = 0;
  let totalItems = 0;
  let defective = 0;

  for (const d of deliveries) {
    if (new Date(d.deliveredAt) <= new Date(d.expectedAt)) onTime++;
    totalItems += d.quantity || 0;
    defective  += d.defectiveQuantity || 0;
  }

  const onTimeRate = onTime / deliveries.length;
  const qualityRate = totalItems > 0 ? 1 - defective / totalItems : 1;

  return Math.round((onTimeRate * 50 + qualityRate * 50));
}

/**
 * Compute days of inventory on hand given purchase orders and sales.
 */
export function daysOnHand(currentStock, avgDailySales) {
  if (avgDailySales <= 0) return Infinity;
  return Math.floor(currentStock / avgDailySales);
}

/**
 * Compute inventory turnover ratio for a period.
 * Turnover = COGS / Average Inventory Value
 */
export function inventoryTurnover(cogs, openingStock, closingStock, unitCost) {
  const avgInventoryValue = ((openingStock + closingStock) / 2) * unitCost;
  if (avgInventoryValue === 0) return null;
  return cogs / avgInventoryValue;
}

/**
 * Compute Economic Order Quantity (EOQ).
 * EOQ = sqrt(2 * D * S / H)
 * D = annual demand, S = ordering cost, H = holding cost per unit per year
 */
export function computeEoq(annualDemand, orderingCost, holdingCostPerUnit) {
  if (holdingCostPerUnit <= 0) return null;
  return Math.ceil(Math.sqrt(2 * annualDemand * orderingCost / holdingCostPerUnit));
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 68 · FINANCIAL METRICS DEEP DIVE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute gross margin for an order or product.
 */
export function grossMargin(revenue, cogs) {
  if (revenue <= 0) return 0;
  return (revenue - cogs) / revenue;
}

/**
 * Compute contribution margin.
 */
export function contributionMargin(revenue, variableCosts) {
  return roundCurrency(revenue - variableCosts);
}

/**
 * Compute break-even units for a product.
 */
export function breakEvenUnits(fixedCosts, pricePerUnit, variableCostPerUnit) {
  const contribution = pricePerUnit - variableCostPerUnit;
  if (contribution <= 0) return null;
  return Math.ceil(fixedCosts / contribution);
}

/**
 * Compute payback period in months for a marketing spend.
 */
export function paybackPeriodMonths(cac, monthlyContributionMargin) {
  if (monthlyContributionMargin <= 0) return null;
  return Math.ceil(cac / monthlyContributionMargin);
}

/**
 * Compute LTV:CAC ratio.
 */
export function ltvCacRatio(ltv, cac) {
  if (cac <= 0) return null;
  return ltv / cac;
}

/**
 * Aggregate P&L summary for a period.
 */
export function aggregatePnl(orders, costs) {
  const grossRevenue = roundCurrency(orders.reduce((s, o) => s + (o.total || 0), 0));
  const refunds      = roundCurrency(orders.reduce((s, o) => s + (o.refundedAmount || 0), 0));
  const netRevenue   = roundCurrency(grossRevenue - refunds);
  const cogs         = roundCurrency(costs.cogs || 0);
  const grossProfit  = roundCurrency(netRevenue - cogs);
  const operating    = roundCurrency(costs.marketing + costs.payroll + costs.overhead || 0);
  const ebitda       = roundCurrency(grossProfit - operating);

  return {
    grossRevenue,
    refunds,
    netRevenue,
    cogs,
    grossProfit,
    grossMarginPct: netRevenue > 0 ? grossProfit / netRevenue : 0,
    operatingExpenses: operating,
    ebitda,
    ebitdaMarginPct: netRevenue > 0 ? ebitda / netRevenue : 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 69 · REGRESSION & TREND ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute simple linear regression coefficients.
 * Returns { slope, intercept, rSquared }
 */
export function linearRegression(xValues, yValues) {
  if (xValues.length !== yValues.length || xValues.length < 2) {
    return { slope: 0, intercept: 0, rSquared: 0 };
  }
  const n = xValues.length;
  const xMean = xValues.reduce((s, x) => s + x, 0) / n;
  const yMean = yValues.reduce((s, y) => s + y, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator   += (xValues[i] - xMean) * (yValues[i] - yMean);
    denominator += (xValues[i] - xMean) ** 2;
  }

  const slope     = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  const yPred = xValues.map(x => slope * x + intercept);
  const ssTot = yValues.reduce((s, y) => s + (y - yMean) ** 2, 0);
  const ssRes = yValues.reduce((s, y, i) => s + (y - yPred[i]) ** 2, 0);
  const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 1;

  return { slope, intercept, rSquared };
}

/**
 * Predict future value using linear regression result.
 */
export function linearPredict(regression, x) {
  return regression.slope * x + regression.intercept;
}

/**
 * Compute 7-day moving average for a time series.
 */
export function movingAverage(series, window = 7) {
  const result = [];
  for (let i = 0; i < series.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = series.slice(start, i + 1);
    result.push(slice.reduce((s, v) => s + v, 0) / slice.length);
  }
  return result;
}

/**
 * Detect outliers using the IQR method.
 */
export function detectOutliers(values, multiplier = 1.5) {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - multiplier * iqr;
  const upper = q3 + multiplier * iqr;
  return values.map((v, i) => ({ value: v, index: i, isOutlier: v < lower || v > upper }));
}

/**
 * Compute Pearson correlation coefficient between two series.
 */
export function pearsonCorrelation(xs, ys) {
  if (xs.length !== ys.length || xs.length === 0) return 0;
  const n = xs.length;
  const xMean = xs.reduce((s, x) => s + x, 0) / n;
  const yMean = ys.reduce((s, y) => s + y, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    num  += (xs[i] - xMean) * (ys[i] - yMean);
    denX += (xs[i] - xMean) ** 2;
    denY += (ys[i] - yMean) ** 2;
  }
  const den = Math.sqrt(denX * denY);
  return den !== 0 ? num / den : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 70 · FINAL EXTENDED EXPORT MAP
// ─────────────────────────────────────────────────────────────────────────────

export const ANALYTICS_EXTENDED_MODULES = {
  tax: {
    hasNexus, computeNexusStatus, taxLiabilitySummary, filterTaxExemptOrders,
  },
  fraud: {
    computeFraudScore, classifyFraudRisk, batchFraudScore, fraudSummary,
  },
  fulfilment: {
    routeOrder, fulfilmentSlaCompliance,
  },
  dunning: {
    getNextDunningAction, buildDunningReport,
  },
  export: {
    createExportJob, validateExportJob, estimateExportSize, planExportChunks,
  },
  pricing: {
    computePriceElasticity, estimateOptimalPrice, revenueImpact,
  },
  supplyChain: {
    supplierPerformanceScore, daysOnHand, inventoryTurnover, computeEoq,
  },
  financial: {
    grossMargin, contributionMargin, breakEvenUnits,
    paybackPeriodMonths, ltvCacRatio, aggregatePnl,
  },
  regression: {
    linearRegression, linearPredict, movingAverage, detectOutliers, pearsonCorrelation,
  },
  sessions: {
    buildSessions, sessionMetrics, formatDuration,
  },
  cohort: {
    buildAcquisitionCohort, avgCohortRetention, buildRevenueCohort,
    addMonthsToYearMonth,
  },
  funnel: {
    computeFunnelMetrics, identifyFunnelDropoff, compareFunnelPeriods, computeTimeToConvert,
  },
  merchandising: {
    bannerCtr, rankMerchandisingSlots, identifyUnderperformingSlots, collectionPerformance,
  },
  campaign: {
    computeCampaignRoi, lastTouchAttribution, emailCampaignMetrics,
  },
  leadScoring: {
    scoreLead, classifyLead, rankLeads, predictConversionProbability,
  },
  customerLtv: {
    computeHistoricalLtv, predictFutureLtv, ltvDistribution, topPredictedLtvCustomers,
  },
  benchmark: {
    benchmarkMetric, generateBenchmarkScorecard, periodComparison,
  },
  alerts: {
    evaluateAlerts, suppressDuplicateAlerts, routeAlert,
  },
  geo: {
    parseZipCode, groupOrdersByRegion, revenueByRegion, buildStateSalesHeatmap,
    rankStatesByRevenue, identifyEmergingMarkets,
  },
  subscriptions: {
    computeMrr, computeArr, calculateChurnRate, calculateNrr,
    forecastSubscriptionRevenue, subscriptionCohortRetention,
  },
  search: {
    aggregateSearchQueries, zeroResultQueries, searchToPurchaseFunnel,
  },
  basket: {
    findProductAffinities, computeAssociationRules, basketAnalysis,
  },
  currency: {
    convertCurrency, convertOrderCurrency, revenueByOriginalCurrency, formatCurrencyAmount,
  },
  format: {
    formatNumber, formatPercent, formatCurrency, abbreviateNumber, formatSeconds,
  },
  utils: {
    groupBy, sumBy, maxBy, minBy, pick, omit, deepMerge, chunk, flatMap,
    range, setIntersection, setUnion, setDifference,
  },
  cache: {
    createCache, memoize,
  },
  async: {
    withRetry, sleep, pLimit, withTimeout,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 71 · PRODUCT REVIEW & SENTIMENT ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

export const SENTIMENT_POSITIVE = 'POSITIVE';
export const SENTIMENT_NEUTRAL  = 'NEUTRAL';
export const SENTIMENT_NEGATIVE = 'NEGATIVE';

/**
 * Simple lexicon-based sentiment classifier.
 * Returns POSITIVE, NEUTRAL, or NEGATIVE.
 */
const POSITIVE_WORDS = new Set([
  'great', 'excellent', 'amazing', 'perfect', 'love', 'wonderful', 'fantastic',
  'outstanding', 'superb', 'terrific', 'awesome', 'brilliant', 'exceptional',
  'pleased', 'satisfied', 'recommend', 'best', 'quality', 'fast', 'easy',
]);

const NEGATIVE_WORDS = new Set([
  'bad', 'terrible', 'awful', 'poor', 'horrible', 'worst', 'hate',
  'broken', 'defective', 'slow', 'disappointing', 'disappointed', 'useless',
  'waste', 'failed', 'wrong', 'missing', 'damaged', 'cheap', 'flimsy',
]);

export function classifyReviewSentiment(text) {
  if (!text || typeof text !== 'string') return SENTIMENT_NEUTRAL;
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
  let positiveCount = 0;
  let negativeCount = 0;
  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) positiveCount++;
    if (NEGATIVE_WORDS.has(word)) negativeCount++;
  }
  if (positiveCount > negativeCount) return SENTIMENT_POSITIVE;
  if (negativeCount > positiveCount) return SENTIMENT_NEGATIVE;
  return SENTIMENT_NEUTRAL;
}

/**
 * Compute aggregate review statistics for a product.
 */
export function aggregateProductReviews(reviews) {
  if (reviews.length === 0) return null;
  const ratings = reviews.map(r => r.rating || 0);
  const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of ratings) {
    const bucket = Math.min(5, Math.max(1, Math.round(r)));
    distribution[bucket]++;
  }

  const sentiments = reviews.map(r => classifyReviewSentiment(r.body || r.text || ''));
  const sentimentCounts = {
    [SENTIMENT_POSITIVE]: 0,
    [SENTIMENT_NEUTRAL]:  0,
    [SENTIMENT_NEGATIVE]: 0,
  };
  for (const s of sentiments) sentimentCounts[s]++;

  return {
    count: reviews.length,
    averageRating: Math.round(avg * 10) / 10,
    ratingDistribution: distribution,
    sentimentBreakdown: sentimentCounts,
    positiveRate: reviews.length > 0
      ? sentimentCounts[SENTIMENT_POSITIVE] / reviews.length : 0,
    negativeRate: reviews.length > 0
      ? sentimentCounts[SENTIMENT_NEGATIVE] / reviews.length : 0,
    verifiedPurchaseRate: reviews.length > 0
      ? reviews.filter(r => r.verifiedPurchase).length / reviews.length : 0,
  };
}

/**
 * Identify top positive and negative review keywords.
 */
export function extractReviewKeywords(reviews, topN = 10) {
  const posWords = {};
  const negWords = {};

  for (const review of reviews) {
    const words = (review.body || '').toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const sentiment = classifyReviewSentiment(review.body || '');
    const target = sentiment === SENTIMENT_POSITIVE ? posWords
      : sentiment === SENTIMENT_NEGATIVE ? negWords : null;
    if (!target) continue;
    for (const word of words) {
      if (POSITIVE_WORDS.has(word) || NEGATIVE_WORDS.has(word)) continue;
      target[word] = (target[word] || 0) + 1;
    }
  }

  const topPos = Object.entries(posWords).sort((a, b) => b[1] - a[1]).slice(0, topN)
    .map(([word, count]) => ({ word, count }));
  const topNeg = Object.entries(negWords).sort((a, b) => b[1] - a[1]).slice(0, topN)
    .map(([word, count]) => ({ word, count }));

  return { positive: topPos, negative: topNeg };
}

/**
 * Flag reviews that may be spam or fake.
 */
export function flagSuspiciousReviews(reviews) {
  return reviews.filter(r => {
    const body = r.body || '';
    if (body.length < 20) return true;
    if ((body.match(/\b(buy|click|visit|check out|http)/gi) || []).length > 2) return true;
    if (r.rating === 5 && body.length < 30) return true;
    if (r.rating === 1 && body.length < 30) return true;
    return false;
  }).map(r => ({ reviewId: r.id, reason: 'SUSPICIOUS', rating: r.rating }));
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 72 · NOTIFICATION PREFERENCE ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export const CHANNEL_EMAIL    = 'EMAIL';
export const CHANNEL_SMS      = 'SMS';
export const CHANNEL_PUSH     = 'PUSH';
export const CHANNEL_WEBHOOK  = 'WEBHOOK';
export const CHANNEL_IN_APP   = 'IN_APP';

export const NOTIFICATION_TYPES = {
  ORDER_CONFIRMED:   { defaultChannels: [CHANNEL_EMAIL, CHANNEL_IN_APP] },
  ORDER_SHIPPED:     { defaultChannels: [CHANNEL_EMAIL, CHANNEL_SMS, CHANNEL_PUSH] },
  ORDER_DELIVERED:   { defaultChannels: [CHANNEL_EMAIL, CHANNEL_PUSH] },
  ORDER_CANCELLED:   { defaultChannels: [CHANNEL_EMAIL, CHANNEL_IN_APP] },
  REFUND_PROCESSED:  { defaultChannels: [CHANNEL_EMAIL] },
  LOYALTY_EARNED:    { defaultChannels: [CHANNEL_IN_APP] },
  LOYALTY_EXPIRING:  { defaultChannels: [CHANNEL_EMAIL, CHANNEL_PUSH] },
  PRICE_DROP:        { defaultChannels: [CHANNEL_EMAIL, CHANNEL_PUSH] },
  BACK_IN_STOCK:     { defaultChannels: [CHANNEL_EMAIL, CHANNEL_PUSH] },
  REVIEW_REQUEST:    { defaultChannels: [CHANNEL_EMAIL] },
};

/**
 * Resolve channels for a notification based on customer preferences.
 */
export function resolveNotificationChannels(type, customerPrefs = {}) {
  const defaults = NOTIFICATION_TYPES[type]?.defaultChannels || [CHANNEL_EMAIL];
  if (!customerPrefs || Object.keys(customerPrefs).length === 0) return defaults;
  return defaults.filter(channel => {
    const pref = customerPrefs[channel];
    return pref !== false && pref !== 'OFF';
  });
}

/**
 * Build a notification dispatch list for a batch of events.
 */
export function buildNotificationDispatch(events, customerPrefsMap) {
  const dispatches = [];
  for (const event of events) {
    const prefs = customerPrefsMap[event.customerId] || {};
    const channels = resolveNotificationChannels(event.type, prefs);
    for (const channel of channels) {
      dispatches.push({
        eventId: event.id,
        customerId: event.customerId,
        type: event.type,
        channel,
        scheduledAt: new Date().toISOString(),
        payload: event.data,
      });
    }
  }
  return dispatches;
}

/**
 * Compute notification engagement rates per channel.
 */
export function notificationEngagementByChannel(deliveries) {
  const stats = {};
  for (const d of deliveries) {
    if (!stats[d.channel]) stats[d.channel] = { sent: 0, opened: 0, clicked: 0 };
    stats[d.channel].sent++;
    if (d.openedAt) stats[d.channel].opened++;
    if (d.clickedAt) stats[d.channel].clicked++;
  }
  return Object.entries(stats).map(([channel, data]) => ({
    channel,
    sent: data.sent,
    openRate: data.sent > 0 ? data.opened / data.sent : 0,
    clickRate: data.opened > 0 ? data.clicked / data.opened : 0,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 73 · FEATURE FLAG & CONFIGURATION MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Feature flag registry.
 * Features can be gated by plan, environment, or percentage rollout.
 */
export const FEATURE_FLAGS = {
  ADVANCED_FRAUD_SCORING:    { enabled: true,  plans: ['GROWTH', 'ENTERPRISE'] },
  MULTI_CURRENCY_REPORTING:  { enabled: true,  plans: ['GROWTH', 'ENTERPRISE'] },
  PREDICTIVE_LTV:            { enabled: true,  plans: ['ENTERPRISE'] },
  AB_TESTING:                { enabled: true,  plans: ['STARTER', 'GROWTH', 'ENTERPRISE'] },
  COHORT_ANALYSIS:           { enabled: true,  plans: ['GROWTH', 'ENTERPRISE'] },
  CUSTOM_DASHBOARDS:         { enabled: true,  plans: ['GROWTH', 'ENTERPRISE'] },
  API_WEBHOOKS:              { enabled: true,  plans: ['STARTER', 'GROWTH', 'ENTERPRISE'] },
  DATA_EXPORT:               { enabled: true,  plans: ['FREE', 'STARTER', 'GROWTH', 'ENTERPRISE'] },
  REAL_TIME_ALERTS:          { enabled: true,  plans: ['GROWTH', 'ENTERPRISE'] },
  WHITE_LABEL:               { enabled: false, plans: ['ENTERPRISE'] },
};

/**
 * Check if a feature is available for a given plan.
 */
export function isFeatureEnabled(featureId, plan) {
  const flag = FEATURE_FLAGS[featureId];
  if (!flag || !flag.enabled) return false;
  return flag.plans.includes(plan);
}

/**
 * Get all features available for a plan.
 */
export function getFeaturesForPlan(plan) {
  return Object.entries(FEATURE_FLAGS)
    .filter(([, flag]) => flag.enabled && flag.plans.includes(plan))
    .map(([id]) => id);
}

/**
 * Build a feature comparison matrix across plans.
 */
export function buildPlanComparisonMatrix() {
  const plans = ['FREE', 'STARTER', 'GROWTH', 'ENTERPRISE'];
  const features = Object.keys(FEATURE_FLAGS);
  return features.map(feature => {
    const row = { feature };
    for (const plan of plans) {
      row[plan] = isFeatureEnabled(feature, plan);
    }
    return row;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 74 · MULTI-TENANT ORGANISATION MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve an organisation's effective configuration by merging
 * global defaults, plan-level defaults, and org-level overrides.
 */
export function resolveOrgConfig(org) {
  const planDefaults = {
    FREE:       { maxUsers: 1,  maxProjects: 1,  retentionDays: 30  },
    STARTER:    { maxUsers: 3,  maxProjects: 5,  retentionDays: 90  },
    GROWTH:     { maxUsers: 10, maxProjects: 20, retentionDays: 365 },
    ENTERPRISE: { maxUsers: Infinity, maxProjects: Infinity, retentionDays: Infinity },
  };

  const defaults = planDefaults[org.plan] || planDefaults.FREE;
  return deepMerge(deepMerge({
    currency: DEFAULT_CURRENCY,
    timezone: DEFAULT_TIMEZONE,
    dateFormat: DATE_FORMAT,
  }, defaults), org.config || {});
}

/**
 * Check if an org is within its usage limits.
 */
export function checkOrgLimits(org, usage) {
  const config = resolveOrgConfig(org);
  const violations = [];

  if (config.maxUsers !== Infinity && usage.users > config.maxUsers) {
    violations.push({ limit: 'maxUsers', current: usage.users, max: config.maxUsers });
  }
  if (config.maxProjects !== Infinity && usage.projects > config.maxProjects) {
    violations.push({ limit: 'maxProjects', current: usage.projects, max: config.maxProjects });
  }

  return { withinLimits: violations.length === 0, violations };
}

/**
 * Compute cross-tenant analytics (only available to ENTERPRISE).
 */
export function crossTenantSummary(orgs) {
  return {
    totalOrgs: orgs.length,
    byPlan: groupBy(orgs, 'plan'),
    totalRevenue: roundCurrency(orgs.reduce((s, o) => s + (o.mrr || 0) * 12, 0)),
    avgMrr: roundCurrency(orgs.reduce((s, o) => s + (o.mrr || 0), 0) / (orgs.length || 1)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 75 · EXTENDED REPORT BUILDER TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a daily operations report.
 */
export function buildDailyOpsReport(orders, returns, alerts) {
  const date = formatDate(new Date());
  const revenue = roundCurrency(orders.reduce((s, o) => s + (o.total || 0), 0));
  const refunded = roundCurrency(returns.reduce((s, r) => s + (r.netRefund || 0), 0));

  return {
    reportType: REPORT_TYPE_SALES,
    date,
    generatedAt: new Date().toISOString(),
    summary: {
      orders: orders.length,
      revenue,
      refunded,
      net: roundCurrency(revenue - refunded),
      returns: returns.length,
      activeAlerts: alerts.filter(a => a.severity === ALERT_SEVERITY_CRITICAL).length,
    },
    topProducts: orders
      .flatMap(o => o.items || [])
      .reduce((acc, item) => {
        acc[item.sku] = (acc[item.sku] || 0) + item.quantity;
        return acc;
      }, {}),
    alerts,
  };
}

/**
 * Build a weekly executive summary.
 */
export function buildWeeklyExecutiveSummary(currentWeekOrders, priorWeekOrders, customers) {
  const curr = {
    orders: currentWeekOrders.length,
    revenue: roundCurrency(currentWeekOrders.reduce((s, o) => s + (o.total || 0), 0)),
  };
  const prior = {
    orders: priorWeekOrders.length,
    revenue: roundCurrency(priorWeekOrders.reduce((s, o) => s + (o.total || 0), 0)),
  };

  const newCustomers = customers.filter(c => {
    const created = new Date(c.createdAt);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    return created >= weekStart;
  }).length;

  return {
    period: 'WEEKLY',
    generatedAt: new Date().toISOString(),
    current: curr,
    prior,
    revenueGrowth: prior.revenue > 0 ? (curr.revenue - prior.revenue) / prior.revenue : null,
    orderGrowth: prior.orders > 0 ? (curr.orders - prior.orders) / prior.orders : null,
    newCustomers,
    averageOrderValue: curr.orders > 0 ? roundCurrency(curr.revenue / curr.orders) : 0,
  };
}

/**
 * Build a monthly tax report for filing purposes.
 */
export function buildMonthlyTaxReport(orders, month) {
  const [year, mon] = month.split('-');
  const monthOrders = orders.filter(o => {
    const d = new Date(o.createdAt);
    return d.getFullYear() === parseInt(year, 10) && d.getMonth() + 1 === parseInt(mon, 10);
  });

  const summary = taxLiabilitySummary(monthOrders);
  const totalTax = roundCurrency(monthOrders.reduce((s, o) => s + (o.tax || 0), 0));
  const totalRevenue = roundCurrency(monthOrders.reduce((s, o) => s + (o.subtotal || 0), 0));

  return {
    reportType: REPORT_TYPE_TAX,
    month,
    generatedAt: new Date().toISOString(),
    orders: monthOrders.length,
    taxableRevenue: totalRevenue,
    totalTaxCollected: totalTax,
    effectiveRate: totalRevenue > 0 ? totalTax / totalRevenue : 0,
    byState: summary,
    nexusStates: computeNexusStatus(monthOrders).filter(s => s.nexus).map(s => s.state),
  };
}

/**
 * Build a product performance report.
 */
export function buildProductPerformanceReport(orders, products) {
  const skuStats = {};

  for (const order of orders) {
    for (const item of (order.items || [])) {
      if (!skuStats[item.sku]) {
        skuStats[item.sku] = { units: 0, revenue: 0, orders: new Set() };
      }
      skuStats[item.sku].units += item.quantity;
      skuStats[item.sku].revenue += item.unitPrice * item.quantity;
      skuStats[item.sku].orders.add(order.id);
    }
  }

  const productIndex = buildProductIndex(products);

  return Object.entries(skuStats).map(([sku, stats]) => {
    const product = productIndex.bySku.get(sku);
    return {
      sku,
      title: product?.title || 'Unknown',
      category: product?.category || 'UNCATEGORISED',
      units: stats.units,
      revenue: roundCurrency(stats.revenue),
      uniqueOrders: stats.orders.size,
      averageOrderQty: stats.orders.size > 0 ? stats.units / stats.orders.size : 0,
      revenuePerUnit: stats.units > 0 ? roundCurrency(stats.revenue / stats.units) : 0,
    };
  }).sort((a, b) => b.revenue - a.revenue);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 76 · ADDITIONAL MATH & STATISTICAL UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the median of an array of numbers.
 */
export function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Compute the mode of an array of numbers.
 */
export function mode(values) {
  if (values.length === 0) return null;
  const counts = {};
  for (const v of values) counts[v] = (counts[v] || 0) + 1;
  const max = Math.max(...Object.values(counts));
  const modes = Object.entries(counts).filter(([, c]) => c === max).map(([v]) => Number(v));
  return modes.length === values.length ? null : modes;
}

/**
 * Compute variance of an array of numbers.
 */
export function variance(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
}

/**
 * Compute skewness of a distribution.
 */
export function skewness(values) {
  if (values.length < 3) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const std = Math.sqrt(variance(values));
  if (std === 0) return 0;
  const n = values.length;
  const cubedDiffs = values.reduce((s, v) => s + ((v - mean) / std) ** 3, 0);
  return (n / ((n - 1) * (n - 2))) * cubedDiffs;
}

/**
 * Compute a histogram from a numeric array.
 */
export function histogram(values, bins = 10) {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binWidth = (max - min) / bins || 1;
  const counts = new Array(bins).fill(0);

  for (const v of values) {
    const idx = Math.min(bins - 1, Math.floor((v - min) / binWidth));
    counts[idx]++;
  }

  return counts.map((count, i) => ({
    bin: i,
    lower: roundCurrency(min + i * binWidth),
    upper: roundCurrency(min + (i + 1) * binWidth),
    count,
    frequency: values.length > 0 ? count / values.length : 0,
  }));
}

/**
 * Compute a running cumulative sum.
 */
export function cumulativeSum(values) {
  let total = 0;
  return values.map(v => { total += v; return total; });
}

/**
 * Compute percentage share of each value in an array.
 */
export function percentageShare(values) {
  const total = values.reduce((s, v) => s + v, 0);
  if (total === 0) return values.map(() => 0);
  return values.map(v => v / total);
}

/**
 * Compute the Gini coefficient for a distribution (measure of inequality).
 * 0 = perfect equality, 1 = maximum inequality.
 */
export function giniCoefficient(values) {
  const n = values.length;
  if (n === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const sumOfValues = sorted.reduce((s, v) => s + v, 0);
  if (sumOfValues === 0) return 0;
  let numerator = 0;
  for (let i = 0; i < n; i++) {
    numerator += sorted[i] * (2 * (i + 1) - n - 1);
  }
  return numerator / (n * sumOfValues);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 77 · ADVANCED CUSTOMER ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute Net Promoter Score from survey responses.
 * Promoters: 9-10, Passives: 7-8, Detractors: 0-6
 */
export function computeNps(scores) {
  if (scores.length === 0) return 0;
  const promoters  = scores.filter(s => s >= 9).length;
  const detractors = scores.filter(s => s <= 6).length;
  return Math.round(((promoters - detractors) / scores.length) * 100);
}

/**
 * Classify an NPS score into a category.
 */
export function classifyNps(nps) {
  if (nps >= 70) return 'WORLD_CLASS';
  if (nps >= 50) return 'EXCELLENT';
  if (nps >= 30) return 'GOOD';
  if (nps >= 0)  return 'NEEDS_IMPROVEMENT';
  return 'CRITICAL';
}

/**
 * Customer health score combining purchase recency, frequency, and NPS.
 */
export function customerHealthScore(customer, npsScore = null) {
  const rfm = scoreRfm(customer, []);
  let health = rfm.total * 5; // 15-75 from RFM

  if (npsScore != null) {
    health += npsScore >= 9 ? 15 : npsScore >= 7 ? 5 : -10;
  }

  if (customer.returnsRate && customer.returnsRate > 0.3) health -= 10;
  if (customer.chargebacks && customer.chargebacks > 0) health -= 20;

  return Math.min(100, Math.max(0, health));
}

/**
 * Compute customer acquisition cost from marketing spend and new customers.
 */
export function computeCac(marketingSpend, newCustomers) {
  if (newCustomers <= 0) return null;
  return roundCurrency(marketingSpend / newCustomers);
}

/**
 * Build a customer value matrix (2x2): high/low LTV × high/low engagement.
 */
export function customerValueMatrix(customers) {
  const ltvValues = customers.map(c => c.lifetimeValue || 0);
  const engagementValues = customers.map(c => c.orderCount || 0);
  const medianLtv = median(ltvValues);
  const medianEngagement = median(engagementValues);

  const quadrants = {
    CHAMPIONS:       [],  // high LTV, high engagement
    LOYAL_CUSTOMERS: [],  // low LTV, high engagement
    BIG_SPENDERS:    [],  // high LTV, low engagement
    AT_RISK:         [],  // low LTV, low engagement
  };

  for (const c of customers) {
    const highLtv = (c.lifetimeValue || 0) >= medianLtv;
    const highEng = (c.orderCount || 0) >= medianEngagement;
    if (highLtv && highEng)  quadrants.CHAMPIONS.push(c.id);
    else if (!highLtv && highEng) quadrants.LOYAL_CUSTOMERS.push(c.id);
    else if (highLtv && !highEng) quadrants.BIG_SPENDERS.push(c.id);
    else quadrants.AT_RISK.push(c.id);
  }

  return {
    CHAMPIONS:       { count: quadrants.CHAMPIONS.length,       customers: quadrants.CHAMPIONS       },
    LOYAL_CUSTOMERS: { count: quadrants.LOYAL_CUSTOMERS.length, customers: quadrants.LOYAL_CUSTOMERS },
    BIG_SPENDERS:    { count: quadrants.BIG_SPENDERS.length,    customers: quadrants.BIG_SPENDERS    },
    AT_RISK:         { count: quadrants.AT_RISK.length,          customers: quadrants.AT_RISK          },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 78 · ADVANCED DATE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a year is a leap year.
 */
export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Get the number of days in a month.
 */
export function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Get all Mondays in a given month (used for weekly billing cycles).
 */
export function getMondaysInMonth(year, month) {
  const mondays = [];
  const date = new Date(year, month - 1, 1);
  while (date.getDay() !== 1) date.setDate(date.getDate() + 1);
  while (date.getMonth() === month - 1) {
    mondays.push(new Date(date));
    date.setDate(date.getDate() + 7);
  }
  return mondays;
}

/**
 * Compute business days between two dates (excludes weekends).
 */
export function businessDaysBetween(start, end) {
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);

  while (cur < endDate) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/**
 * Add business days to a date.
 */
export function addBusinessDays(date, days) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

/**
 * Get start and end of a given quarter.
 */
export function getQuarterBounds(year, quarter) {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end   = new Date(year, startMonth + 3, 0, 23, 59, 59);
  return { start, end };
}

/**
 * Format a date range as a human-readable string.
 */
export function formatDateRange(start, end) {
  return `${formatDate(new Date(start))} – ${formatDate(new Date(end))}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 79 · EXTENDED STRING UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Truncate a string to a maximum length, appending an ellipsis.
 */
export function truncate(str, maxLength, ellipsis = '...') {
  if (!str || str.length <= maxLength) return str || '';
  return str.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Convert a string to title case.
 */
export function toTitleCase(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Convert a camelCase string to kebab-case.
 */
export function camelToKebab(str) {
  return str.replace(/([A-Z])/g, c => `-${c.toLowerCase()}`);
}

/**
 * Convert a snake_case string to camelCase.
 */
export function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Slugify a string for URL use.
 */
export function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Mask an email address for privacy.
 */
export function maskEmail(email) {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const masked = local.length <= 2 ? local : local[0] + '*'.repeat(local.length - 2) + local[local.length - 1];
  return `${masked}@${domain}`;
}

/**
 * Generate a random alphanumeric ID of given length.
 */
export function randomId(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/**
 * Parse key=value query parameters from a URL query string.
 */
export function parseQueryString(qs) {
  const params = {};
  const clean = qs.startsWith('?') ? qs.slice(1) : qs;
  for (const part of clean.split('&')) {
    const [key, value] = part.split('=');
    if (key) params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
  }
  return params;
}

/**
 * Stringify an object to URL query parameters.
 */
export function toQueryString(params) {
  return Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 80 · ENGINE SELF-TEST SUITE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run a battery of sanity checks on the analytics engine.
 * Returns an array of { name, passed, message } results.
 */
export function runEngineSelfTest() {
  const results = [];

  function assert(name, condition, message) {
    results.push({ name, passed: Boolean(condition), message: condition ? 'OK' : message });
  }

  // Math utilities
  assert('roundCurrency(1.005)', Math.abs(roundCurrency(1.005) - 1.01) < 0.001, 'rounding failed');
  assert('roundCurrency(0)', roundCurrency(0) === 0, '0 failed');
  assert('weightedAverage empty', weightedAverage([], []) === 0, 'empty array failed');

  // Validators
  assert('validateSku valid', validateSku('ABC123'), 'valid SKU rejected');
  assert('validateSku short', !validateSku('AB'), 'short SKU accepted');
  assert('validateEmail valid', validateEmail('test@example.com'), 'valid email rejected');
  assert('validateEmail invalid', !validateEmail('not-an-email'), 'invalid email accepted');
  assert('validatePrice zero', validatePrice(0), 'price=0 rejected');
  assert('validatePrice negative', !validatePrice(-1), 'negative price accepted');
  assert('validateQuantity 1', validateQuantity(1), 'qty=1 rejected');
  assert('validateQuantity 0', !validateQuantity(0), 'qty=0 accepted');

  // Date utilities
  const today = new Date();
  const formatted = formatDate(today);
  assert('formatDate produces string', typeof formatted === 'string', 'formatDate failed');
  assert('formatDate has slashes', formatted.includes('/'), 'formatDate format wrong');
  const parsed = parseDateStr(formatted);
  assert('parseDateStr roundtrip', !isNaN(parsed.getTime()), 'parseDateStr failed');

  // Loyalty
  assert('calculatePointsEarned(100)', calculatePointsEarned(100) === 1000, 'points calc wrong');
  assert('calculatePointsEarned(-1)', calculatePointsEarned(-1) === 0, 'negative input not handled');
  assert('getLoyaltyTier(0)', getLoyaltyTier(0).name === 'Bronze', 'tier 0 wrong');
  assert('getLoyaltyTier(50000)', getLoyaltyTier(50000).name === 'Platinum', 'tier 50k wrong');

  // Coupon
  assert('validateCouponCode valid', validateCouponCode('SAVE20OFF1'), 'valid coupon rejected');
  assert('validateCouponCode short', !validateCouponCode('AB'), 'short coupon accepted');

  // NPS
  assert('computeNps all 10s', computeNps([10, 10, 10]) === 100, 'NPS all promoters wrong');
  assert('computeNps mixed', computeNps([10, 5, 10]) !== 100, 'NPS mixed wrong');

  // Statistical
  assert('median odd', median([1, 3, 5]) === 3, 'median odd wrong');
  assert('median even', median([1, 2, 3, 4]) === 2.5, 'median even wrong');
  assert('giniCoefficient equal', giniCoefficient([1, 1, 1]) === 0, 'gini equal wrong');

  // Luhn
  assert('luhnCheck valid', luhnCheck('4532015112830366'), 'valid Luhn failed');
  assert('luhnCheck invalid', !luhnCheck('1234567890123456'), 'invalid Luhn passed');

  // Fraud
  const mockOrder = {
    id: 'ORD-1', customerId: 'C1', total: 100,
    items: [{ sku: 'ABC123', quantity: 1, unitPrice: 100, weight: 1 }],
    shippingAddress: { country: 'US', state: 'CA', zip: '90210' },
    billingAddress:  { country: 'US', state: 'CA', zip: '90210' },
    createdAt: new Date().toISOString(),
  };
  const fraudResult = computeFraudScore(mockOrder, { orderCount: 5 });
  assert('computeFraudScore returns number', typeof fraudResult === 'number', 'fraud score type wrong');
  assert('computeFraudScore 0-100', fraudResult >= 0 && fraudResult <= 100, 'fraud score out of range');

  return results;
}

/**
 * Format self-test results as a summary string.
 */
export function formatSelfTestResults(results) {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed);
  const lines = [
    `Engine Self-Test: ${passed}/${results.length} passed`,
    '',
    ...failed.map(r => `  FAIL: ${r.name} — ${r.message}`),
  ];
  if (failed.length === 0) lines.push('  All checks passed.');
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 81 · ADVANCED INVENTORY ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classify products by ABC analysis.
 * A = top 80% of revenue, B = next 15%, C = bottom 5%.
 */
export function abcAnalysis(products, orders) {
  const revenueMap = {};
  for (const order of orders) {
    for (const item of (order.items || [])) {
      revenueMap[item.sku] = (revenueMap[item.sku] || 0) + item.unitPrice * item.quantity;
    }
  }

  const sorted = Object.entries(revenueMap)
    .sort((a, b) => b[1] - a[1])
    .map(([sku, revenue]) => ({ sku, revenue: roundCurrency(revenue) }));

  const totalRevenue = sorted.reduce((s, p) => s + p.revenue, 0);
  let cumulative = 0;

  return sorted.map(p => {
    cumulative += p.revenue;
    const share = totalRevenue > 0 ? cumulative / totalRevenue : 0;
    const cls = share <= 0.80 ? 'A' : share <= 0.95 ? 'B' : 'C';
    return { ...p, cumulativeShare: share, class: cls };
  });
}

/**
 * Compute shrinkage rate (inventory loss due to theft, damage, admin errors).
 */
export function computeShrinkageRate(expectedStock, actualStock) {
  if (expectedStock <= 0) return 0;
  return Math.max(0, (expectedStock - actualStock) / expectedStock);
}

/**
 * Identify slow-moving inventory (products with no sales in N days).
 */
export function slowMovingInventory(products, orders, days = 60) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const recentSkus = new Set();
  for (const order of orders) {
    if (new Date(order.createdAt) >= cutoff) {
      for (const item of (order.items || [])) recentSkus.add(item.sku);
    }
  }

  return products
    .filter(p => p.stock > 0 && !recentSkus.has(p.sku))
    .map(p => ({
      sku: p.sku,
      title: p.title,
      stock: p.stock,
      inventoryValue: roundCurrency(p.stock * (p.cost || p.price || 0)),
      daysSinceLastSale: days, // at minimum
    }))
    .sort((a, b) => b.inventoryValue - a.inventoryValue);
}

/**
 * Compute fill rate (orders shipped complete without backorders).
 */
export function computeFillRate(orders) {
  if (orders.length === 0) return 1;
  const fulfilled = orders.filter(o => !o.hasBackorder).length;
  return fulfilled / orders.length;
}

/**
 * Compute perfect order rate (on time, complete, undamaged, accurate).
 */
export function computePerfectOrderRate(orders) {
  if (orders.length === 0) return 1;
  const perfect = orders.filter(o =>
    !o.isLate && !o.hasBackorder && !o.isDamaged && !o.hasError
  ).length;
  return perfect / orders.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 82 · CHANNEL ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

export const CHANNEL_DIRECT     = 'DIRECT';
export const CHANNEL_ORGANIC    = 'ORGANIC';
export const CHANNEL_PAID       = 'PAID';
export const CHANNEL_EMAIL_MKT  = 'EMAIL';
export const CHANNEL_SOCIAL     = 'SOCIAL';
export const CHANNEL_REFERRAL   = 'REFERRAL';
export const CHANNEL_AFFILIATE  = 'AFFILIATE';

/**
 * Attribute revenue by acquisition channel.
 */
export function revenueByChannel(orders) {
  const byChannel = {};
  for (const order of orders) {
    const channel = order.acquisitionChannel || CHANNEL_DIRECT;
    if (!byChannel[channel]) byChannel[channel] = { orders: 0, revenue: 0 };
    byChannel[channel].orders++;
    byChannel[channel].revenue += order.total || 0;
  }
  return Object.entries(byChannel).map(([channel, data]) => ({
    channel,
    orders: data.orders,
    revenue: roundCurrency(data.revenue),
    averageOrderValue: data.orders > 0 ? roundCurrency(data.revenue / data.orders) : 0,
    shareOfRevenue: null, // computed below
  })).map((row, _, arr) => {
    const total = arr.reduce((s, r) => s + r.revenue, 0);
    return { ...row, shareOfRevenue: total > 0 ? row.revenue / total : 0 };
  }).sort((a, b) => b.revenue - a.revenue);
}

/**
 * Compute ROAS (Return on Ad Spend) by channel.
 */
export function computeRoas(orders, adSpend) {
  const revenue = revenueByChannel(orders);
  return revenue.map(row => {
    const spend = adSpend[row.channel] || 0;
    return {
      ...row,
      adSpend: spend,
      roas: spend > 0 ? row.revenue / spend : null,
    };
  });
}

/**
 * Compute blended CAC from total marketing spend and new customers.
 */
export function blendedCac(totalMarketingSpend, newCustomers, channelBreakdown) {
  const base = computeCac(totalMarketingSpend, newCustomers);
  const byChannel = {};
  for (const [channel, data] of Object.entries(channelBreakdown || {})) {
    byChannel[channel] = computeCac(data.spend || 0, data.newCustomers || 0);
  }
  return { blended: base, byChannel };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 83 · REPORT SCHEDULING ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export const SCHEDULE_DAILY   = 'DAILY';
export const SCHEDULE_WEEKLY  = 'WEEKLY';
export const SCHEDULE_MONTHLY = 'MONTHLY';

/**
 * Compute the next run time for a report schedule.
 */
export function nextRunTime(schedule, lastRun = null) {
  const now = new Date();
  switch (schedule) {
    case SCHEDULE_DAILY: {
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(6, 0, 0, 0);
      return next;
    }
    case SCHEDULE_WEEKLY: {
      const next = new Date(now);
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
      next.setDate(next.getDate() + daysUntilMonday);
      next.setHours(6, 0, 0, 0);
      return next;
    }
    case SCHEDULE_MONTHLY: {
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 6, 0, 0);
      return next;
    }
    default:
      return null;
  }
}

/**
 * Build a report schedule entry.
 */
export function createReportSchedule(reportType, schedule, recipients, filters = {}) {
  return {
    id: `sched_${randomId(8)}`,
    reportType,
    schedule,
    recipients,
    filters,
    active: true,
    createdAt: new Date().toISOString(),
    lastRunAt: null,
    nextRunAt: nextRunTime(schedule)?.toISOString() || null,
  };
}

/**
 * Get all report schedules due to run now.
 */
export function getDueSchedules(schedules, now = new Date()) {
  return schedules.filter(s =>
    s.active && s.nextRunAt && new Date(s.nextRunAt) <= now
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 84 · EXTENDED VALIDATOR LIBRARY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate a phone number (basic E.164 format check).
 */
export function validatePhone(phone) {
  return /^\+?[1-9]\d{6,14}$/.test(String(phone || '').replace(/[\s\-().]/g, ''));
}

/**
 * Validate a US ZIP code.
 */
export function validateZip(zip) {
  return /^\d{5}(-\d{4})?$/.test(String(zip || ''));
}

/**
 * Validate an IBAN (simplified — checks format and length).
 */
export function validateIban(iban) {
  const cleaned = String(iban || '').replace(/\s/g, '').toUpperCase();
  return /^[A-Z]{2}\d{2}[A-Z0-9]{4,}$/.test(cleaned) && cleaned.length <= 34;
}

/**
 * Validate a credit card expiry date.
 */
export function validateCardExpiry(month, year) {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (m < 1 || m > 12) return false;
  const expiry = new Date(y < 100 ? 2000 + y : y, m, 0);
  return expiry >= new Date();
}

/**
 * Validate a URL.
 */
export function validateUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate a latitude/longitude pair.
 */
export function validateCoordinates(lat, lng) {
  return (
    Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
    Number.isFinite(lng) && lng >= -180 && lng <= 180
  );
}

/**
 * Validate that a date string matches the expected format.
 */
export function validateDateString(dateStr, format = DATE_FORMAT) {
  if (typeof dateStr !== 'string') return false;
  if (format === 'MM/DD/YYYY') {
    return /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr);
  }
  if (format === 'YYYY-MM-DD') {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 85 · REAL-TIME DASHBOARD DATA AGGREGATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute live dashboard metrics for a given time window.
 */
export function computeLiveDashboard(orders, sessions, now = new Date()) {
  const windowMs = 3_600_000; // last hour
  const windowStart = new Date(now.getTime() - windowMs);

  const recentOrders = orders.filter(o => new Date(o.createdAt) >= windowStart);
  const recentSessions = sessions.filter(s => new Date(s.startedAt) >= windowStart);

  const revenue = recentOrders.reduce((s, o) => s + (o.total || 0), 0);
  const conversions = recentSessions.filter(s => s.converted).length;

  return {
    updatedAt: now.toISOString(),
    window: '1h',
    orders: recentOrders.length,
    revenue: roundCurrency(revenue),
    sessions: recentSessions.length,
    conversions,
    conversionRate: recentSessions.length > 0 ? conversions / recentSessions.length : 0,
    averageOrderValue: recentOrders.length > 0
      ? roundCurrency(revenue / recentOrders.length) : 0,
  };
}

/**
 * Compute projected daily revenue based on current run rate.
 */
export function projectDailyRevenue(currentRevenue, hoursElapsed) {
  if (hoursElapsed <= 0) return 0;
  const hourlyRate = currentRevenue / hoursElapsed;
  return roundCurrency(hourlyRate * 24);
}

/**
 * Compute revenue pace vs target.
 */
export function revenuePaceVsTarget(currentRevenue, targetRevenue, elapsedDays, totalDays) {
  if (totalDays <= 0 || elapsedDays <= 0) return null;
  const expectedByNow = targetRevenue * (elapsedDays / totalDays);
  const pace = currentRevenue / expectedByNow;
  return {
    current: roundCurrency(currentRevenue),
    expected: roundCurrency(expectedByNow),
    target: roundCurrency(targetRevenue),
    pace,
    onTrack: pace >= 0.95,
    paceLabel: pace >= 1.05 ? 'AHEAD' : pace >= 0.95 ? 'ON_TRACK' : 'BEHIND',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 86 · FINAL ENGINE MANIFEST
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Complete manifest of all exported symbols from this engine.
 * Useful for documentation generation and IDE tooling.
 */
export const ENGINE_MANIFEST = {
  version: ENGINE_VERSION,
  build: ENGINE_BUILD,
  sections: 86,
  exportedFunctions: [
    // Section 4 — Validators
    'validateSku', 'validatePrice', 'validateQuantity', 'validateEmail', 'validateAddress',
    'validatePhone', 'validateZip', 'validateIban', 'validateCardExpiry',
    'validateUrl', 'validateCoordinates', 'validateDateString',
    // Section 5 — Math
    'roundCurrency', 'clampPercent', 'lerp', 'weightedAverage', 'standardDeviation',
    // Section 6 — Date
    'formatDate', 'parseDateStr', 'parseDateRange', 'isInDateRange',
    'getDateRangeForPeriod', 'getWeekBounds', 'getFiscalQuarter',
    // Section 12 — Date range filtering
    'filterOrdersByDateRange',
    // Section 16 — Reconciliation
    'reconcileReport',
    // Section 21 — Loyalty
    'calculatePointsEarned', 'calculateRedemptionValue', 'applyLoyaltyRedemption',
    'getLoyaltyTier', 'buildLoyaltySummary', 'processLoyaltyTransaction',
    'aggregateLoyaltyStats', 'getExpiringPoints', 'validateLoyaltyRedemption',
    // Section 22 — Returns
    'isReturnEligible', 'isFullRefundEligible', 'calculateRefundAmount',
    'processReturn', 'aggregateReturnStats', 'flagHighReturnCustomers',
    // Section 23 — Coupons
    'validateCouponCode', 'isCouponActive', 'applyCoupon', 'stackCoupons',
    'generateCouponCode', 'buildCouponUsageReport',
    // Section 25 — Segmentation
    'scoreRfm', 'assignSegment', 'segmentCustomers', 'getWinBackTargets',
    // Section 26 — A/B Testing
    'hashToBucket', 'assignVariant', 'summarizeAbTest',
    // Section 30 — Pipeline
    'runAnalyticsPipeline', 'generateExecutiveDashboard',
    // Section 37 — Subscriptions
    'computeMrr', 'computeArr', 'calculateChurnRate', 'calculateNrr',
    // Section 50 — Alerts
    'evaluateAlerts', 'suppressDuplicateAlerts', 'routeAlert',
    // Section 60 — Integrity
    'engineIntegrityCheck',
    // Section 70 — Extended
    'computeFraudScore', 'batchFraudScore',
    // Section 76 — Statistics
    'median', 'mode', 'variance', 'skewness', 'histogram',
    'cumulativeSum', 'percentageShare', 'giniCoefficient',
    // Section 77 — Customer analytics
    'computeNps', 'customerHealthScore', 'customerValueMatrix',
    // Section 78 — Advanced dates
    'isLeapYear', 'daysInMonth', 'businessDaysBetween', 'addBusinessDays',
    // Section 79 — String utils
    'truncate', 'toTitleCase', 'slugify', 'maskEmail', 'randomId',
    // Section 80 — Self-test
    'runEngineSelfTest', 'formatSelfTestResults',
    // Section 81 — Inventory
    'abcAnalysis', 'computeShrinkageRate', 'slowMovingInventory',
    'computeFillRate', 'computePerfectOrderRate',
    // Section 85 — Live dashboard
    'computeLiveDashboard', 'projectDailyRevenue', 'revenuePaceVsTarget',
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 87 · CROSS-SELL & UPSELL ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find upsell candidates: products in the same category with a higher price.
 */
export function findUpsellCandidates(product, allProducts, maxResults = 5) {
  return allProducts
    .filter(p =>
      p.sku !== product.sku &&
      p.category === product.category &&
      p.price > product.price &&
      p.active
    )
    .sort((a, b) => a.price - b.price)
    .slice(0, maxResults);
}

/**
 * Find cross-sell candidates based on affinity rules.
 */
export function findCrossSellCandidates(cartSkus, affinityRules, allProducts, maxResults = 5) {
  const candidates = new Map();
  for (const rule of affinityRules) {
    if (cartSkus.includes(rule.antecedent) && !cartSkus.includes(rule.consequent)) {
      const existing = candidates.get(rule.consequent) || { score: 0 };
      candidates.set(rule.consequent, { score: existing.score + rule.lift });
    }
  }
  return [...candidates.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, maxResults)
    .map(([sku]) => allProducts.find(p => p.sku === sku))
    .filter(Boolean);
}

/**
 * Compute bundle price given component prices and a discount rate.
 */
export function computeBundlePrice(componentPrices, discountRate = 0.10) {
  const total = componentPrices.reduce((s, p) => s + p, 0);
  return roundCurrency(total * (1 - discountRate));
}

/**
 * Determine if adding a product to a cart qualifies for free shipping.
 */
export function qualifiesForFreeShipping(cartSubtotal, addedItemPrice) {
  const newSubtotal = cartSubtotal + addedItemPrice;
  return {
    before: cartSubtotal >= FREE_SHIPPING_THRESHOLD,
    after:  newSubtotal >= FREE_SHIPPING_THRESHOLD,
    amountNeeded: Math.max(0, FREE_SHIPPING_THRESHOLD - cartSubtotal),
    qualifies: newSubtotal >= FREE_SHIPPING_THRESHOLD,
  };
}

/**
 * Build a personalised product recommendation payload.
 */
export function buildRecommendationPayload(customer, viewedProduct, allProducts, orders, affinityRules) {
  const customerOrders = orders.filter(o => o.customerId === customer.id);
  const purchasedSkus = customerOrders.flatMap(o => (o.items || []).map(i => i.sku));
  const cartSkus = [viewedProduct.sku];

  const crossSell = findCrossSellCandidates(cartSkus, affinityRules, allProducts)
    .filter(p => !purchasedSkus.includes(p.sku));

  const upsell = findUpsellCandidates(viewedProduct, allProducts)
    .filter(p => !purchasedSkus.includes(p.sku));

  const related = getRelatedProducts(viewedProduct, allProducts)
    .filter(p => !purchasedSkus.includes(p.sku));

  return {
    customerId: customer.id,
    contextProduct: viewedProduct.sku,
    crossSell: crossSell.slice(0, 4),
    upsell: upsell.slice(0, 2),
    related: related.slice(0, 6),
    freeShippingStatus: qualifiesForFreeShipping(0, viewedProduct.price),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 88 · SALES TERRITORY MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assign sales territories by state groupings.
 */
export const SALES_TERRITORIES = {
  NORTHEAST: ['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA'],
  SOUTHEAST: ['MD', 'DE', 'VA', 'WV', 'NC', 'SC', 'GA', 'FL', 'KY', 'TN', 'AL', 'MS'],
  MIDWEST:   ['OH', 'IN', 'IL', 'MI', 'WI', 'MN', 'IA', 'MO', 'ND', 'SD', 'NE', 'KS'],
  SOUTH:     ['AR', 'LA', 'OK', 'TX'],
  MOUNTAIN:  ['MT', 'ID', 'WY', 'CO', 'NM', 'AZ', 'UT', 'NV'],
  PACIFIC:   ['WA', 'OR', 'CA', 'AK', 'HI'],
};

/**
 * Look up the sales territory for a given state code.
 */
export function getTerritoryForState(stateCode) {
  for (const [territory, states] of Object.entries(SALES_TERRITORIES)) {
    if (states.includes(stateCode.toUpperCase())) return territory;
  }
  return 'OTHER';
}

/**
 * Compute revenue by sales territory.
 */
export function revenueByTerritory(orders) {
  const totals = {};
  for (const order of orders) {
    const state = normaliseStateCode(order.shippingAddress?.state || '');
    const territory = state ? getTerritoryForState(state) : 'OTHER';
    totals[territory] = (totals[territory] || 0) + (order.total || 0);
  }
  return Object.entries(totals)
    .map(([territory, revenue]) => ({ territory, revenue: roundCurrency(revenue) }))
    .sort((a, b) => b.revenue - a.revenue);
}

/**
 * Compute quota attainment for a sales representative.
 */
export function salesRepQuotaAttainment(repOrders, quota) {
  const actual = roundCurrency(repOrders.reduce((s, o) => s + (o.total || 0), 0));
  const attainment = quota > 0 ? actual / quota : null;
  return {
    actual,
    quota,
    attainment,
    attainmentPct: attainment != null ? `${(attainment * 100).toFixed(1)}%` : 'N/A',
    status: attainment == null ? 'N/A'
      : attainment >= 1.0 ? 'ACHIEVED'
      : attainment >= 0.8 ? 'NEAR'
      : 'BELOW',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 89 · ADVANCED SHIPPING ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute average shipping cost per order and per unit.
 */
export function shippingCostMetrics(orders) {
  if (orders.length === 0) return { perOrder: 0, perUnit: 0, totalCost: 0 };
  const totalCost = orders.reduce((s, o) => s + (o.shippingCost || 0), 0);
  const totalUnits = orders.reduce((s, o) =>
    s + (o.items || []).reduce((u, i) => u + i.quantity, 0), 0);
  return {
    totalCost: roundCurrency(totalCost),
    perOrder:  roundCurrency(totalCost / orders.length),
    perUnit:   totalUnits > 0 ? roundCurrency(totalCost / totalUnits) : 0,
    freeShippingOrders: orders.filter(o => (o.shippingCost || 0) === 0).length,
    freeShippingRate: orders.length > 0
      ? orders.filter(o => (o.shippingCost || 0) === 0).length / orders.length : 0,
  };
}

/**
 * Compute carrier share by order count and revenue.
 */
export function carrierMarketShare(shipments) {
  const counts = {};
  const costs  = {};
  for (const s of shipments) {
    const c = s.carrier || 'UNKNOWN';
    counts[c] = (counts[c] || 0) + 1;
    costs[c]  = (costs[c]  || 0) + (s.cost || 0);
  }
  const total = shipments.length;
  return Object.keys(counts).map(carrier => ({
    carrier,
    shipments: counts[carrier],
    totalCost: roundCurrency(costs[carrier]),
    share: total > 0 ? counts[carrier] / total : 0,
    avgCost: counts[carrier] > 0 ? roundCurrency(costs[carrier] / counts[carrier]) : 0,
  })).sort((a, b) => b.shipments - a.shipments);
}

/**
 * Compute zone distribution for shipments.
 */
export function zoneDistribution(shipments) {
  const zones = {};
  for (const s of shipments) {
    const z = s.zone || 'UNKNOWN';
    zones[z] = (zones[z] || 0) + 1;
  }
  return Object.entries(zones)
    .map(([zone, count]) => ({ zone, count, share: shipments.length > 0 ? count / shipments.length : 0 }))
    .sort((a, b) => a.zone.localeCompare(b.zone));
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 90 · EXTENDED CONFIGURATION PRESETS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pre-built report configurations for common use cases.
 */
export const REPORT_PRESETS = {
  DAILY_REVENUE: {
    reportType: REPORT_TYPE_SALES,
    schedule: SCHEDULE_DAILY,
    columns: getSalesReportColumns(),
    filters: { status: [STATUS_CONFIRMED, STATUS_SHIPPED, STATUS_DELIVERED] },
    format: 'CSV',
  },
  WEEKLY_INVENTORY: {
    reportType: REPORT_TYPE_INVENTORY,
    schedule: SCHEDULE_WEEKLY,
    columns: getInventoryReportColumns(),
    filters: {},
    format: 'CSV',
  },
  MONTHLY_TAX: {
    reportType: REPORT_TYPE_TAX,
    schedule: SCHEDULE_MONTHLY,
    filters: {},
    format: 'CSV',
  },
};

/**
 * Clone a report preset with overrides.
 */
export function clonePreset(presetKey, overrides = {}) {
  const preset = REPORT_PRESETS[presetKey];
  if (!preset) throw new Error(`Unknown preset: ${presetKey}`);
  return deepMerge(JSON.parse(JSON.stringify(preset)), overrides);
}

/**
 * List all available preset keys.
 */
export function listPresets() {
  return Object.keys(REPORT_PRESETS);
}

/**
 * Build a custom analytics configuration from a preset and user overrides.
 */
export function buildAnalyticsConfig(presetKey, userOverrides = {}) {
  const preset = clonePreset(presetKey, userOverrides);
  const config = mergeConfig(preset.config || {});
  const validation = validateEngineConfig(config);
  if (!validation.valid) {
    throw new Error(`Invalid config: ${validation.errors.map(e => e.message).join(', ')}`);
  }
  return { ...preset, config };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 91 · COMPLETE REGION & SHIPPING ZONE TABLES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * USPS shipping zone table (origin: Zone 1 warehouse, destination state prefix).
 * Zones 1-8. Used by computeDeliveryWindow() and shipping cost calculations.
 */
export const ZIP_PREFIX_TO_ZONE = {
  '005': 1, '006': 1, '007': 1, '008': 1, '009': 1,
  '010': 2, '011': 2, '012': 2, '013': 2, '014': 2, '015': 2, '016': 2, '017': 2, '018': 2, '019': 2,
  '020': 2, '021': 2, '022': 2, '023': 2, '024': 2, '025': 2, '026': 2, '027': 2,
  '028': 2, '029': 2, '030': 3, '031': 3, '032': 3, '033': 3, '034': 3, '035': 3,
  '036': 3, '037': 3, '038': 3, '039': 3, '040': 3, '041': 3, '042': 3, '043': 3,
  '044': 3, '045': 3, '046': 3, '047': 3, '048': 3, '049': 3,
  '100': 2, '101': 2, '102': 2, '103': 2, '104': 2, '105': 2, '106': 2, '107': 2, '108': 2, '109': 2,
  '110': 2, '111': 2, '112': 2, '113': 2, '114': 2, '115': 2, '116': 2, '117': 2, '118': 2, '119': 2,
  '120': 3, '121': 3, '122': 3, '123': 3, '124': 3, '125': 3, '126': 3, '127': 3, '128': 3, '129': 3,
  '300': 4, '301': 4, '302': 4, '303': 4, '304': 4, '305': 4, '306': 4, '307': 4, '308': 4, '309': 4,
  '310': 4, '311': 4, '312': 4, '313': 4, '314': 4, '315': 4, '316': 4, '317': 4, '318': 4, '319': 4,
  '400': 5, '401': 5, '402': 5, '403': 5, '404': 5, '405': 5, '406': 5, '407': 5, '408': 5, '409': 5,
  '500': 5, '501': 5, '502': 5, '503': 5, '504': 5, '505': 5, '506': 5, '507': 5, '508': 5, '509': 5,
  '510': 5, '511': 5, '512': 5, '513': 5, '514': 5, '515': 5, '516': 5, '517': 5, '518': 5, '519': 5,
  '600': 5, '601': 5, '602': 5, '603': 5, '604': 5, '605': 5, '606': 5, '607': 5, '608': 5, '609': 5,
  '700': 5, '701': 5, '702': 5, '703': 5, '704': 5, '705': 5, '706': 5, '707': 5, '708': 5, '709': 5,
  '750': 5, '751': 5, '752': 5, '753': 5, '754': 5, '755': 5, '756': 5, '757': 5, '758': 5, '759': 5,
  '800': 6, '801': 6, '802': 6, '803': 6, '804': 6, '805': 6, '806': 6, '807': 6, '808': 6, '809': 6,
  '810': 6, '811': 6, '812': 6, '813': 6, '814': 6, '815': 6, '816': 6, '817': 6, '818': 6, '819': 6,
  '820': 6, '821': 6, '822': 6, '823': 6, '824': 6, '825': 6, '826': 6, '827': 6, '828': 6, '829': 6,
  '850': 7, '851': 7, '852': 7, '853': 7, '854': 7, '855': 7, '856': 7, '857': 7, '858': 7, '859': 7,
  '860': 7, '861': 7, '862': 7, '863': 7, '864': 7, '865': 7,
  '900': 8, '901': 8, '902': 8, '903': 8, '904': 8, '905': 8, '906': 8, '907': 8, '908': 8, '909': 8,
  '910': 8, '911': 8, '912': 8, '913': 8, '914': 8, '915': 8, '916': 8, '917': 8, '918': 8, '919': 8,
  '920': 8, '921': 8, '922': 8, '923': 8, '924': 8, '925': 8, '926': 8, '927': 8, '928': 8,
  '930': 8, '931': 8, '932': 8, '933': 8, '934': 8, '935': 8, '936': 8, '937': 8, '938': 8, '939': 8,
  '940': 8, '941': 8, '942': 8, '943': 8, '944': 8, '945': 8, '946': 8, '947': 8, '948': 8, '949': 8,
  '950': 8, '951': 8, '952': 8, '953': 8, '954': 8, '955': 8, '956': 8, '957': 8, '958': 8, '959': 8,
  '960': 8, '961': 8, '970': 8, '971': 8, '972': 8, '973': 8, '974': 8, '975': 8, '976': 8, '977': 8,
  '978': 8, '979': 8, '980': 8, '981': 8, '982': 8, '983': 8, '984': 8, '985': 8, '986': 8,
  '988': 8, '989': 8, '990': 8, '991': 8, '992': 8, '993': 8, '994': 8, '995': 8, '996': 8, '997': 8, '998': 8, '999': 8,
};

/**
 * Look up the shipping zone for a destination ZIP code from Zone 1 origin.
 */
export function getShippingZone(destinationZip) {
  const prefix = String(destinationZip).replace(/\D/g, '').slice(0, 3);
  return ZIP_PREFIX_TO_ZONE[prefix] || 4;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 92 · TAX RATE TABLE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * State-level combined (state + average local) tax rates.
 * Source: Tax Foundation 2024 estimates.
 */
export const STATE_TAX_RATES = {
  AL: 0.0922, AK: 0.0176, AZ: 0.0840, AR: 0.0947, CA: 0.0875,
  CO: 0.0773, CT: 0.0635, DE: 0.0000, FL: 0.0701, GA: 0.0732,
  HI: 0.0444, ID: 0.0602, IL: 0.1000, IN: 0.0700, IA: 0.0694,
  KS: 0.0887, KY: 0.0600, LA: 0.0952, ME: 0.0550, MD: 0.0600,
  MA: 0.0625, MI: 0.0600, MN: 0.0749, MS: 0.0707, MO: 0.0822,
  MT: 0.0000, NE: 0.0694, NV: 0.0823, NH: 0.0000, NJ: 0.0660,
  NM: 0.0783, NY: 0.0845, NC: 0.0698, ND: 0.0697, OH: 0.0757,
  OK: 0.0898, OR: 0.0000, PA: 0.0634, RI: 0.0700, SC: 0.0746,
  SD: 0.0640, TN: 0.0955, TX: 0.0820, UT: 0.0719, VT: 0.0618,
  VA: 0.0577, WA: 0.0923, WV: 0.0651, WI: 0.0543, WY: 0.0542,
  DC: 0.0600,
};

/**
 * Get the tax rate for a state.
 */
export function getTaxRateForState(stateCode) {
  return STATE_TAX_RATES[stateCode?.toUpperCase()] ?? DEFAULT_TAX_RATE;
}

/**
 * Compute precise tax amount using state-specific rates.
 */
export function computeStateTax(subtotal, stateCode) {
  const rate = getTaxRateForState(stateCode);
  return roundCurrency(subtotal * rate);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 93 · PRODUCT CATEGORY HIERARCHY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Category tree for the product catalogue.
 * Each node has children, a tax class, and whether it is typically high-margin.
 */
export const CATEGORY_TREE = {
  ELECTRONICS: {
    label: 'Electronics',
    taxClass: 'STANDARD',
    highMargin: false,
    children: {
      PHONES:    { label: 'Phones & Tablets',  taxClass: 'STANDARD', highMargin: false },
      COMPUTERS: { label: 'Computers',         taxClass: 'STANDARD', highMargin: false },
      AUDIO:     { label: 'Audio & Headphones',taxClass: 'STANDARD', highMargin: true  },
      CAMERAS:   { label: 'Cameras',           taxClass: 'STANDARD', highMargin: false },
      WEARABLES: { label: 'Wearables',         taxClass: 'STANDARD', highMargin: true  },
      GAMING:    { label: 'Gaming',            taxClass: 'STANDARD', highMargin: true  },
    },
  },
  APPAREL: {
    label: 'Apparel',
    taxClass: 'CLOTHING',
    highMargin: true,
    children: {
      MENS:      { label: "Men's",    taxClass: 'CLOTHING', highMargin: true },
      WOMENS:    { label: "Women's",  taxClass: 'CLOTHING', highMargin: true },
      KIDS:      { label: "Kids'",    taxClass: 'CLOTHING', highMargin: true },
      SHOES:     { label: 'Shoes',    taxClass: 'STANDARD', highMargin: true },
      SPORTS:    { label: 'Sportswear',taxClass:'CLOTHING', highMargin: true },
    },
  },
  HOME: {
    label: 'Home & Garden',
    taxClass: 'STANDARD',
    highMargin: true,
    children: {
      FURNITURE: { label: 'Furniture',       taxClass: 'STANDARD', highMargin: false },
      DECOR:     { label: 'Decor',           taxClass: 'STANDARD', highMargin: true  },
      KITCHEN:   { label: 'Kitchen',         taxClass: 'STANDARD', highMargin: true  },
      GARDEN:    { label: 'Garden & Outdoor',taxClass: 'STANDARD', highMargin: true  },
    },
  },
  FOOD: {
    label: 'Food & Grocery',
    taxClass: 'FOOD',
    highMargin: false,
    children: {
      FRESH:     { label: 'Fresh Produce',  taxClass: 'FOOD', highMargin: false },
      PACKAGED:  { label: 'Packaged Goods', taxClass: 'FOOD', highMargin: false },
      BEVERAGES: { label: 'Beverages',      taxClass: 'FOOD', highMargin: false },
      SNACKS:    { label: 'Snacks',         taxClass: 'FOOD', highMargin: true  },
    },
  },
  BEAUTY: {
    label: 'Beauty & Personal Care',
    taxClass: 'STANDARD',
    highMargin: true,
    children: {
      SKINCARE:  { label: 'Skincare',    taxClass: 'STANDARD', highMargin: true },
      MAKEUP:    { label: 'Makeup',      taxClass: 'STANDARD', highMargin: true },
      HAIRCARE:  { label: 'Hair Care',   taxClass: 'STANDARD', highMargin: true },
      FRAGRANCE: { label: 'Fragrance',   taxClass: 'STANDARD', highMargin: true },
    },
  },
};

/**
 * Flatten the category tree into a lookup map (code → node).
 */
export function flattenCategoryTree(tree = CATEGORY_TREE) {
  const flat = {};
  for (const [code, node] of Object.entries(tree)) {
    flat[code] = node;
    if (node.children) {
      for (const [childCode, child] of Object.entries(node.children)) {
        flat[childCode] = { ...child, parentCode: code };
      }
    }
  }
  return flat;
}

/**
 * Get the tax class for a product category.
 */
export function getCategoryTaxClass(categoryCode) {
  const flat = flattenCategoryTree();
  return flat[categoryCode]?.taxClass || 'STANDARD';
}

/**
 * List all high-margin categories.
 */
export function getHighMarginCategories() {
  const flat = flattenCategoryTree();
  return Object.entries(flat)
    .filter(([, node]) => node.highMargin)
    .map(([code, node]) => ({ code, label: node.label }));
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 94 · COMPLETE MODULE REGISTRY (FINAL)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Final complete registry of every exported module and function in this engine.
 * Sections 1-94 are represented here for API surface documentation.
 */
export const FULL_MODULE_REGISTRY = {
  ...ANALYTICS_MODULES,
  ...ANALYTICS_EXTENDED_MODULES,
  crossSell: {
    findUpsellCandidates,
    findCrossSellCandidates,
    computeBundlePrice,
    qualifiesForFreeShipping,
    buildRecommendationPayload,
  },
  territory: {
    getTerritoryForState,
    revenueByTerritory,
    salesRepQuotaAttainment,
  },
  shipping: {
    getShippingZone,
    shippingCostMetrics,
    carrierMarketShare,
    zoneDistribution,
  },
  tax: {
    getTaxRateForState,
    computeStateTax,
    hasNexus,
    computeNexusStatus,
    taxLiabilitySummary,
    filterTaxExemptOrders,
  },
  catalogue: {
    flattenCategoryTree,
    getCategoryTaxClass,
    getHighMarginCategories,
  },
  scheduling: {
    nextRunTime,
    createReportSchedule,
    getDueSchedules,
  },
  config: {
    mergeConfig,
    validateEngineConfig,
    buildAnalyticsConfig,
    listPresets,
    clonePreset,
  },
  reviews: {
    classifyReviewSentiment,
    aggregateProductReviews,
    extractReviewKeywords,
    flagSuspiciousReviews,
  },
  notifications: {
    resolveNotificationChannels,
    buildNotificationDispatch,
    notificationEngagementByChannel,
  },
  featureFlags: {
    isFeatureEnabled,
    getFeaturesForPlan,
    buildPlanComparisonMatrix,
  },
  organisation: {
    resolveOrgConfig,
    checkOrgLimits,
    crossTenantSummary,
  },
  liveDashboard: {
    computeLiveDashboard,
    projectDailyRevenue,
    revenuePaceVsTarget,
  },
  inventory: {
    abcAnalysis,
    computeShrinkageRate,
    slowMovingInventory,
    computeFillRate,
    computePerfectOrderRate,
    computeSalesVelocity,
    computeReorderPoint,
    generateReorderAlerts,
    projectInventory,
  },
  selfTest: {
    runEngineSelfTest,
    formatSelfTestResults,
    engineIntegrityCheck,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 95 · COMPLETE CARRIER RATE TABLES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * USPS Commercial Base Pricing (2024, illustrative).
 * Rows: weight in oz, Columns: zones 1-8.
 */
export const USPS_PRIORITY_RATES = {
  // oz  : [z1,    z2,    z3,    z4,    z5,    z6,    z7,    z8]
  1:       [7.90,  7.90,  7.90,  8.05,  8.40,  8.80,  9.45, 10.20],
  2:       [7.90,  7.90,  7.90,  8.05,  8.40,  8.80,  9.45, 10.20],
  4:       [7.90,  7.90,  7.90,  8.15,  8.75,  9.60, 10.35, 11.45],
  8:       [7.90,  7.90,  8.20,  9.10,  9.95, 11.50, 13.35, 15.05],
  12:      [7.90,  8.35,  9.15, 10.35, 11.55, 13.65, 15.85, 18.15],
  16:      [8.05,  9.00, 10.10, 11.60, 13.20, 15.85, 18.50, 21.40],
  24:      [8.90, 10.40, 12.20, 14.10, 16.35, 20.00, 23.45, 27.50],
  32:      [9.75, 11.80, 13.90, 16.45, 19.20, 23.60, 27.90, 32.75],
  48:      [11.55,14.35, 17.35, 20.90, 24.55, 30.55, 36.35, 43.25],
  64:      [13.40,16.90, 20.80, 25.40, 30.00, 37.55, 44.80, 53.80],
  80:      [15.20,19.45, 24.25, 29.90, 35.45, 44.55, 53.25, 64.35],
  96:      [17.05,22.00, 27.70, 34.40, 40.90, 51.55, 61.65, 74.85],
  112:     [18.90,24.55, 31.15, 38.90, 46.35, 58.55, 70.10, 85.35],
  128:     [20.75,27.10, 34.60, 43.45, 51.80, 65.60, 78.55, 95.85],
  160:     [24.40,32.20, 41.50, 52.45, 62.75, 79.60, 95.45,116.90],
  192:     [28.10,37.30, 48.45, 61.50, 73.65, 93.65,112.35,137.90],
  224:     [31.75,42.35, 55.35, 70.50, 84.55,107.65,129.25,158.90],
  256:     [35.40,47.45, 62.30, 79.55, 95.50,121.65,146.15,179.90],
  288:     [39.10,52.55, 69.25, 88.55,106.40,135.65,163.10,200.90],
  320:     [42.75,57.60, 76.20, 97.60,117.35,149.65,179.95,221.90],
};

/**
 * Look up USPS Priority Mail rate for a given weight and zone.
 * Weight is in ounces. Returns the rate in USD.
 */
export function uspsRate(weightOz, zone) {
  const brackets = Object.keys(USPS_PRIORITY_RATES).map(Number).sort((a, b) => a - b);
  let bracket = brackets[brackets.length - 1];
  for (const b of brackets) {
    if (weightOz <= b) { bracket = b; break; }
  }
  const rates = USPS_PRIORITY_RATES[bracket];
  const zoneIdx = Math.min(7, Math.max(0, (zone || 1) - 1));
  return roundCurrency(rates[zoneIdx]);
}

/**
 * FedEx Ground rates (illustrative, 2024).
 * Same bracket/zone structure as USPS.
 */
export const FEDEX_GROUND_RATES = {
  1:   [8.15,  8.15,  8.15,  8.30,  8.65,  9.05,  9.80, 10.55],
  2:   [8.15,  8.15,  8.15,  8.30,  8.65,  9.05,  9.80, 10.55],
  4:   [8.15,  8.15,  8.25,  8.55,  9.15, 10.05, 10.80, 11.95],
  8:   [8.15,  8.25,  8.65,  9.60, 10.45, 12.10, 14.00, 15.80],
  16:  [8.60,  9.65, 10.90, 12.45, 14.25, 17.10, 20.00, 23.10],
  32:  [10.65, 13.10, 15.60, 18.60, 21.90, 27.20, 32.50, 38.60],
  64:  [14.90, 19.10, 24.00, 29.80, 35.80, 46.00, 55.50, 67.80],
  128: [23.40, 31.20, 40.80, 52.80, 65.40, 85.40,103.00,127.00],
};

/**
 * Look up FedEx Ground rate.
 */
export function fedexGroundRate(weightOz, zone) {
  const brackets = Object.keys(FEDEX_GROUND_RATES).map(Number).sort((a, b) => a - b);
  let bracket = brackets[brackets.length - 1];
  for (const b of brackets) {
    if (weightOz <= b) { bracket = b; break; }
  }
  const rates = FEDEX_GROUND_RATES[bracket];
  const zoneIdx = Math.min(7, Math.max(0, (zone || 1) - 1));
  return roundCurrency(rates[zoneIdx]);
}

/**
 * Find the cheapest carrier for a given weight and destination ZIP.
 */
export function cheapestCarrier(weightOz, destinationZip) {
  const zone = getShippingZone(destinationZip);
  const usps  = uspsRate(weightOz, zone);
  const fedex = fedexGroundRate(weightOz, zone);
  return {
    zone,
    carriers: [
      { carrier: CARRIER_USPS,  rate: usps  },
      { carrier: CARRIER_FEDEX, rate: fedex },
    ].sort((a, b) => a.rate - b.rate),
    cheapest: usps <= fedex ? CARRIER_USPS : CARRIER_FEDEX,
    cheapestRate: Math.min(usps, fedex),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 96 · PROMOTIONAL CALENDAR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Key retail promotional dates.
 * Format: YYYY-MM-DD
 */
export const PROMOTIONAL_CALENDAR = {
  NEW_YEARS:        { month: 1,  day: 1,  label: "New Year's Day",     expectedLift: 0.15 },
  VALENTINES:       { month: 2,  day: 14, label: "Valentine's Day",    expectedLift: 0.25 },
  ST_PATRICKS:      { month: 3,  day: 17, label: "St Patrick's Day",   expectedLift: 0.05 },
  EASTER_APPROX:    { month: 4,  day: 9,  label: 'Easter (approx)',    expectedLift: 0.10 },
  MOTHERS_DAY:      { month: 5,  day: 12, label: "Mother's Day",       expectedLift: 0.30 },
  MEMORIAL_DAY:     { month: 5,  day: 27, label: 'Memorial Day',       expectedLift: 0.20 },
  FATHERS_DAY:      { month: 6,  day: 16, label: "Father's Day",       expectedLift: 0.20 },
  INDEPENDENCE_DAY: { month: 7,  day: 4,  label: 'Independence Day',   expectedLift: 0.15 },
  LABOR_DAY:        { month: 9,  day: 2,  label: 'Labor Day',          expectedLift: 0.20 },
  HALLOWEEN:        { month: 10, day: 31, label: 'Halloween',          expectedLift: 0.15 },
  VETERANS_DAY:     { month: 11, day: 11, label: "Veterans Day",       expectedLift: 0.10 },
  THANKSGIVING:     { month: 11, day: 28, label: 'Thanksgiving',       expectedLift: 0.25 },
  BLACK_FRIDAY:     { month: 11, day: 29, label: 'Black Friday',       expectedLift: 1.50 },
  CYBER_MONDAY:     { month: 12, day: 2,  label: 'Cyber Monday',       expectedLift: 1.20 },
  CHRISTMAS:        { month: 12, day: 25, label: 'Christmas',          expectedLift: 0.50 },
  NEW_YEARS_EVE:    { month: 12, day: 31, label: "New Year's Eve",     expectedLift: 0.10 },
};

/**
 * Get upcoming promotional dates within N days.
 */
export function getUpcomingPromos(daysAhead = 30, now = new Date()) {
  const year = now.getFullYear();
  const upcoming = [];

  for (const [key, promo] of Object.entries(PROMOTIONAL_CALENDAR)) {
    const promoDate = new Date(year, promo.month - 1, promo.day);
    const daysUntil = (promoDate - now) / 86_400_000;
    if (daysUntil >= 0 && daysUntil <= daysAhead) {
      upcoming.push({
        key,
        label: promo.label,
        date: formatDate(promoDate),
        daysUntil: Math.round(daysUntil),
        expectedLift: promo.expectedLift,
      });
    }
  }

  return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Estimate revenue lift for a promotional period.
 */
export function estimatePromoRevenueLift(baselineDailyRevenue, promoKey, days = 1) {
  const promo = PROMOTIONAL_CALENDAR[promoKey];
  if (!promo) return baselineDailyRevenue * days;
  const liftedRevenue = baselineDailyRevenue * (1 + promo.expectedLift);
  return roundCurrency(liftedRevenue * days);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 97 · EXTENDED PUBLIC API — CONVENIENCE WRAPPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One-shot convenience: compute a complete revenue summary for a date range.
 */
export function quickRevenueSummary(orders, startDate, endDate) {
  const range = { startDate, endDate };
  const filtered = orders.filter(o => isInDateRange(new Date(o.createdAt), range));
  const revenue = filtered.reduce((s, o) => s + (o.total || 0), 0);
  return {
    startDate,
    endDate,
    orders: filtered.length,
    revenue: roundCurrency(revenue),
    averageOrderValue: filtered.length > 0 ? roundCurrency(revenue / filtered.length) : 0,
    dailyAverage: (() => {
      const days = (new Date(endDate) - new Date(startDate)) / 86_400_000 + 1;
      return days > 0 ? roundCurrency(revenue / days) : 0;
    })(),
  };
}

/**
 * One-shot convenience: get top N products by revenue for a date range.
 */
export function quickTopProducts(orders, startDate, endDate, topN = 10) {
  const summary = quickRevenueSummary(orders, startDate, endDate);
  const range = { startDate, endDate };
  const filtered = orders.filter(o => isInDateRange(new Date(o.createdAt), range));
  const skuRevenue = {};
  const skuUnits   = {};
  for (const order of filtered) {
    for (const item of (order.items || [])) {
      skuRevenue[item.sku] = (skuRevenue[item.sku] || 0) + item.unitPrice * item.quantity;
      skuUnits[item.sku]   = (skuUnits[item.sku]   || 0) + item.quantity;
    }
  }
  return Object.entries(skuRevenue)
    .map(([sku, revenue]) => ({ sku, revenue: roundCurrency(revenue), units: skuUnits[sku] }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, topN);
}

/**
 * One-shot convenience: compute customer summary for a date range.
 */
export function quickCustomerSummary(orders, customers, startDate, endDate) {
  const range = { startDate, endDate };
  const filtered = orders.filter(o => isInDateRange(new Date(o.createdAt), range));
  const uniqueCustomers = new Set(filtered.map(o => o.customerId));
  const newCustomers = customers.filter(c => {
    const d = new Date(c.createdAt);
    return isInDateRange(d, range);
  });
  return {
    startDate,
    endDate,
    uniqueBuyers: uniqueCustomers.size,
    newCustomers: newCustomers.length,
    repeatRate: uniqueCustomers.size > 0
      ? filtered.filter(o => {
          const prevOrders = orders.filter(po =>
            po.customerId === o.customerId &&
            new Date(po.createdAt) < new Date(startDate)
          );
          return prevOrders.length > 0;
        }).length / uniqueCustomers.size
      : 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 98 · SAMPLE DATA GENERATORS (FOR TESTING)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a synthetic order for testing.
 */
export function generateSyntheticOrder(overrides = {}) {
  const id = `ORD-${randomId(8)}`;
  const sku = `SKU-${randomId(6).toUpperCase()}`;
  const qty = Math.ceil(Math.random() * 5);
  const price = roundCurrency(Math.random() * 200 + 10);
  const subtotal = roundCurrency(price * qty);
  const tax = roundCurrency(subtotal * DEFAULT_TAX_RATE);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : roundCurrency(Math.random() * 10 + 3);
  const total = roundCurrency(subtotal + tax + shipping);

  const states = Object.keys(STATE_TAX_RATES);
  const state = states[Math.floor(Math.random() * states.length)];
  const zip = String(Math.floor(Math.random() * 90000) + 10000);

  return {
    id,
    customerId: `CUST-${randomId(6)}`,
    createdAt: new Date(Date.now() - Math.random() * 90 * 86_400_000).toISOString(),
    status: STATUS_DELIVERED,
    items: [{ sku, title: `Product ${sku}`, quantity: qty, unitPrice: price, weight: Math.random() * 5 }],
    subtotal,
    discount: 0,
    tax,
    shippingCost: shipping,
    total,
    shippingAddress: { state, zip, country: 'US' },
    billingAddress:  { state, zip, country: 'US' },
    paymentMethod: PAYMENT_CARD,
    currency: DEFAULT_CURRENCY,
    acquisitionChannel: CHANNEL_DIRECT,
    ...overrides,
  };
}

/**
 * Generate N synthetic orders.
 */
export function generateSyntheticOrders(n = 100, overrides = {}) {
  return Array.from({ length: n }, () => generateSyntheticOrder(overrides));
}

/**
 * Generate a synthetic customer.
 */
export function generateSyntheticCustomer(overrides = {}) {
  const id = `CUST-${randomId(6)}`;
  const orderCount = Math.floor(Math.random() * 20);
  const lifetimeValue = roundCurrency(orderCount * (Math.random() * 150 + 30));
  return {
    id,
    email: `user${randomId(4)}@example.com`,
    name: `Test User ${id}`,
    orderCount,
    lifetimeValue,
    firstOrderAt: new Date(Date.now() - (orderCount * 30 + Math.random() * 60) * 86_400_000).toISOString(),
    lastOrderAt:  new Date(Date.now() - Math.random() * 90 * 86_400_000).toISOString(),
    currentPoints: Math.floor(lifetimeValue * LOYALTY_POINTS_PER_DOLLAR * Math.random()),
    lifetimePoints: Math.floor(lifetimeValue * LOYALTY_POINTS_PER_DOLLAR),
    createdAt: new Date(Date.now() - Math.random() * 365 * 86_400_000).toISOString(),
    ...overrides,
  };
}

/**
 * Generate N synthetic customers.
 */
export function generateSyntheticCustomers(n = 50) {
  return Array.from({ length: n }, () => generateSyntheticCustomer());
}

/**
 * Generate a synthetic product.
 */
export function generateSyntheticProduct(overrides = {}) {
  const sku = `SKU-${randomId(6).toUpperCase()}`;
  const categories = Object.keys(CATEGORY_TREE);
  const category = categories[Math.floor(Math.random() * categories.length)];
  const price = roundCurrency(Math.random() * 200 + 5);
  const stock = Math.floor(Math.random() * 500);
  return {
    id: randomId(8),
    sku,
    title: `Product ${sku}`,
    description: `A high-quality product in the ${category} category.`,
    price,
    compareAtPrice: Math.random() > 0.6 ? roundCurrency(price * 1.2) : null,
    category,
    tags: [category.toLowerCase(), 'sample'],
    weight: Math.random() * 10,
    stock,
    active: Math.random() > 0.1,
    cost: roundCurrency(price * 0.4),
    createdAt: new Date(Date.now() - Math.random() * 365 * 86_400_000).toISOString(),
    ...overrides,
  };
}

/**
 * Generate N synthetic products.
 */
export function generateSyntheticProducts(n = 50) {
  return Array.from({ length: n }, () => generateSyntheticProduct());
}

/**
 * Generate a full synthetic dataset for testing the analytics engine.
 */
export function generateSyntheticDataset(options = {}) {
  const {
    orderCount    = 500,
    customerCount = 100,
    productCount  = 80,
  } = options;

  const customers = generateSyntheticCustomers(customerCount);
  const products  = generateSyntheticProducts(productCount);
  const orders    = generateSyntheticOrders(orderCount).map(o => ({
    ...o,
    customerId: customers[Math.floor(Math.random() * customers.length)].id,
    items: o.items.map(i => ({
      ...i,
      sku: products[Math.floor(Math.random() * products.length)].sku,
    })),
  }));

  return { orders, customers, products };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 99 · COMPLETE QUICK-REFERENCE GLOSSARY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Glossary of all metric abbreviations used in this engine.
 */
export const METRIC_GLOSSARY = {
  AOV:   'Average Order Value — total revenue divided by number of orders',
  ARR:   'Annual Recurring Revenue — MRR × 12',
  CAC:   'Customer Acquisition Cost — marketing spend ÷ new customers',
  CLV:   'Customer Lifetime Value — total expected revenue from a customer',
  CLS:   'Cumulative Layout Shift — Core Web Vital measuring visual stability',
  CR:    'Conversion Rate — orders ÷ sessions',
  CPA:   'Cost Per Acquisition — spend ÷ conversions',
  CTR:   'Click-Through Rate — clicks ÷ impressions',
  COGS:  'Cost of Goods Sold — direct costs of products sold',
  CVR:   'Conversion Rate (alternative abbreviation)',
  EBITDA:'Earnings Before Interest, Taxes, Depreciation, and Amortisation',
  EOQ:   'Economic Order Quantity — optimal order size to minimise total inventory costs',
  FID:   'First Input Delay — Core Web Vital measuring interactivity',
  GMV:   'Gross Merchandise Value — total value of goods sold through the platform',
  IQR:   'Interquartile Range — measure of statistical dispersion',
  KPI:   'Key Performance Indicator',
  LCP:   'Largest Contentful Paint — Core Web Vital measuring loading speed',
  LTV:   'Lifetime Value (see CLV)',
  MoM:   'Month over Month — comparison of the same metric between consecutive months',
  MRR:   'Monthly Recurring Revenue — sum of all active subscription revenue normalised to one month',
  NPS:   'Net Promoter Score — customer loyalty metric from 9/10 survey responses',
  NRR:   'Net Revenue Retention — how well you retain and expand revenue from existing customers',
  ROAS:  'Return on Ad Spend — revenue ÷ advertising cost',
  ROI:   'Return on Investment — (revenue − cost) ÷ cost',
  RFM:   'Recency, Frequency, Monetary — customer segmentation framework',
  SKU:   'Stock Keeping Unit — unique identifier for a product variant',
  SLA:   'Service Level Agreement — performance commitment',
  TTFB:  'Time to First Byte — server response time metric',
  WoW:   'Week over Week — comparison of the same metric between consecutive weeks',
  YoY:   'Year over Year — comparison of the same metric between the same period in consecutive years',
};

/**
 * Look up a glossary entry.
 */
export function glossaryLookup(abbreviation) {
  return METRIC_GLOSSARY[abbreviation.toUpperCase()] || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 100 · ENGINE BOOT SEQUENCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Boot the analytics engine and return a status object.
 * In a real application, this would initialise database connections,
 * load exchange rates from an API, verify licences, etc.
 */
export async function bootEngine(config = {}) {
  const merged = mergeConfig(config);
  const validation = validateEngineConfig(merged);

  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors,
      version: ENGINE_VERSION,
    };
  }

  const selfTestResults = runEngineSelfTest();
  const failed = selfTestResults.filter(r => !r.passed);

  return {
    success: failed.length === 0,
    version: ENGINE_VERSION,
    build: ENGINE_BUILD,
    config: merged,
    dateFormat: DATE_FORMAT,
    selfTest: {
      total: selfTestResults.length,
      passed: selfTestResults.filter(r => r.passed).length,
      failed: failed.map(r => r.name),
    },
    upcomingPromos: getUpcomingPromos(30),
    warnings: failed.length > 0 ? ['Self-test failures detected'] : [],
  };
}

/**
 * Gracefully shut down the engine (flush caches, close connections).
 * In production, this would do real cleanup.
 */
export async function shutdownEngine() {
  return { success: true, shutdownAt: new Date().toISOString() };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 101 · CURRENCY DETAILS TABLE
// ─────────────────────────────────────────────────────────────────────────────

export const CURRENCY_DETAILS = {
  USD: { name: 'US Dollar',           symbol: '$',    decimals: 2 },
  EUR: { name: 'Euro',                symbol: '€',    decimals: 2 },
  GBP: { name: 'British Pound',       symbol: '£',    decimals: 2 },
  CAD: { name: 'Canadian Dollar',     symbol: 'CA$',  decimals: 2 },
  AUD: { name: 'Australian Dollar',   symbol: 'A$',   decimals: 2 },
  JPY: { name: 'Japanese Yen',        symbol: '¥',    decimals: 0 },
  CNY: { name: 'Chinese Yuan',        symbol: '¥',    decimals: 2 },
  INR: { name: 'Indian Rupee',        symbol: '₹',    decimals: 2 },
  BRL: { name: 'Brazilian Real',      symbol: 'R$',   decimals: 2 },
  MXN: { name: 'Mexican Peso',        symbol: 'MX$',  decimals: 2 },
  SGD: { name: 'Singapore Dollar',    symbol: 'S$',   decimals: 2 },
  CHF: { name: 'Swiss Franc',         symbol: 'Fr.',  decimals: 2 },
  SEK: { name: 'Swedish Krona',       symbol: 'kr',   decimals: 2 },
  NOK: { name: 'Norwegian Krone',     symbol: 'kr',   decimals: 2 },
  DKK: { name: 'Danish Krone',        symbol: 'kr',   decimals: 2 },
  NZD: { name: 'New Zealand Dollar',  symbol: 'NZ$',  decimals: 2 },
  HKD: { name: 'Hong Kong Dollar',    symbol: 'HK$',  decimals: 2 },
  ZAR: { name: 'South African Rand',  symbol: 'R',    decimals: 2 },
  AED: { name: 'UAE Dirham',          symbol: 'AED',  decimals: 2 },
  SAR: { name: 'Saudi Riyal',         symbol: 'SAR',  decimals: 2 },
  PLN: { name: 'Polish Zloty',        symbol: 'zl',   decimals: 2 },
  CZK: { name: 'Czech Koruna',        symbol: 'Kc',   decimals: 2 },
  HUF: { name: 'Hungarian Forint',    symbol: 'Ft',   decimals: 0 },
  KRW: { name: 'South Korean Won',    symbol: 'W',    decimals: 0 },
  TWD: { name: 'Taiwan Dollar',       symbol: 'NT$',  decimals: 0 },
  IDR: { name: 'Indonesian Rupiah',   symbol: 'Rp',   decimals: 0 },
  MYR: { name: 'Malaysian Ringgit',   symbol: 'RM',   decimals: 2 },
  PHP: { name: 'Philippine Peso',     symbol: 'PHP',  decimals: 2 },
  THB: { name: 'Thai Baht',           symbol: 'THB',  decimals: 2 },
  VND: { name: 'Vietnamese Dong',     symbol: 'VND',  decimals: 0 },
  PKR: { name: 'Pakistani Rupee',     symbol: 'Rs',   decimals: 2 },
  NGN: { name: 'Nigerian Naira',      symbol: 'N',    decimals: 2 },
  CLP: { name: 'Chilean Peso',        symbol: '$',    decimals: 0 },
  COP: { name: 'Colombian Peso',      symbol: '$',    decimals: 2 },
  PEN: { name: 'Peruvian Sol',        symbol: 'S/',   decimals: 2 },
  ARS: { name: 'Argentine Peso',      symbol: '$',    decimals: 2 },
  TRY: { name: 'Turkish Lira',        symbol: 'TRY',  decimals: 2 },
  RUB: { name: 'Russian Ruble',       symbol: 'RUB',  decimals: 2 },
};

export function getCurrencyDetails(code) {
  return CURRENCY_DETAILS[code?.toUpperCase()] || null;
}

export function isSupportedCurrency(code) {
  return code?.toUpperCase() in CURRENCY_DETAILS;
}

export function listSupportedCurrencies() {
  return Object.entries(CURRENCY_DETAILS).map(([code, d]) => ({ code, name: d.name, symbol: d.symbol }));
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 102 · MISCELLANEOUS ANALYTICS HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function paretoSplit(items, valueKey) {
  const total = items.reduce((s, i) => s + (i[valueKey] || 0), 0);
  const sorted = [...items].sort((a, b) => (b[valueKey] || 0) - (a[valueKey] || 0));
  let cumulative = 0;
  let splitIndex = sorted.length;
  for (let i = 0; i < sorted.length; i++) {
    cumulative += sorted[i][valueKey] || 0;
    if (total > 0 && cumulative / total >= 0.80) { splitIndex = i + 1; break; }
  }
  return {
    top: sorted.slice(0, splitIndex),
    bottom: sorted.slice(splitIndex),
    topCount: splitIndex,
    topShare: total > 0 ? cumulative / total : 0,
    paretoRatio: items.length > 0 ? splitIndex / items.length : 0,
  };
}

export function herfindahlIndex(shares) {
  const total = shares.reduce((s, v) => s + v, 0);
  if (total === 0) return 0;
  return Math.round(shares.reduce((s, v) => s + (v / total * 100) ** 2, 0));
}

export function purchaseEntropy(categoryCounts) {
  const total = Object.values(categoryCounts).reduce((s, c) => s + c, 0);
  if (total === 0) return 0;
  let entropy = 0;
  for (const count of Object.values(categoryCounts)) {
    const p = count / total;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  return Math.round(entropy * 1000) / 1000;
}

export function cosineSimilarity(vecA, vecB) {
  const keys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  let dot = 0, magA = 0, magB = 0;
  for (const k of keys) {
    const a = vecA[k] || 0;
    const b = vecB[k] || 0;
    dot += a * b; magA += a * a; magB += b * b;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export function formatDashboardMetric(value, type = 'number') {
  if (type === 'currency') return formatCurrency(value);
  if (type === 'percent')  return formatPercent(value);
  if (type === 'large')    return abbreviateNumber(value);
  return formatNumber(value, 0);
}

export function generateSyntheticOrder(overrides = {}) {
  const id = `ORD-${randomId(8)}`;
  const sku = `SKU-${randomId(6).toUpperCase()}`;
  const qty = Math.ceil(Math.random() * 5);
  const price = roundCurrency(Math.random() * 200 + 10);
  const subtotal = roundCurrency(price * qty);
  const tax = roundCurrency(subtotal * DEFAULT_TAX_RATE);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : roundCurrency(Math.random() * 10 + 3);
  const total = roundCurrency(subtotal + tax + shipping);
  const states = Object.keys(STATE_TAX_RATES);
  const state = states[Math.floor(Math.random() * states.length)];
  const zip = String(Math.floor(Math.random() * 90000) + 10000);
  return {
    id, customerId: `CUST-${randomId(6)}`,
    createdAt: new Date(Date.now() - Math.random() * 90 * 86_400_000).toISOString(),
    status: STATUS_DELIVERED,
    items: [{ sku, title: `Product ${sku}`, quantity: qty, unitPrice: price, weight: Math.random() * 5 }],
    subtotal, discount: 0, tax, shippingCost: shipping, total,
    shippingAddress: { state, zip, country: 'US' },
    billingAddress:  { state, zip, country: 'US' },
    paymentMethod: PAYMENT_CARD, currency: DEFAULT_CURRENCY,
    acquisitionChannel: CHANNEL_DIRECT,
    ...overrides,
  };
}

export function generateSyntheticOrders(n = 100, overrides = {}) {
  return Array.from({ length: n }, () => generateSyntheticOrder(overrides));
}

export function generateSyntheticCustomer(overrides = {}) {
  const id = `CUST-${randomId(6)}`;
  const orderCount = Math.floor(Math.random() * 20);
  const lifetimeValue = roundCurrency(orderCount * (Math.random() * 150 + 30));
  return {
    id, email: `user${randomId(4)}@example.com`, name: `Test User ${id}`,
    orderCount, lifetimeValue,
    firstOrderAt: new Date(Date.now() - (orderCount * 30 + 60) * 86_400_000).toISOString(),
    lastOrderAt:  new Date(Date.now() - Math.random() * 90 * 86_400_000).toISOString(),
    currentPoints: Math.floor(lifetimeValue * LOYALTY_POINTS_PER_DOLLAR * Math.random()),
    lifetimePoints: Math.floor(lifetimeValue * LOYALTY_POINTS_PER_DOLLAR),
    createdAt: new Date(Date.now() - Math.random() * 365 * 86_400_000).toISOString(),
    ...overrides,
  };
}

export function generateSyntheticCustomers(n = 50) {
  return Array.from({ length: n }, () => generateSyntheticCustomer());
}

export async function bootEngine(config = {}) {
  const merged = mergeConfig(config);
  const validation = validateEngineConfig(merged);
  if (!validation.valid) return { success: false, errors: validation.errors, version: ENGINE_VERSION };
  const selfTestResults = runEngineSelfTest();
  const failed = selfTestResults.filter(r => !r.passed);
  return {
    success: failed.length === 0,
    version: ENGINE_VERSION,
    build: ENGINE_BUILD,
    config: merged,
    dateFormat: DATE_FORMAT,
    selfTest: {
      total: selfTestResults.length,
      passed: selfTestResults.filter(r => r.passed).length,
      failed: failed.map(r => r.name),
    },
    upcomingPromos: getUpcomingPromos(30),
  };
}

export async function shutdownEngine() {
  return { success: true, shutdownAt: new Date().toISOString() };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 103 · PROMOTIONAL CALENDAR EXTENDED
// ─────────────────────────────────────────────────────────────────────────────

export const PROMOTIONAL_CALENDAR = {
  NEW_YEARS:        { month: 1,  day: 1,  label: "New Year's Day",     expectedLift: 0.15 },
  VALENTINES:       { month: 2,  day: 14, label: "Valentine's Day",    expectedLift: 0.25 },
  ST_PATRICKS:      { month: 3,  day: 17, label: "St Patrick's Day",   expectedLift: 0.05 },
  EASTER_APPROX:    { month: 4,  day: 9,  label: 'Easter (approx)',    expectedLift: 0.10 },
  MOTHERS_DAY:      { month: 5,  day: 12, label: "Mother's Day",       expectedLift: 0.30 },
  MEMORIAL_DAY:     { month: 5,  day: 27, label: 'Memorial Day',       expectedLift: 0.20 },
  FATHERS_DAY:      { month: 6,  day: 16, label: "Father's Day",       expectedLift: 0.20 },
  INDEPENDENCE_DAY: { month: 7,  day: 4,  label: 'Independence Day',   expectedLift: 0.15 },
  LABOR_DAY:        { month: 9,  day: 2,  label: 'Labor Day',          expectedLift: 0.20 },
  HALLOWEEN:        { month: 10, day: 31, label: 'Halloween',          expectedLift: 0.15 },
  VETERANS_DAY:     { month: 11, day: 11, label: "Veterans Day",       expectedLift: 0.10 },
  THANKSGIVING:     { month: 11, day: 28, label: 'Thanksgiving',       expectedLift: 0.25 },
  BLACK_FRIDAY:     { month: 11, day: 29, label: 'Black Friday',       expectedLift: 1.50 },
  CYBER_MONDAY:     { month: 12, day: 2,  label: 'Cyber Monday',       expectedLift: 1.20 },
  CHRISTMAS:        { month: 12, day: 25, label: 'Christmas',          expectedLift: 0.50 },
  NEW_YEARS_EVE:    { month: 12, day: 31, label: "New Year's Eve",     expectedLift: 0.10 },
};

export function getUpcomingPromos(daysAhead = 30, now = new Date()) {
  const year = now.getFullYear();
  const upcoming = [];
  for (const [key, promo] of Object.entries(PROMOTIONAL_CALENDAR)) {
    const promoDate = new Date(year, promo.month - 1, promo.day);
    const daysUntil = (promoDate - now) / 86_400_000;
    if (daysUntil >= 0 && daysUntil <= daysAhead) {
      upcoming.push({
        key, label: promo.label,
        date: formatDate(promoDate),
        daysUntil: Math.round(daysUntil),
        expectedLift: promo.expectedLift,
      });
    }
  }
  return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
}

export function estimatePromoRevenueLift(baselineDailyRevenue, promoKey, days = 1) {
  const promo = PROMOTIONAL_CALENDAR[promoKey];
  if (!promo) return baselineDailyRevenue * days;
  return roundCurrency(baselineDailyRevenue * (1 + promo.expectedLift) * days);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 104 · METRIC GLOSSARY
// ─────────────────────────────────────────────────────────────────────────────

export const METRIC_GLOSSARY = {
  AOV:   'Average Order Value — total revenue divided by number of orders',
  ARR:   'Annual Recurring Revenue — MRR multiplied by 12',
  CAC:   'Customer Acquisition Cost — marketing spend divided by new customers',
  CLV:   'Customer Lifetime Value — total expected revenue from a customer',
  CR:    'Conversion Rate — orders divided by sessions',
  CTR:   'Click-Through Rate — clicks divided by impressions',
  COGS:  'Cost of Goods Sold — direct costs of products sold',
  EBITDA:'Earnings Before Interest, Taxes, Depreciation, and Amortisation',
  EOQ:   'Economic Order Quantity — optimal order size to minimise total inventory costs',
  GMV:   'Gross Merchandise Value — total value of goods sold',
  LTV:   'Lifetime Value — same as CLV',
  MoM:   'Month over Month growth comparison',
  MRR:   'Monthly Recurring Revenue — subscription revenue normalised to one month',
  NPS:   'Net Promoter Score — customer loyalty metric',
  NRR:   'Net Revenue Retention — revenue retained from existing customers',
  ROAS:  'Return on Ad Spend — revenue divided by advertising cost',
  ROI:   'Return on Investment — (revenue minus cost) divided by cost',
  RFM:   'Recency, Frequency, Monetary — customer segmentation framework',
  SKU:   'Stock Keeping Unit — unique product identifier',
  SLA:   'Service Level Agreement — performance commitment',
  WoW:   'Week over Week growth comparison',
  YoY:   'Year over Year growth comparison',
  HHI:   'Herfindahl-Hirschman Index — market concentration measure',
  IQR:   'Interquartile Range — statistical dispersion measure',
  AOH:   'Average Order Handling time in hours',
  DOSI:  'Days of Stock on Hand — inventory depth metric',
  DSO:   'Days Sales Outstanding — average collection period',
  FRP:   'Fill Rate Percentage — orders completed without backorder',
  OTD:   'On-Time Delivery rate',
  POR:   'Perfect Order Rate — orders that are on time, complete, and accurate',
};

export function glossaryLookup(abbreviation) {
  return METRIC_GLOSSARY[abbreviation?.toUpperCase()] || null;
}

export function searchGlossary(query) {
  const q = query.toLowerCase();
  return Object.entries(METRIC_GLOSSARY)
    .filter(([abbr, def]) => abbr.toLowerCase().includes(q) || def.toLowerCase().includes(q))
    .map(([abbreviation, definition]) => ({ abbreviation, definition }));
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 105 · FINAL UTILITY ADDITIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the Jaccard similarity between two sets.
 * Useful for comparing product tag overlap or customer purchase overlap.
 */
export function jaccardSimilarity(setA, setB) {
  const a = new Set(setA);
  const b = new Set(setB);
  const intersection = setIntersection(a, b).size;
  const union = setUnion(a, b).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Compute a simple edit distance (Levenshtein) between two strings.
 * Used for fuzzy matching of product names and SKUs.
 */
export function levenshteinDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Find products with similar names (fuzzy match by edit distance).
 */
export function fuzzyMatchProducts(query, products, maxDistance = 3) {
  return products
    .map(p => ({ product: p, distance: levenshteinDistance(query.toLowerCase(), p.title.toLowerCase()) }))
    .filter(x => x.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .map(x => x.product);
}

/**
 * Compute a simple moving standard deviation.
 */
export function movingStdDev(series, window = 7) {
  const result = [];
  for (let i = 0; i < series.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = series.slice(start, i + 1);
    result.push(Math.sqrt(variance(slice)));
  }
  return result;
}

/**
 * Compute Bollinger Bands from a time series.
 * Returns upper, middle (MA), and lower bands.
 */
export function bollingerBands(series, window = 20, multiplier = 2) {
  const ma = movingAverage(series, window);
  const stdDev = movingStdDev(series, window);
  return series.map((_, i) => ({
    value: series[i],
    middle: ma[i],
    upper:  ma[i] + multiplier * stdDev[i],
    lower:  ma[i] - multiplier * stdDev[i],
  }));
}

/**
 * Compute Z-score normalisation of a series.
 */
export function zScoreNormalise(series) {
  const mean = series.reduce((s, v) => s + v, 0) / series.length;
  const std  = Math.sqrt(variance(series));
  if (std === 0) return series.map(() => 0);
  return series.map(v => (v - mean) / std);
}

/**
 * Compute min-max normalisation (scale to [0, 1]).
 */
export function minMaxNormalise(series) {
  const min = Math.min(...series);
  const max = Math.max(...series);
  if (max === min) return series.map(() => 0);
  return series.map(v => (v - min) / (max - min));
}

/**
 * Compute a weighted moving average (more weight to recent values).
 */
export function weightedMovingAverage(series, window = 7) {
  const result = [];
  for (let i = 0; i < series.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = series.slice(start, i + 1);
    const weights = slice.map((_, j) => j + 1);
    const weightSum = weights.reduce((s, w) => s + w, 0);
    const wma = slice.reduce((s, v, j) => s + v * weights[j], 0) / weightSum;
    result.push(wma);
  }
  return result;
}

/**
 * Compute exponential moving average.
 */
export function exponentialMovingAverage(series, alpha = 0.2) {
  if (series.length === 0) return [];
  const result = [series[0]];
  for (let i = 1; i < series.length; i++) {
    result.push(alpha * series[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

/**
 * Detect trend direction in a time series.
 * Returns 'UP', 'DOWN', or 'FLAT'.
 */
export function detectTrend(series, sensitivity = 0.02) {
  if (series.length < 2) return 'FLAT';
  const reg = linearRegression(range(0, series.length), series);
  const relSlope = series[0] !== 0 ? reg.slope / Math.abs(series[0]) : 0;
  if (relSlope > sensitivity) return 'UP';
  if (relSlope < -sensitivity) return 'DOWN';
  return 'FLAT';
}

/**
 * Compute MACD (Moving Average Convergence Divergence).
 * Returns { macd, signal, histogram } arrays.
 */
export function computeMacd(series, fast = 12, slow = 26, signal = 9) {
  const emaFast = exponentialMovingAverage(series, 2 / (fast + 1));
  const emaSlow = exponentialMovingAverage(series, 2 / (slow + 1));
  const macd = emaFast.map((v, i) => v - emaSlow[i]);
  const signalLine = exponentialMovingAverage(macd, 2 / (signal + 1));
  const histogramLine = macd.map((v, i) => v - signalLine[i]);
  return { macd, signal: signalLine, histogram: histogramLine };
}

/**
 * Build an extended analytics object with all module references (final).
 */
export const FINAL_ENGINE_REGISTRY = {
  version: ENGINE_VERSION,
  build:   ENGINE_BUILD,
  totalSections: 105,
  coreModules: ['constants', 'validators', 'math', 'dates', 'loyalty', 'returns', 'coupons'],
  analyticModules: ['segmentation', 'abTesting', 'funnel', 'cohort', 'sessions', 'basket'],
  reportModules: ['pipeline', 'export', 'scheduling', 'alerts', 'benchmark'],
  utilModules: ['format', 'utils', 'cache', 'async', 'regression', 'selfTest'],
  specialisedModules: [
    'tax', 'fraud', 'fulfilment', 'dunning', 'pricing', 'supplyChain',
    'financial', 'subscriptions', 'inventory', 'geo', 'currency', 'reviews',
    'notifications', 'featureFlags', 'organisation', 'crossSell', 'territory',
    'shipping', 'catalogue', 'campaign', 'leadScoring', 'customerLtv',
    'merchandising', 'search', 'liveDashboard', 'signal',
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 106 · END-OF-FILE MARKER
// ─────────────────────────────────────────────────────────────────────────────
// Total sections: 106
// Engine: analytics.js
// Version: 4.2.1
// Build: 20240315
// Lines: ~10000
// This file is the single source of truth for all analytics engine logic.
// Do not split into multiple files without updating the import graph.
// All exports are documented in ENGINE_MANIFEST and FULL_MODULE_REGISTRY.
// ─────────────────────────────────────────────────────────────────────────────
// Key cross-file dependencies:
//   DATE_FORMAT (Section 1) ↔ parseDateStr (Section 12)
//   roundCurrency (Section 5) ↔ reconcileReport (Section 16)
// ─────────────────────────────────────────────────────────────────────────────

// Compatibility alias exports
export { formatCurrency as formatCurrencyValue };
export { roundCurrency as currency };
export { formatDate as dateToString };
export { parseDateStr as stringToDate };
export { validateSku as isValidSku };
export { validateEmail as isValidEmail };
export { validatePrice as isValidPrice };
export { validateQuantity as isValidQuantity };

// Default export: engine boot function
export default bootEngine;
