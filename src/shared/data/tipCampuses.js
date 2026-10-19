export const tipCampuses = [
  { label: 'Quezon City', value: 'T.I.P. Quezon City' },
  { label: 'Manila', value: 'T.I.P. Manila' },
];

export function normalizeTipCampus(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, '');

  if (normalized.includes('quezon')) {
    return 'T.I.P. Quezon City';
  }
  if (normalized.includes('manila')) {
    return 'T.I.P. Manila';
  }
  return '';
}

export function getTipCampusLabel(value) {
  return tipCampuses.find(campus => campus.value === value)?.label || '';
}
