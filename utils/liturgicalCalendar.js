/**
 * Liturgical Calendar Service
 * Calculates the liturgical color for any given date according to the Catholic calendar
 */

// Import will be done dynamically to avoid circular dependencies
let LiturgicalColorOverride = null;
export function setOverrideModel(model) {
  LiturgicalColorOverride = model;
}

// Liturgical color definitions with hex codes
export const LITURGICAL_COLORS = {
  WHITE: {
    name: 'white',
    hex: '#ffffff',
    tailwind: {
      50: '#ffffff',
      100: '#f9fafb',
      200: '#f3f4f6',
      300: '#e5e7eb',
      400: '#d1d5db',
      500: '#9ca3af',
      600: '#6b7280',
      700: '#4b5563',
      800: '#374151',
      900: '#1f2937',
    }
  },
  RED: {
    name: 'red',
    hex: '#dc2626',
    tailwind: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    }
  },
  GREEN: {
    name: 'green',
    hex: '#16a34a',
    tailwind: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    }
  },
  PURPLE: {
    name: 'purple',
    hex: '#9333ea',
    tailwind: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7e22ce',
      800: '#6b21a8',
      900: '#581c87',
    }
  },
  ROSE: {
    name: 'rose',
    hex: '#e11d48',
    tailwind: {
      50: '#fff1f2',
      100: '#ffe4e6',
      200: '#fecdd3',
      300: '#fda4af',
      400: '#fb7185',
      500: '#f43f5e',
      600: '#e11d48',
      700: '#be123c',
      800: '#9f1239',
      900: '#881337',
    }
  },
  GOLD: {
    name: 'gold',
    hex: '#f59e0b',
    tailwind: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    }
  }
};

/**
 * Calculate Easter date using the Computus algorithm
 * @param {number} year - The year
 * @returns {Date} - Easter Sunday date
 */
function calculateEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
}

/**
 * Get the date of a specific Sunday in Advent
 * @param {number} year - The year
 * @param {number} sundayNumber - 1-4 for the Sunday of Advent
 * @returns {Date} - Date of the specified Sunday
 */
function getAdventSunday(year, sundayNumber) {
  const christmas = new Date(year, 11, 25); // December 25
  const dayOfWeek = christmas.getDay();
  
  // 4th Sunday of Advent is the Sunday before Christmas
  // If Christmas is Sunday (0), 4th Sunday is 7 days before (Dec 18)
  // If Christmas is Monday (1), 4th Sunday is 1 day before (Dec 24)
  // If Christmas is Saturday (6), 4th Sunday is 6 days before (Dec 19)
  let daysBefore = dayOfWeek === 0 ? 7 : dayOfWeek;
  const fourthSunday = new Date(christmas);
  fourthSunday.setDate(christmas.getDate() - daysBefore);
  
  // Calculate the requested Sunday (1st, 2nd, 3rd, or 4th)
  const requestedSunday = new Date(fourthSunday);
  requestedSunday.setDate(fourthSunday.getDate() - (4 - sundayNumber) * 7);
  
  return requestedSunday;
}

/**
 * Check if a date is in Advent
 * @param {Date} date - The date to check
 * @returns {boolean}
 */
function isAdvent(date) {
  const year = date.getFullYear();
  const firstSunday = getAdventSunday(year, 1);
  const christmas = new Date(year, 11, 25);
  
  return date >= firstSunday && date < christmas;
}

/**
 * Check if a date is in Christmas season
 * @param {Date} date - The date to check
 * @returns {boolean}
 */
function isChristmasSeason(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  // If we're in December, check this year's Christmas to next year's Epiphany
  // If we're in January, check last year's Christmas to this year's Epiphany
  let christmas, epiphany;
  if (month === 11) { // December
    christmas = new Date(year, 11, 25);
    epiphany = new Date(year + 1, 0, 6); // January 6 of next year
  } else if (month === 0) { // January
    christmas = new Date(year - 1, 11, 25); // December 25 of last year
    epiphany = new Date(year, 0, 6); // January 6 of this year
  } else {
    return false; // Not in Christmas season
  }
  
  // Calculate Baptism of the Lord (Sunday after Epiphany)
  const epiphanyDayOfWeek = epiphany.getDay();
  const baptism = new Date(epiphany);
  if (epiphanyDayOfWeek === 0) {
    // If Epiphany is Sunday, Baptism is the next Sunday
    baptism.setDate(epiphany.getDate() + 7);
  } else {
    // Otherwise, Baptism is the Sunday after Epiphany
    baptism.setDate(epiphany.getDate() + (7 - epiphanyDayOfWeek));
  }
  
  // Christmas season: Dec 25 to Baptism of the Lord (inclusive)
  return date >= christmas && date <= baptism;
}

/**
 * Check if a date is in Lent
 * @param {Date} date - The date to check
 * @param {Date} easter - Easter date for the year
 * @returns {boolean}
 */
function isLent(date, easter) {
  const ashWednesday = new Date(easter);
  ashWednesday.setDate(easter.getDate() - 46); // 46 days before Easter (40 days + 6 Sundays)
  
  const holyThursday = new Date(easter);
  holyThursday.setDate(easter.getDate() - 3);
  
  return date >= ashWednesday && date < holyThursday;
}

/**
 * Check if a date is Palm Sunday
 * @param {Date} date - The date to check
 * @param {Date} easter - Easter date for the year
 * @returns {boolean}
 */
function isPalmSunday(date, easter) {
  const palmSunday = new Date(easter);
  palmSunday.setDate(easter.getDate() - 7);
  
  return date.getTime() === new Date(palmSunday.getFullYear(), palmSunday.getMonth(), palmSunday.getDate()).getTime();
}

