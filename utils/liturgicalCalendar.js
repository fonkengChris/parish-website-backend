/**
 * Liturgical Calendar Service
 * Calculates the liturgical color for any given date according to the Catholic calendar
 */

// Import will be done dynamically to avoid circular dependencies
let LiturgicalColorOverride = null;
let getSaintsForDate = null;
export function setOverrideModel(model) {
  LiturgicalColorOverride = model;
}
export function setSaintCalendarFunction(func) {
  getSaintsForDate = func;
}

// Liturgical color definitions with hex codes
// Colors optimized for better contrast ratios (WCAG AA compliant: 4.5:1 for normal text, 3:1 for large text)
export const LITURGICAL_COLORS = {
  WHITE: {
    name: 'white',
    hex: '#ffffff',
    tailwind: {
      50: '#ffffff',  // White background - use dark text (700-900)
      100: '#f8f9fa', // Very light gray - use dark text (700-900)
      200: '#e9ecef', // Light gray - use dark text (700-900)
      300: '#dee2e6', // Medium-light gray - use dark text (800-900)
      400: '#ced4da', // Medium gray - use dark text (800-900)
      500: '#868e96', // Medium-dark gray - use white text
      600: '#495057', // Dark gray - use white text
      700: '#343a40', // Very dark gray - use white text
      800: '#212529', // Almost black - use white text
      900: '#1a1d21', // Black - use white text
    }
  },
  RED: {
    name: 'red',
    hex: '#c41e3a', // Darker red for better contrast
    tailwind: {
      50: '#fff5f5',  // Very light red - use dark text (700-900)
      100: '#ffe0e0', // Light red - use dark text (700-900)
      200: '#ffcccc', // Light-medium red - use dark text (800-900)
      300: '#ff9999', // Medium red - use dark text (800-900)
      400: '#ff6666', // Medium-dark red - use dark text (900)
      500: '#e63946', // Bright red - use white text
      600: '#c41e3a', // Dark red - use white text
      700: '#a01d2e', // Very dark red - use white text
      800: '#7d1622', // Darker red - use white text
      900: '#5a0f18', // Darkest red - use white text
    }
  },
  GREEN: {
    name: 'green',
    hex: '#0d7a3d', // Darker green for better contrast
    tailwind: {
      50: '#f0fdf4',  // Very light green - use dark text (700-900)
      100: '#dcfce7', // Light green - use dark text (700-900)
      200: '#bbf7d0', // Light-medium green - use dark text (800-900)
      300: '#86efac', // Medium green - use dark text (800-900)
      400: '#4ade80', // Medium-dark green - use dark text (900)
      500: '#22c55e', // Bright green - use white text
      600: '#0d7a3d', // Dark green - use white text
      700: '#0a5d2e', // Very dark green - use white text
      800: '#084025', // Darker green - use white text
      900: '#052e1a', // Darkest green - use white text
    }
  },
  PURPLE: {
    name: 'purple',
    hex: '#7c2d9a', // Darker purple for better contrast
    tailwind: {
      50: '#faf5ff',  // Very light purple - use dark text (700-900)
      100: '#f3e8ff', // Light purple - use dark text (700-900)
      200: '#e9d5ff', // Light-medium purple - use dark text (800-900)
      300: '#d8b4fe', // Medium purple - use dark text (800-900)
      400: '#c084fc', // Medium-dark purple - use dark text (900)
      500: '#a855f7', // Bright purple - use white text
      600: '#7c2d9a', // Dark purple - use white text
      700: '#6b1f7e', // Very dark purple - use white text
      800: '#561866', // Darker purple - use white text
      900: '#40114d', // Darkest purple - use white text
    }
  },
  ROSE: {
    name: 'rose',
    hex: '#c2185b', // Darker rose for better contrast
    tailwind: {
      50: '#fff1f2',  // Very light rose - use dark text (700-900)
      100: '#ffe4e6', // Light rose - use dark text (700-900)
      200: '#fecdd3', // Light-medium rose - use dark text (800-900)
      300: '#fda4af', // Medium rose - use dark text (800-900)
      400: '#fb7185', // Medium-dark rose - use dark text (900)
      500: '#f43f5e', // Bright rose - use white text
      600: '#c2185b', // Dark rose - use white text
      700: '#a0144a', // Very dark rose - use white text
      800: '#7e1038', // Darker rose - use white text
      900: '#5c0c29', // Darkest rose - use white text
    }
  },
  GOLD: {
    name: 'gold',
    hex: '#b8860b', // Darker gold for better contrast
    tailwind: {
      50: '#fffbeb',  // Very light gold - use dark text (700-900)
      100: '#fef3c7', // Light gold - use dark text (700-900)
      200: '#fde68a', // Light-medium gold - use dark text (800-900)
      300: '#fcd34d', // Medium gold - use dark text (800-900)
      400: '#fbbf24', // Medium-dark gold - use dark text (900)
      500: '#f59e0b', // Bright gold - use dark text (900)
      600: '#b8860b', // Dark gold - use white text
      700: '#9a7209', // Very dark gold - use white text
      800: '#7c5d07', // Darker gold - use white text
      900: '#5e4705', // Darkest gold - use white text
    }
  }
};

