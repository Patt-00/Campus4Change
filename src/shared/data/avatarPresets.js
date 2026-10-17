export const avatarPresets = [
  { id: 'cyan', label: 'Cyan', color: '#12c8ff', textColor: '#07141c' },
  { id: 'blue', label: 'Blue', color: '#5687ff', textColor: '#07141c' },
  { id: 'green', label: 'Green', color: '#19c37d', textColor: '#07141c' },
  { id: 'violet', label: 'Violet', color: '#8d7aff', textColor: '#07141c' },
  { id: 'gold', label: 'Gold', color: '#f5b800', textColor: '#07141c' },
  { id: 'rose', label: 'Rose', color: '#ff8391', textColor: '#07141c' },
  { id: 'teal', label: 'Teal', color: '#23b9ad', textColor: '#07141c' },
  { id: 'slate', label: 'Slate', color: '#35515d', textColor: '#f5fafc' },
];

export function getAvatarPreset(id) {
  return avatarPresets.find(preset => preset.id === id) || avatarPresets[0];
}