/**
 * Check if a date is Good Friday
 * @param {Date} date - The date to check
 * @param {Date} easter - Easter date for the year
 * @returns {boolean}
 */
function isGoodFriday(date, easter) {
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  
  return date.getTime() === new Date(goodFriday.getFullYear(), goodFriday.getMonth(), goodFriday.getDate()).getTime();
}

/**
 * Check if a date is Easter season
 * @param {Date} date - The date to check
 * @param {Date} easter - Easter date for the year
 * @returns {boolean}
 */
function isEasterSeason(date, easter) {
  const pentecost = new Date(easter);
  pentecost.setDate(easter.getDate() + 49); // 50 days after Easter (Pentecost Sunday)
  
  return date >= easter && date <= pentecost;
}

/**
 * Check if a date is Pentecost
 * @param {Date} date - The date to check
 * @param {Date} easter - Easter date for the year
 * @returns {boolean}
 */
function isPentecost(date, easter) {
  const pentecost = new Date(easter);
  pentecost.setDate(easter.getDate() + 49);
  
  return date.getTime() === new Date(pentecost.getFullYear(), pentecost.getMonth(), pentecost.getDate()).getTime();
}

/**
 * Check if a date is Gaudete Sunday (3rd Sunday of Advent)
 * @param {Date} date - The date to check
 * @returns {boolean}
 */
function isGaudeteSunday(date) {
  if (!isAdvent(date)) return false;
  
  const year = date.getFullYear();
  const thirdSunday = getAdventSunday(year, 3);
  
  return date.getTime() === new Date(thirdSunday.getFullYear(), thirdSunday.getMonth(), thirdSunday.getDate()).getTime();
}

/**
 * Check if a date is Laetare Sunday (4th Sunday of Lent)
 * @param {Date} date - The date to check
 * @param {Date} easter - Easter date for the year
 * @returns {boolean}
 */
function isLaetareSunday(date, easter) {
  if (!isLent(date, easter)) return false;
  
  const ashWednesday = new Date(easter);
  ashWednesday.setDate(easter.getDate() - 46);
  
  // Find the 4th Sunday of Lent
  let currentDate = new Date(ashWednesday);
  let sundayCount = 0;
  
  while (currentDate < easter) {
    if (currentDate.getDay() === 0) { // Sunday
      sundayCount++;
      if (sundayCount === 4) {
        return date.getTime() === new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).getTime();
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return false;
}

/**
 * Get the liturgical color for a specific date
 * @param {Date} date - The date to check (defaults to today)
 * @param {Object} override - Optional manual override object
 * @returns {Object} - Liturgical color object with name, hex, and tailwind colors
 */
export async function getLiturgicalColor(date = new Date(), override = null) {
  // Check for manual override first
  if (override) {
    const overrideColor = LITURGICAL_COLORS[override.color.toUpperCase()];
    if (overrideColor) {
      return overrideColor;
    }
  }
  
  // If model is available, check database for overrides
  if (LiturgicalColorOverride) {
    try {
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);
      const overrideDoc = await LiturgicalColorOverride.findOne({ date: dateOnly });
      if (overrideDoc) {
        const overrideColor = LITURGICAL_COLORS[overrideDoc.color.toUpperCase()];
        if (overrideColor) {
          return overrideColor;
        }
      }
    } catch (error) {
      console.error('Error checking for color override:', error);
      // Fall through to calculated color
    }
  }
  const year = date.getFullYear();
  const easter = calculateEaster(year);
  const easterNextYear = calculateEaster(year + 1);
  
  // Check for special days first
  if (isPalmSunday(date, easter) || isGoodFriday(date, easter) || isPentecost(date, easter)) {
    return LITURGICAL_COLORS.RED;
  }
  
  if (isGaudeteSunday(date)) {
    return LITURGICAL_COLORS.ROSE;
  }
  
  if (isLaetareSunday(date, easter)) {
    return LITURGICAL_COLORS.ROSE;
  }
  
  // Check seasons
  if (isEasterSeason(date, easter)) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  if (isChristmasSeason(date)) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  if (isLent(date, easter)) {
    return LITURGICAL_COLORS.PURPLE;
  }
  
  if (isAdvent(date)) {
    return LITURGICAL_COLORS.PURPLE;
  }
  
  // Check if we're between Epiphany and Lent, or after Pentecost
  const epiphany = new Date(year, 0, 6);
  
  // Calculate Baptism of the Lord to know when Ordinary Time starts after Christmas
  const epiphanyDayOfWeek = epiphany.getDay();
  const baptism = new Date(epiphany);
  if (epiphanyDayOfWeek === 0) {
    baptism.setDate(epiphany.getDate() + 7);
  } else {
    baptism.setDate(epiphany.getDate() + (7 - epiphanyDayOfWeek));
  }
  
  const ashWednesday = new Date(easter);
  ashWednesday.setDate(easter.getDate() - 46);
  
  const pentecost = new Date(easter);
  pentecost.setDate(easter.getDate() + 49);
  const firstSundayAdvent = getAdventSunday(year, 1);
  
  // Ordinary Time: After Baptism of the Lord until Lent, or after Pentecost until Advent
  if ((date > baptism && date < ashWednesday) || (date > pentecost && date < firstSundayAdvent)) {
    return LITURGICAL_COLORS.GREEN;
  }
  
  // Default to green (Ordinary Time)
  return LITURGICAL_COLORS.GREEN;
}

/**
 * Get liturgical color information for today
 * @returns {Promise<Object>} - Color info with name, hex, tailwind colors, and date
 */
export async function getTodayLiturgicalColor() {
  const today = new Date();
  const color = await getLiturgicalColor(today);
  
  return {
    color: color.name,
    hex: color.hex,
    tailwind: color.tailwind,
    date: today.toISOString().split('T')[0],
    timestamp: today.toISOString()
  };
}

