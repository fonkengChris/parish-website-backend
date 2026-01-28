/**
 * Saint Calendar Service
 * Provides information about saints and feasts for any given date
 */

import {
  calculateEaster,
  getAdventSunday,
  isAdvent,
  isChristmasSeason,
  isLent,
  isEasterSeason,
  isPalmSunday,
  isGoodFriday,
  isPentecost,
  isGaudeteSunday,
  isLaetareSunday
} from './liturgicalCalendar.js';

/**
 * Comprehensive calendar of saints organized by month and day
 * Format: { month: { day: [{ name, type, description }] } }
 * type: 'saint', 'feast', 'memorial', 'optional'
 */
const SAINT_CALENDAR = {
  1: { // January
    1: [{ name: 'Mary, Mother of God', type: 'feast', description: 'Solemnity of Mary, the Holy Mother of God' }],
    2: [{ name: 'Saints Basil the Great and Gregory Nazianzen', type: 'memorial', description: 'Bishops and Doctors of the Church' }],
    3: [{ name: 'The Most Holy Name of Jesus', type: 'optional', description: 'Optional Memorial' }],
    6: [{ name: 'Epiphany of the Lord', type: 'feast', description: 'The manifestation of Christ to the Magi' }],
    7: [{ name: 'Saint Raymond of Penyafort', type: 'optional', description: 'Priest' }],
    13: [{ name: 'Saint Hilary', type: 'optional', description: 'Bishop and Doctor of the Church' }],
    17: [{ name: 'Saint Anthony', type: 'memorial', description: 'Abbot' }],
    20: [{ name: 'Saint Fabian', type: 'optional', description: 'Pope and Martyr' }],
    21: [{ name: 'Saint Agnes', type: 'memorial', description: 'Virgin and Martyr' }],
    22: [{ name: 'Saint Vincent', type: 'optional', description: 'Deacon and Martyr' }],
    24: [{ name: 'Saint Francis de Sales', type: 'memorial', description: 'Bishop and Doctor of the Church' }],
    25: [{ name: 'The Conversion of Saint Paul the Apostle', type: 'feast', description: 'Apostle' }],
    26: [{ name: 'Saints Timothy and Titus', type: 'memorial', description: 'Bishops' }],
    27: [{ name: 'Saint Angela Merici', type: 'optional', description: 'Virgin' }],
    28: [{ name: 'Saint Thomas Aquinas', type: 'memorial', description: 'Priest and Doctor of the Church' }],
    31: [{ name: 'Saint John Bosco', type: 'memorial', description: 'Priest' }],
  },
  2: { // February
    2: [{ name: 'The Presentation of the Lord', type: 'feast', description: 'Candlemas' }],
    3: [{ name: 'Saint Blaise', type: 'optional', description: 'Bishop and Martyr' }],
    5: [{ name: 'Saint Agatha', type: 'memorial', description: 'Virgin and Martyr' }],
    6: [{ name: 'Saint Paul Miki and Companions', type: 'memorial', description: 'Martyrs' }],
    8: [{ name: 'Saint Jerome Emiliani', type: 'optional', description: 'Priest' }],
    10: [{ name: 'Saint Scholastica', type: 'memorial', description: 'Virgin' }],
    11: [{ name: 'Our Lady of Lourdes', type: 'optional', description: 'Optional Memorial' }],
    14: [{ name: 'Saints Cyril and Methodius', type: 'memorial', description: 'Bishops' }],
    17: [{ name: 'The Seven Founders of the Servite Order', type: 'optional', description: 'Religious' }],
    21: [{ name: 'Saint Peter Damian', type: 'optional', description: 'Bishop and Doctor of the Church' }],
    22: [{ name: 'The Chair of Saint Peter the Apostle', type: 'feast', description: 'Apostle' }],
    23: [{ name: 'Saint Polycarp', type: 'memorial', description: 'Bishop and Martyr' }],
  },
  3: { // March
    4: [{ name: 'Saint Casimir', type: 'optional', description: 'Confessor' }],
    7: [{ name: 'Saints Perpetua and Felicity', type: 'memorial', description: 'Martyrs' }],
    8: [{ name: 'Saint John of God', type: 'optional', description: 'Religious' }],
    9: [{ name: 'Saint Frances of Rome', type: 'optional', description: 'Religious' }],
    17: [{ name: 'Saint Patrick', type: 'memorial', description: 'Bishop' }],
    18: [{ name: 'Saint Cyril of Jerusalem', type: 'optional', description: 'Bishop and Doctor of the Church' }],
    19: [{ name: 'Saint Joseph, Spouse of the Blessed Virgin Mary', type: 'feast', description: 'Patron of the Universal Church' }],
    23: [{ name: 'Saint Turibius of Mogrovejo', type: 'optional', description: 'Bishop' }],
    25: [{ name: 'The Annunciation of the Lord', type: 'feast', description: 'The Angel Gabriel announces to Mary' }],
  },
  4: { // April
    2: [{ name: 'Saint Francis of Paola', type: 'optional', description: 'Hermit' }],
    4: [{ name: 'Saint Isidore', type: 'optional', description: 'Bishop and Doctor of the Church' }],
    5: [{ name: 'Saint Vincent Ferrer', type: 'optional', description: 'Priest' }],
    7: [{ name: 'Saint John Baptist de la Salle', type: 'memorial', description: 'Priest' }],
    11: [{ name: 'Saint Stanislaus', type: 'memorial', description: 'Bishop and Martyr' }],
    13: [{ name: 'Saint Martin I', type: 'optional', description: 'Pope and Martyr' }],
    21: [{ name: 'Saint Anselm', type: 'optional', description: 'Bishop and Doctor of the Church' }],
    23: [{ name: 'Saint George', type: 'optional', description: 'Martyr' }],
    24: [{ name: 'Saint Fidelis of Sigmaringen', type: 'optional', description: 'Priest and Martyr' }],
    25: [{ name: 'Saint Mark', type: 'feast', description: 'Evangelist' }],
    28: [{ name: 'Saint Peter Chanel', type: 'optional', description: 'Priest and Martyr' }],
    29: [{ name: 'Saint Catherine of Siena', type: 'memorial', description: 'Virgin and Doctor of the Church' }],
    30: [{ name: 'Saint Pius V', type: 'optional', description: 'Pope' }],
  },
  5: { // May
    1: [{ name: 'Saint Joseph the Worker', type: 'optional', description: 'Patron of Workers' }],
    2: [{ name: 'Saint Athanasius', type: 'memorial', description: 'Bishop and Doctor of the Church' }],
    3: [{ name: 'Saints Philip and James', type: 'feast', description: 'Apostles' }],
    10: [{ name: 'Saint John of Avila', type: 'optional', description: 'Priest and Doctor of the Church' }],
    12: [{ name: 'Saints Nereus and Achilleus', type: 'optional', description: 'Martyrs' }],
    13: [{ name: 'Our Lady of Fatima', type: 'optional', description: 'Optional Memorial' }],
    14: [{ name: 'Saint Matthias', type: 'feast', description: 'Apostle' }],
    18: [{ name: 'Saint John I', type: 'optional', description: 'Pope and Martyr' }],
    20: [{ name: 'Saint Bernardine of Siena', type: 'optional', description: 'Priest' }],
    21: [{ name: 'Saint Christopher Magallanes and Companions', type: 'optional', description: 'Martyrs' }],
    22: [{ name: 'Saint Rita of Cascia', type: 'optional', description: 'Religious' }],
    25: [{ name: 'Saint Bede the Venerable', type: 'optional', description: 'Priest and Doctor of the Church' }],
    26: [{ name: 'Saint Philip Neri', type: 'memorial', description: 'Priest' }],
    27: [{ name: 'Saint Augustine of Canterbury', type: 'optional', description: 'Bishop' }],
    31: [{ name: 'The Visitation of the Blessed Virgin Mary', type: 'feast', description: 'Mary visits Elizabeth' }],
  },
  6: { // June
    1: [{ name: 'Saint Justin', type: 'memorial', description: 'Martyr' }],
    2: [{ name: 'Saints Marcellinus and Peter', type: 'optional', description: 'Martyrs' }],
    3: [{ name: 'Saints Charles Lwanga and Companions', type: 'memorial', description: 'Martyrs' }],
    5: [{ name: 'Saint Boniface', type: 'memorial', description: 'Bishop and Martyr' }],
    6: [{ name: 'Saint Norbert', type: 'optional', description: 'Bishop' }],
    9: [{ name: 'Saint Ephrem', type: 'optional', description: 'Deacon and Doctor of the Church' }],
    11: [{ name: 'Saint Barnabas', type: 'memorial', description: 'Apostle' }],
    13: [{ name: 'Saint Anthony of Padua', type: 'memorial', description: 'Priest and Doctor of the Church' }],
    19: [{ name: 'Saint Romuald', type: 'optional', description: 'Abbot' }],
    21: [{ name: 'Saint Aloysius Gonzaga', type: 'memorial', description: 'Religious' }],
    22: [{ name: 'Saints John Fisher and Thomas More', type: 'optional', description: 'Martyrs' }],
    24: [{ name: 'The Nativity of Saint John the Baptist', type: 'feast', description: 'Forerunner of Christ' }],
    27: [{ name: 'Saint Cyril of Alexandria', type: 'optional', description: 'Bishop and Doctor of the Church' }],
    28: [{ name: 'Saint Irenaeus', type: 'memorial', description: 'Bishop and Martyr' }],
    29: [{ name: 'Saints Peter and Paul', type: 'feast', description: 'Apostles' }],
    30: [{ name: 'The First Martyrs of the Church of Rome', type: 'optional', description: 'Martyrs' }],
  },
  7: { // July
    3: [{ name: 'Saint Thomas', type: 'feast', description: 'Apostle' }],
    4: [{ name: 'Saint Elizabeth of Portugal', type: 'optional', description: 'Queen' }],
    5: [{ name: 'Saint Anthony Zaccaria', type: 'optional', description: 'Priest' }],
    6: [{ name: 'Saint Maria Goretti', type: 'optional', description: 'Virgin and Martyr' }],
    11: [{ name: 'Saint Benedict', type: 'memorial', description: 'Abbot, Patron of Europe' }],
    13: [{ name: 'Saint Henry', type: 'optional', description: 'Emperor' }],
    14: [{ name: 'Saint Kateri Tekakwitha', type: 'optional', description: 'Virgin' }],
    15: [{ name: 'Saint Bonaventure', type: 'memorial', description: 'Bishop and Doctor of the Church' }],
    16: [{ name: 'Our Lady of Mount Carmel', type: 'optional', description: 'Optional Memorial' }],
    20: [{ name: 'Saint Apollinaris', type: 'optional', description: 'Bishop and Martyr' }],
    21: [{ name: 'Saint Lawrence of Brindisi', type: 'optional', description: 'Priest and Doctor of the Church' }],
    22: [{ name: 'Saint Mary Magdalene', type: 'feast', description: 'Apostle to the Apostles' }],
    23: [{ name: 'Saint Bridget', type: 'optional', description: 'Religious' }],
    24: [{ name: 'Saint Sharbel Makhluf', type: 'optional', description: 'Priest' }],
    25: [{ name: 'Saint James', type: 'feast', description: 'Apostle' }],
    26: [{ name: 'Saints Joachim and Anne', type: 'memorial', description: 'Parents of the Blessed Virgin Mary' }],
    29: [{ name: 'Saints Martha, Mary, and Lazarus', type: 'memorial', description: 'Friends of Jesus' }],
    30: [{ name: 'Saint Peter Chrysologus', type: 'optional', description: 'Bishop and Doctor of the Church' }],
    31: [{ name: 'Saint Ignatius of Loyola', type: 'memorial', description: 'Priest' }],
  },
  8: { // August
    1: [{ name: 'Saint Alphonsus Liguori', type: 'memorial', description: 'Bishop and Doctor of the Church' }],
    2: [{ name: 'Saint Eusebius of Vercelli', type: 'optional', description: 'Bishop' }],
    4: [{ name: 'Saint John Vianney', type: 'memorial', description: 'Priest, Patron of Parish Priests' }],
    5: [{ name: 'The Dedication of the Basilica of Saint Mary Major', type: 'optional', description: 'Optional Memorial' }],
    6: [{ name: 'The Transfiguration of the Lord', type: 'feast', description: 'Jesus is transfigured on Mount Tabor' }],
    7: [{ name: 'Saint Sixtus II', type: 'optional', description: 'Pope and Martyr' }],
    8: [{ name: 'Saint Dominic', type: 'memorial', description: 'Priest' }],
    9: [{ name: 'Saint Teresa Benedicta of the Cross', type: 'optional', description: 'Virgin and Martyr' }],
    10: [{ name: 'Saint Lawrence', type: 'feast', description: 'Deacon and Martyr' }],
    11: [{ name: 'Saint Clare', type: 'memorial', description: 'Virgin' }],
    13: [{ name: 'Saints Pontian and Hippolytus', type: 'optional', description: 'Martyrs' }],
    14: [{ name: 'Saint Maximilian Kolbe', type: 'memorial', description: 'Priest and Martyr' }],
    15: [{ name: 'The Assumption of the Blessed Virgin Mary', type: 'feast', description: 'Mary is taken body and soul into heaven' }],
    16: [{ name: 'Saint Stephen of Hungary', type: 'optional', description: 'King' }],
    19: [{ name: 'Saint John Eudes', type: 'optional', description: 'Priest' }],
    20: [{ name: 'Saint Bernard', type: 'memorial', description: 'Abbot and Doctor of the Church' }],
    21: [{ name: 'Saint Pius X', type: 'memorial', description: 'Pope' }],
    22: [{ name: 'The Queenship of the Blessed Virgin Mary', type: 'memorial', description: 'Optional Memorial' }],
    23: [{ name: 'Saint Rose of Lima', type: 'optional', description: 'Virgin' }],
    24: [{ name: 'Saint Bartholomew', type: 'feast', description: 'Apostle' }],
    25: [{ name: 'Saint Louis', type: 'optional', description: 'King' }],
    27: [{ name: 'Saint Monica', type: 'memorial', description: 'Mother of Saint Augustine' }],
    28: [{ name: 'Saint Augustine', type: 'memorial', description: 'Bishop and Doctor of the Church' }],
    29: [{ name: 'The Passion of Saint John the Baptist', type: 'memorial', description: 'Martyr' }],
  },
  9: { // September
    3: [{ name: 'Saint Gregory the Great', type: 'memorial', description: 'Pope and Doctor of the Church' }],
    8: [{ name: 'The Nativity of the Blessed Virgin Mary', type: 'feast', description: 'Birth of Mary' }],
    9: [{ name: 'Saint Peter Claver', type: 'optional', description: 'Priest' }],
    12: [{ name: 'The Most Holy Name of Mary', type: 'optional', description: 'Optional Memorial' }],
    13: [{ name: 'Saint John Chrysostom', type: 'memorial', description: 'Bishop and Doctor of the Church' }],
    14: [{ name: 'The Exaltation of the Holy Cross', type: 'feast', description: 'Triumph of the Cross' }],
    15: [{ name: 'Our Lady of Sorrows', type: 'memorial', description: 'Optional Memorial' }],
    16: [{ name: 'Saints Cornelius and Cyprian', type: 'optional', description: 'Martyrs' }],
    17: [{ name: 'Saint Robert Bellarmine', type: 'optional', description: 'Bishop and Doctor of the Church' }],
    19: [{ name: 'Saint Januarius', type: 'optional', description: 'Bishop and Martyr' }],
    20: [{ name: 'Saints Andrew Kim Taegon, Paul Chong Hasang, and Companions', type: 'memorial', description: 'Martyrs' }],
    21: [{ name: 'Saint Matthew', type: 'feast', description: 'Apostle and Evangelist' }],
    23: [{ name: 'Saint Pius of Pietrelcina', type: 'memorial', description: 'Priest' }],
    26: [{ name: 'Saints Cosmas and Damian', type: 'optional', description: 'Martyrs' }],
    27: [{ name: 'Saint Vincent de Paul', type: 'memorial', description: 'Priest' }],
    28: [{ name: 'Saint Wenceslaus', type: 'optional', description: 'Martyr' }],
    29: [{ name: 'Saints Michael, Gabriel, and Raphael', type: 'feast', description: 'Archangels' }],
    30: [{ name: 'Saint Jerome', type: 'memorial', description: 'Priest and Doctor of the Church' }],
  },
  10: { // October
    1: [{ name: 'Saint Thérèse of the Child Jesus', type: 'memorial', description: 'Virgin and Doctor of the Church' }],
    2: [{ name: 'The Holy Guardian Angels', type: 'memorial', description: 'Optional Memorial' }],
    4: [{ name: 'Saint Francis of Assisi', type: 'memorial', description: 'Founder of the Franciscans' }],
    5: [{ name: 'Saint Faustina Kowalska', type: 'optional', description: 'Virgin' }],
    6: [{ name: 'Saint Bruno', type: 'optional', description: 'Priest' }],
    7: [{ name: 'Our Lady of the Rosary', type: 'memorial', description: 'Optional Memorial' }],
    9: [{ name: 'Saint Denis and Companions', type: 'optional', description: 'Martyrs' }],
    11: [{ name: 'Saint John XXIII', type: 'optional', description: 'Pope' }],
    14: [{ name: 'Saint Callistus I', type: 'optional', description: 'Pope and Martyr' }],
    15: [{ name: 'Saint Teresa of Jesus', type: 'memorial', description: 'Virgin and Doctor of the Church' }],
    16: [{ name: 'Saint Hedwig', type: 'optional', description: 'Religious' }],
    17: [{ name: 'Saint Ignatius of Antioch', type: 'memorial', description: 'Bishop and Martyr' }],
    18: [{ name: 'Saint Luke', type: 'feast', description: 'Evangelist' }],
    19: [{ name: 'Saints John de Brébeuf and Isaac Jogues', type: 'optional', description: 'Priests and Martyrs' }],
    22: [{ name: 'Saint John Paul II', type: 'optional', description: 'Pope' }],
    23: [{ name: 'Saint John of Capistrano', type: 'optional', description: 'Priest' }],
    24: [{ name: 'Saint Anthony Mary Claret', type: 'optional', description: 'Bishop' }],
    28: [{ name: 'Saints Simon and Jude', type: 'feast', description: 'Apostles' }],
  },
  11: { // November
    1: [{ name: 'All Saints', type: 'feast', description: 'Solemnity of All Saints' }],
    2: [{ name: 'All Souls', type: 'feast', description: 'The Commemoration of All the Faithful Departed' }],
    3: [{ name: 'Saint Martin de Porres', type: 'optional', description: 'Religious' }],
    4: [{ name: 'Saint Charles Borromeo', type: 'memorial', description: 'Bishop' }],
    9: [{ name: 'The Dedication of the Lateran Basilica', type: 'feast', description: 'Mother and Head of all Churches' }],
    10: [{ name: 'Saint Leo the Great', type: 'memorial', description: 'Pope and Doctor of the Church' }],
    11: [{ name: 'Saint Martin of Tours', type: 'memorial', description: 'Bishop' }],
    12: [{ name: 'Saint Josaphat', type: 'memorial', description: 'Bishop and Martyr' }],
    13: [{ name: 'Saint Frances Xavier Cabrini', type: 'optional', description: 'Virgin' }],
    15: [{ name: 'Saint Albert the Great', type: 'optional', description: 'Bishop and Doctor of the Church' }],
    16: [{ name: 'Saint Margaret of Scotland', type: 'optional', description: 'Queen' }],
    17: [{ name: 'Saint Elizabeth of Hungary', type: 'memorial', description: 'Religious' }],
    18: [{ name: 'The Dedication of the Basilicas of Saints Peter and Paul', type: 'optional', description: 'Optional Memorial' }],
    21: [{ name: 'The Presentation of the Blessed Virgin Mary', type: 'memorial', description: 'Optional Memorial' }],
    22: [{ name: 'Saint Cecilia', type: 'memorial', description: 'Virgin and Martyr' }],
    23: [{ name: 'Saint Clement I', type: 'optional', description: 'Pope and Martyr' }],
    24: [{ name: 'Saints Andrew Dung-Lac and Companions', type: 'memorial', description: 'Martyrs' }],
    25: [{ name: 'Saint Catherine of Alexandria', type: 'optional', description: 'Virgin and Martyr' }],
    30: [{ name: 'Saint Andrew', type: 'feast', description: 'Apostle' }],
  },
  12: { // December
    3: [{ name: 'Saint Francis Xavier', type: 'memorial', description: 'Priest' }],
    4: [{ name: 'Saint John Damascene', type: 'optional', description: 'Priest and Doctor of the Church' }],
    6: [{ name: 'Saint Nicholas', type: 'optional', description: 'Bishop' }],
    7: [{ name: 'Saint Ambrose', type: 'memorial', description: 'Bishop and Doctor of the Church' }],
    8: [{ name: 'The Immaculate Conception of the Blessed Virgin Mary', type: 'feast', description: 'Patroness of the United States' }],
    9: [{ name: 'Saint Juan Diego', type: 'optional', description: 'Confessor' }],
    10: [{ name: 'Our Lady of Loreto', type: 'optional', description: 'Optional Memorial' }],
    11: [{ name: 'Saint Damasus I', type: 'optional', description: 'Pope' }],
    12: [{ name: 'Our Lady of Guadalupe', type: 'feast', description: 'Patroness of the Americas' }],
    13: [{ name: 'Saint Lucy', type: 'memorial', description: 'Virgin and Martyr' }],
    14: [{ name: 'Saint John of the Cross', type: 'memorial', description: 'Priest and Doctor of the Church' }],
    21: [{ name: 'Saint Peter Canisius', type: 'optional', description: 'Priest and Doctor of the Church' }],
    23: [{ name: 'Saint John of Kanty', type: 'optional', description: 'Priest' }],
    26: [{ name: 'Saint Stephen', type: 'feast', description: 'The First Martyr' }],
    27: [{ name: 'Saint John', type: 'feast', description: 'Apostle and Evangelist' }],
    28: [{ name: 'The Holy Innocents', type: 'feast', description: 'Martyrs' }],
    29: [{ name: 'Saint Thomas Becket', type: 'optional', description: 'Bishop and Martyr' }],
    31: [{ name: 'Saint Sylvester I', type: 'optional', description: 'Pope' }],
  },
};

