'use strict';

const DEFAULT_DEADLINE = '2026-12-31';
const TIME_ZONE = 'Asia/Jakarta';

function currentDateInJakarta(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isValidDeadline(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function isDeadlineExpired(deadline, now = new Date()) {
  const normalized = isValidDeadline(deadline) ? String(deadline) : DEFAULT_DEADLINE;
  return currentDateInJakarta(now) > normalized;
}

async function getDeadline(db) {
  return new Promise(resolve => {
    db.get('SELECT value FROM config WHERE key = ?', ['deadline'], (error, row) => {
      if (error || !row || !isValidDeadline(row.value)) return resolve(DEFAULT_DEADLINE);
      resolve(String(row.value));
    });
  });
}

module.exports = {
  DEFAULT_DEADLINE,
  TIME_ZONE,
  currentDateInJakarta,
  isValidDeadline,
  isDeadlineExpired,
  getDeadline
};