/**
 * Calculate Easter date using the Computus algorithm
 * @param {number} year - The year
 * @returns {Date} - Easter Sunday date
 */
export function calculateEaster(year) {
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
export function getAdventSunday(year, sundayNumber) {
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
export function isAdvent(date) {
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
export function isChristmasSeason(date) {
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
export function isLent(date, easter) {
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
export function isPalmSunday(date, easter) {
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
export function isGoodFriday(date, easter) {
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
export function isEasterSeason(date, easter) {
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
export function isPentecost(date, easter) {
  const pentecost = new Date(easter);
  pentecost.setDate(easter.getDate() + 49);
  
  return date.getTime() === new Date(pentecost.getFullYear(), pentecost.getMonth(), pentecost.getDate()).getTime();
}

/**
 * Check if a date is Gaudete Sunday (3rd Sunday of Advent)
 * @param {Date} date - The date to check
 * @returns {boolean}
 */
export function isGaudeteSunday(date) {
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
export function isLaetareSunday(date, easter) {
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
  const month = date.getMonth();
  const day = date.getDate();
  
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
  
  // Check for major feasts that override season colors
  // These solemnities and feasts take precedence over the season
  
  // First, check if there's a feast on this date that should override
  if (getSaintsForDate) {
    try {
      const saints = getSaintsForDate(date);
      if (saints && saints.length > 0) {
        const feast = saints[0];
        
        // Feasts of the Lord always override season colors (white)
        if (feast.type === 'feast' && (
          feast.name.includes('Lord') ||
          feast.name.includes('Presentation') ||
          feast.name.includes('Transfiguration') ||
          feast.name.includes('Annunciation') ||
          feast.name.includes('Visitation') ||
          feast.name.includes('Exaltation') ||
          feast.name.includes('Dedication')
        )) {
          return LITURGICAL_COLORS.WHITE;
        }
        
        // Major Marian feasts override season colors (white)
        if (feast.type === 'feast' && (
          feast.name.includes('Mary') ||
          feast.name.includes('Mother of God') ||
          feast.name.includes('Immaculate Conception') ||
          feast.name.includes('Assumption') ||
          feast.name.includes('Guadalupe') ||
          feast.name.includes('Nativity of the Blessed Virgin')
        )) {
          return LITURGICAL_COLORS.WHITE;
        }
        
        // Major Apostle feasts override season colors (white)
        // Since we're checking type === 'feast', memorials are already excluded
        // All apostle feasts in the calendar are type 'feast', so this is safe
        if (feast.type === 'feast' && (
          feast.name.includes('Peter and Paul') ||
          feast.name.includes('Chair of Saint Peter') ||
          feast.name.includes('Conversion of Saint Paul') ||
          feast.name.includes('Saints Philip and James') ||
          feast.name.includes('Saints Simon and Jude') ||
          feast.name.includes('Saint Andrew') ||
          (feast.name.includes('Saint Thomas') && feast.description && feast.description.includes('Apostle')) ||
          (feast.name.includes('Saint James') && feast.description && feast.description.includes('Apostle')) ||
          feast.name.includes('Saint Bartholomew') ||
          (feast.name.includes('Saint Matthew') && feast.description && feast.description.includes('Apostle')) ||
          feast.name.includes('Saint Mark') ||
          feast.name.includes('Saint Luke') ||
          (feast.name.includes('Saint John') && feast.description && (feast.description.includes('Apostle') || feast.description.includes('Evangelist'))) ||
          feast.name.includes('Saint Matthias')
        )) {
          return LITURGICAL_COLORS.WHITE;
        }
        
        // Other major feasts that override season colors
        if (feast.type === 'feast' && (
          feast.name.includes('All Saints') ||
          feast.name.includes('Nativity of Saint John the Baptist') ||
          feast.name.includes('Saints Michael, Gabriel, and Raphael') ||
          feast.name.includes('Saint Lawrence') ||
          feast.name.includes('Saint Mary Magdalene')
        )) {
          return LITURGICAL_COLORS.WHITE;
        }
      }
    } catch (error) {
      console.error('Error checking saints for date:', error);
      // Fall through to hardcoded checks
    }
  }
  
  // Hardcoded checks for specific feasts (fallback if saint calendar not available)
  // Immaculate Conception (December 8) - Solemnity, white even during Advent
  if (month === 11 && day === 8) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // Our Lady of Guadalupe (December 12) - Feast, white even during Advent
  if (month === 11 && day === 12) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // Saint Joseph (March 19) - Solemnity, white even during Lent
  if (month === 2 && day === 19) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // Annunciation (March 25) - Solemnity, white even during Lent
  if (month === 2 && day === 25) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // The Presentation of the Lord (February 2) - Feast, white even during Ordinary Time
  if (month === 1 && day === 2) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // Epiphany (January 6) - Feast of the Lord, white
  if (month === 0 && day === 6) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // Mary, Mother of God (January 1) - Solemnity, white
  if (month === 0 && day === 1) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // The Transfiguration of the Lord (August 6) - Feast, white
  if (month === 7 && day === 6) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // The Assumption of the Blessed Virgin Mary (August 15) - Solemnity, white
  if (month === 7 && day === 15) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // The Nativity of the Blessed Virgin Mary (September 8) - Feast, white
  if (month === 8 && day === 8) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // The Exaltation of the Holy Cross (September 14) - Feast, white
  if (month === 8 && day === 14) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // All Saints (November 1) - Solemnity, white
  if (month === 10 && day === 1) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // All Souls (November 2) - Commemoration, but typically uses purple/black, not white
  // However, it can override green in Ordinary Time - but we'll use purple/black instead
  // if (month === 10 && day === 2) {
  //   return LITURGICAL_COLORS.PURPLE; // Or black if available
  // }
  
  // The Dedication of the Lateran Basilica (November 9) - Feast, white
  if (month === 10 && day === 9) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // Saints Peter and Paul (June 29) - Solemnity, white
  if (month === 5 && day === 29) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // The Nativity of Saint John the Baptist (June 24) - Solemnity, white
  if (month === 5 && day === 24) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // The Chair of Saint Peter the Apostle (February 22) - Feast, white
  if (month === 1 && day === 22) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // The Conversion of Saint Paul the Apostle (January 25) - Feast, white
  if (month === 0 && day === 25) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // The Visitation of the Blessed Virgin Mary (May 31) - Feast, white
  if (month === 4 && day === 31) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // Saints Philip and James (May 3) - Feast, white
  if (month === 4 && day === 3) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // Saint Matthias (May 14) - Feast, white
  if (month === 4 && day === 14) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // Saint Thomas (July 3) - Feast, white
  if (month === 6 && day === 3) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // Saint James (July 25) - Feast, white
  if (month === 6 && day === 25) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // Saint Mary Magdalene (July 22) - Feast, white
  if (month === 6 && day === 22) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // Saint Bartholomew (August 24) - Feast, white
  if (month === 7 && day === 24) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // Saint Matthew (September 21) - Feast, white
  if (month === 8 && day === 21) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // Saints Michael, Gabriel, and Raphael (September 29) - Feast, white
  if (month === 8 && day === 29) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // Saint Luke (October 18) - Feast, white
  if (month === 9 && day === 18) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // Saints Simon and Jude (October 28) - Feast, white
  if (month === 9 && day === 28) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // Saint Andrew (November 30) - Feast, white
  if (month === 10 && day === 30) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // Saint Mark (April 25) - Feast, white
  if (month === 3 && day === 25) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // Saint Lawrence (August 10) - Feast, white
  if (month === 7 && day === 10) {
    return LITURGICAL_COLORS.WHITE;
  }
  
  // Christmas octave feasts (December 26-28) - white (already in Christmas season, but explicit)
  if (month === 11 && (day === 26 || day === 27 || day === 28)) {
    return LITURGICAL_COLORS.WHITE;
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