/**
 * Get the day name of the week
 * @param {number} dayOfWeek - Day of week (0-6, where 0 is Sunday)
 * @returns {string} - Day name
 */
function getDayName(dayOfWeek) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek];
}

/**
 * Get ordinal suffix for a number
 * @param {number} num - The number
 * @returns {string} - Ordinal suffix (st, nd, rd, th)
 */
function getOrdinalSuffix(num) {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

/**
 * Get the liturgical day description for a date
 * @param {Date} date - The date to check
 * @returns {Object} - Liturgical day information
 */
function getLiturgicalDay(date) {
  // Normalize dates for comparison (set to midnight)
  const normalizeDate = (d) => {
    const normalized = new Date(d);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };
  
  const year = date.getFullYear();
  const easter = calculateEaster(year);
  const dayOfWeek = date.getDay();
  const isSunday = dayOfWeek === 0;
  const checkDate = normalizeDate(date);
  
  // Check for special days first
  if (isPalmSunday(date, easter)) {
    return {
      name: 'Palm Sunday',
      type: 'feast',
      description: 'The Sunday of the Passion of the Lord - Commemoration of the Lord\'s entry into Jerusalem'
    };
  }
  
  if (isGoodFriday(date, easter)) {
    return {
      name: 'Good Friday',
      type: 'feast',
      description: 'The Passion of the Lord - Commemoration of the Crucifixion'
    };
  }
  
  if (isPentecost(date, easter)) {
    return {
      name: 'Pentecost Sunday',
      type: 'feast',
      description: 'The Descent of the Holy Spirit upon the Apostles'
    };
  }
  
  if (isGaudeteSunday(date)) {
    return {
      name: 'Gaudete Sunday',
      type: 'feast',
      description: 'Third Sunday of Advent - Rejoice Sunday'
    };
  }
  
  if (isLaetareSunday(date, easter)) {
    return {
      name: 'Laetare Sunday',
      type: 'feast',
      description: 'Fourth Sunday of Lent - Rejoice Sunday'
    };
  }
  
  // Check for Easter Sunday
  const easterDate = normalizeDate(easter);
  if (checkDate.getTime() === easterDate.getTime()) {
    return {
      name: 'Easter Sunday',
      type: 'feast',
      description: 'The Resurrection of the Lord - The Paschal Feast'
    };
  }
  
  // Check for Christmas
  if (date.getMonth() === 11 && date.getDate() === 25) {
    return {
      name: 'Christmas',
      type: 'feast',
      description: 'The Nativity of the Lord'
    };
  }
  
  // Check for Epiphany
  if (date.getMonth() === 0 && date.getDate() === 6) {
    return {
      name: 'Epiphany of the Lord',
      type: 'feast',
      description: 'The Manifestation of Christ to the Magi'
    };
  }
  
  // Check for Ash Wednesday
  const ashWednesday = new Date(easter);
  ashWednesday.setDate(easter.getDate() - 46);
  const ashWednesdayDate = normalizeDate(ashWednesday);
  if (checkDate.getTime() === ashWednesdayDate.getTime()) {
    return {
      name: 'Ash Wednesday',
      type: 'feast',
      description: 'The beginning of Lent - Day of fasting and repentance'
    };
  }
  
  // Check for Holy Thursday
  const holyThursday = new Date(easter);
  holyThursday.setDate(easter.getDate() - 3);
  const holyThursdayDate = normalizeDate(holyThursday);
  if (checkDate.getTime() === holyThursdayDate.getTime()) {
    return {
      name: 'Holy Thursday',
      type: 'feast',
      description: 'The Mass of the Lord\'s Supper - Institution of the Eucharist'
    };
  }
  
  // Check for Holy Saturday
  const holySaturday = new Date(easter);
  holySaturday.setDate(easter.getDate() - 1);
  const holySaturdayDate = normalizeDate(holySaturday);
  if (checkDate.getTime() === holySaturdayDate.getTime()) {
    return {
      name: 'Holy Saturday',
      type: 'feast',
      description: 'Easter Vigil - The Great Sabbath'
    };
  }
  
  // Check seasons
  if (isEasterSeason(date, easter)) {
    const daysAfterEaster = Math.floor((checkDate.getTime() - easterDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysAfterEaster === 0) {
      return {
        name: 'Easter Sunday',
        type: 'feast',
        description: 'The Resurrection of the Lord'
      };
    } else if (daysAfterEaster <= 7) {
      return {
        name: `Easter ${daysAfterEaster === 1 ? 'Monday' : daysAfterEaster === 2 ? 'Tuesday' : daysAfterEaster === 3 ? 'Wednesday' : daysAfterEaster === 4 ? 'Thursday' : daysAfterEaster === 5 ? 'Friday' : daysAfterEaster === 6 ? 'Saturday' : 'Sunday'}`,
        type: 'feast',
        description: `Day ${daysAfterEaster} of the Octave of Easter`
      };
    } else if (isSunday) {
      const weekNumber = Math.floor(daysAfterEaster / 7);
      if (weekNumber === 2) {
        return {
          name: 'Second Sunday of Easter',
          type: 'feast',
          description: 'Divine Mercy Sunday'
        };
      } else if (weekNumber === 3) {
        return {
          name: 'Third Sunday of Easter',
          type: 'feast',
          description: 'Easter Season'
        };
      } else if (weekNumber === 4) {
        return {
          name: 'Fourth Sunday of Easter',
          type: 'feast',
          description: 'Good Shepherd Sunday'
        };
      } else if (weekNumber === 5) {
        return {
          name: 'Fifth Sunday of Easter',
          type: 'feast',
          description: 'Easter Season'
        };
      } else if (weekNumber === 6) {
        return {
          name: 'Sixth Sunday of Easter',
          type: 'feast',
          description: 'Easter Season'
        };
      } else if (weekNumber === 7) {
        return {
          name: 'Ascension of the Lord',
          type: 'feast',
          description: 'The Ascension of Christ into Heaven'
        };
      }
    }
    // Weekday in Easter Season - format: "Tuesday of the first week of Easter"
    const dayName = getDayName(dayOfWeek);
    const weekNumber = Math.floor(daysAfterEaster / 7) + 1;
    const ordinal = weekNumber === 1 ? 'first' : weekNumber === 2 ? 'second' : weekNumber === 3 ? 'third' : weekNumber === 4 ? 'fourth' : weekNumber === 5 ? 'fifth' : weekNumber === 6 ? 'sixth' : weekNumber === 7 ? 'seventh' : `${weekNumber}${getOrdinalSuffix(weekNumber)}`;
    
    return {
      name: `${dayName} of the ${ordinal} week of Easter`,
      type: 'none',
      description: 'A weekday in the Easter Season - The Great Fifty Days'
    };
  }
  
  if (isChristmasSeason(date)) {
    const month = date.getMonth();
    const day = date.getDate();
    
    if (month === 11 && day === 25) {
      return {
        name: 'Christmas',
        type: 'feast',
        description: 'The Nativity of the Lord'
      };
    } else if (month === 11 && day === 26) {
      return {
        name: 'Saint Stephen',
        type: 'feast',
        description: 'The First Martyr'
      };
    } else if (month === 11 && day === 27) {
      return {
        name: 'Saint John',
        type: 'feast',
        description: 'Apostle and Evangelist'
      };
    } else if (month === 11 && day === 28) {
      return {
        name: 'The Holy Innocents',
        type: 'feast',
        description: 'Martyrs'
      };
    } else if (month === 0 && day === 1) {
      return {
        name: 'Mary, Mother of God',
        type: 'feast',
        description: 'Solemnity of Mary, the Holy Mother of God'
      };
    } else if (month === 0 && day === 6) {
      return {
        name: 'Epiphany of the Lord',
        type: 'feast',
        description: 'The Manifestation of Christ to the Magi'
      };
    }
    
    // Weekday in Christmas Season
    const dayName = getDayName(dayOfWeek);
    // Calculate which week of Christmas season (from Dec 25)
    const christmas = new Date(year, 11, 25);
    const christmasNormalized = normalizeDate(christmas);
    const daysSinceChristmas = Math.floor((checkDate.getTime() - christmasNormalized.getTime()) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(daysSinceChristmas / 7) + 1;
    const ordinal = weekNumber === 1 ? 'first' : weekNumber === 2 ? 'second' : `${weekNumber}${getOrdinalSuffix(weekNumber)}`;
    
    return {
      name: `${dayName} of the ${ordinal} week of Christmas`,
      type: 'none',
      description: 'A weekday in the Christmas Season'
    };
  }
  
  if (isLent(date, easter)) {
    const ashWednesday = new Date(easter);
    ashWednesday.setDate(easter.getDate() - 46);
    const ashWednesdayNormalized = normalizeDate(ashWednesday);
    const daysSinceAshWednesday = Math.floor((checkDate.getTime() - ashWednesdayNormalized.getTime()) / (1000 * 60 * 60 * 24));
    
    if (isSunday) {
      const weekNumber = Math.floor(daysSinceAshWednesday / 7) + 1;
      if (weekNumber === 1) {
        return {
          name: 'First Sunday of Lent',
          type: 'feast',
          description: 'The Temptation of Christ in the Desert'
        };
      } else if (weekNumber === 2) {
        return {
          name: 'Second Sunday of Lent',
          type: 'feast',
          description: 'The Transfiguration of the Lord'
        };
      } else if (weekNumber === 3) {
        return {
          name: 'Third Sunday of Lent',
          type: 'feast',
          description: 'The Woman at the Well'
        };
      } else if (weekNumber === 4) {
        return {
          name: 'Laetare Sunday',
          type: 'feast',
          description: 'Fourth Sunday of Lent - Rejoice Sunday'
        };
      } else if (weekNumber === 5) {
        return {
          name: 'Fifth Sunday of Lent',
          type: 'feast',
          description: 'The Raising of Lazarus'
        };
      }
    }
    
    // Weekday in Lent - format: "Tuesday of the first week of Lent"
    const dayName = getDayName(dayOfWeek);
    const weekNumber = Math.floor(daysSinceAshWednesday / 7) + 1;
    const ordinal = weekNumber === 1 ? 'first' : weekNumber === 2 ? 'second' : weekNumber === 3 ? 'third' : weekNumber === 4 ? 'fourth' : weekNumber === 5 ? 'fifth' : `${weekNumber}${getOrdinalSuffix(weekNumber)}`;
    
    return {
      name: `${dayName} of the ${ordinal} week of Lent`,
      type: 'none',
      description: 'A weekday in the Season of Lent - A time of prayer, fasting, and almsgiving'
    };
  }
  
  if (isAdvent(date)) {
    const year = date.getFullYear();
    const firstSunday = getAdventSunday(year, 1);
    const firstSundayNormalized = normalizeDate(firstSunday);
    const daysSinceFirstSunday = Math.floor((checkDate.getTime() - firstSundayNormalized.getTime()) / (1000 * 60 * 60 * 24));
    
    if (isSunday) {
      const weekNumber = Math.floor(daysSinceFirstSunday / 7) + 1;
      if (weekNumber === 1) {
        return {
          name: 'First Sunday of Advent',
          type: 'feast',
          description: 'The Coming of the Lord'
        };
      } else if (weekNumber === 2) {
        return {
          name: 'Second Sunday of Advent',
          type: 'feast',
          description: 'Prepare the Way of the Lord'
        };
      } else if (weekNumber === 3) {
        return {
          name: 'Gaudete Sunday',
          type: 'feast',
          description: 'Third Sunday of Advent - Rejoice Sunday'
        };
      } else if (weekNumber === 4) {
        return {
          name: 'Fourth Sunday of Advent',
          type: 'feast',
          description: 'The Birth of the Lord is Near'
        };
      }
    }
    
    // Weekday in Advent - format: "Tuesday of the first week of Advent"
    const dayName = getDayName(dayOfWeek);
    const weekNumber = Math.floor(daysSinceFirstSunday / 7) + 1;
    const ordinal = weekNumber === 1 ? 'first' : weekNumber === 2 ? 'second' : weekNumber === 3 ? 'third' : weekNumber === 4 ? 'fourth' : `${weekNumber}${getOrdinalSuffix(weekNumber)}`;
    
    return {
      name: `${dayName} of the ${ordinal} week of Advent`,
      type: 'none',
      description: 'A weekday in the Season of Advent - Preparing for the Coming of Christ'
    };
  }
  
  // Ordinary Time - determine which week
  const epiphany = new Date(year, 0, 6);
  const epiphanyDayOfWeek = epiphany.getDay();
  const baptism = new Date(epiphany);
  if (epiphanyDayOfWeek === 0) {
    baptism.setDate(epiphany.getDate() + 7);
  } else {
    baptism.setDate(epiphany.getDate() + (7 - epiphanyDayOfWeek));
  }
  
  const pentecost = new Date(easter);
  pentecost.setDate(easter.getDate() + 49);
  const firstSundayAdvent = getAdventSunday(year, 1);
  
  // Ordinary Time before Lent
  const baptismNormalized = normalizeDate(baptism);
  const ashWednesdayForOT = new Date(easter);
  ashWednesdayForOT.setDate(easter.getDate() - 46);
  const ashWednesdayNormalizedOT = normalizeDate(ashWednesdayForOT);
  
  if (checkDate > baptismNormalized && checkDate < ashWednesdayNormalizedOT) {
    if (isSunday) {
      const daysSinceBaptism = Math.floor((checkDate.getTime() - baptismNormalized.getTime()) / (1000 * 60 * 60 * 24));
      const weekNumber = Math.floor(daysSinceBaptism / 7) + 1;
      return {
        name: `${weekNumber}${weekNumber === 1 ? 'st' : weekNumber === 2 ? 'nd' : weekNumber === 3 ? 'rd' : 'th'} Sunday of Ordinary Time`,
        type: 'none',
        description: 'A Sunday in Ordinary Time'
      };
    }
    // Weekday in Ordinary Time before Lent - format: "Thursday of the 30th week of Ordinary Time"
    const dayName = getDayName(dayOfWeek);
    const daysSinceBaptism = Math.floor((checkDate.getTime() - baptismNormalized.getTime()) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(daysSinceBaptism / 7) + 1;
    const ordinal = weekNumber === 1 ? 'first' : weekNumber === 2 ? 'second' : weekNumber === 3 ? 'third' : `${weekNumber}${getOrdinalSuffix(weekNumber)}`;
    
    return {
      name: `${dayName} of the ${ordinal} week of Ordinary Time`,
      type: 'none',
      description: 'A weekday in Ordinary Time'
    };
  }
  
  // Ordinary Time after Pentecost
  const pentecostNormalized = normalizeDate(pentecost);
  const firstSundayAdventNormalized = normalizeDate(firstSundayAdvent);
  
  if (checkDate > pentecostNormalized && checkDate < firstSundayAdventNormalized) {
    if (isSunday) {
      const daysSincePentecost = Math.floor((checkDate.getTime() - pentecostNormalized.getTime()) / (1000 * 60 * 60 * 24));
      const weekNumber = Math.floor(daysSincePentecost / 7) + 1;
      return {
        name: `${weekNumber}${weekNumber === 1 ? 'st' : weekNumber === 2 ? 'nd' : weekNumber === 3 ? 'rd' : 'th'} Sunday of Ordinary Time`,
        type: 'none',
        description: 'A Sunday in Ordinary Time'
      };
    }
    // Weekday in Ordinary Time after Pentecost - format: "Thursday of the 30th week of Ordinary Time"
    const dayName = getDayName(dayOfWeek);
    const daysSincePentecost = Math.floor((checkDate.getTime() - pentecostNormalized.getTime()) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(daysSincePentecost / 7) + 1;
    const ordinal = weekNumber === 1 ? 'first' : weekNumber === 2 ? 'second' : weekNumber === 3 ? 'third' : `${weekNumber}${getOrdinalSuffix(weekNumber)}`;
    
    return {
      name: `${dayName} of the ${ordinal} week of Ordinary Time`,
      type: 'none',
      description: 'A weekday in Ordinary Time'
    };
  }
  
  // Default fallback
  return {
    name: 'Ordinary Time',
    type: 'none',
    description: 'A day in Ordinary Time'
  };
}

/**
 * Get the saint(s) or feast(s) for a specific date
 * @param {Date} date - The date to check (defaults to today)
 * @returns {Array} - Array of saint/feast objects
 */
export function getSaintsForDate(date = new Date()) {
  const month = date.getMonth() + 1; // JavaScript months are 0-indexed
  const day = date.getDate();
  
  const saints = SAINT_CALENDAR[month]?.[day] || [];
  
  // If no specific saint for this date, return liturgical day information
  if (saints.length === 0) {
    return [getLiturgicalDay(date)];
  }
  
  return saints;
}

/**
 * Get the saint of the day (today)
 * @returns {Object} - Saint/feast object with date information
 */
export function getSaintOfTheDay() {
  const today = new Date();
  const saints = getSaintsForDate(today);
  
  return {
    date: today.toISOString().split('T')[0],
    timestamp: today.toISOString(),
    saints: saints
  };
}

/**
 * Get upcoming feasts for the next N days
 * @param {number} days - Number of days to look ahead (default: 9)
 * @returns {Array} - Array of objects with date and saints
 */
export function getUpcomingFeasts(days = 9) {
  const today = new Date();
  const upcoming = [];
  
  for (let i = 1; i <= days; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + i);
    
    const saints = getSaintsForDate(futureDate);
    
    // Include all days - return exactly the requested number of days
    // This ensures we show the next N days of the liturgical calendar,
    // including days that are just "Ordinary Time" weekdays
    if (saints.length > 0) {
      upcoming.push({
        date: futureDate.toISOString().split('T')[0],
        timestamp: futureDate.toISOString(),
        saints: saints
      });
    }
  }
  
  return upcoming;
}

/**
 * Get all feasts for a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} - Array of objects with date and saints
 */
export function getFeastsInRange(startDate, endDate) {
  const feasts = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const saints = getSaintsForDate(currentDate);
    
    if (saints.length > 0 && saints[0].type !== 'none' && saints[0].type !== 'ordinary') {
      feasts.push({
        date: currentDate.toISOString().split('T')[0],
        timestamp: currentDate.toISOString(),
        saints: saints
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return feasts;
}

