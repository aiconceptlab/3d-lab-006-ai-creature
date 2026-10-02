export const choices = Object.freeze({
  family: ['fox', 'cat', 'bunny'],
  coat: ['cream', 'caramel', 'charcoal', 'lilac', 'moss'],
  accent: ['cyan', 'amber', 'mint', 'coral'],
  eyes: ['blue', 'amber', 'violet', 'green'],
  ears: ['small', 'large', 'long'],
  tail: ['curled', 'fluffy', 'puff'],
  build: ['round', 'slender'],
  personality: ['curious', 'playful', 'shy', 'sleepy'],
});
export const palette = {
  coat: {cream: '#efe3cf', caramel: '#c88b57', charcoal: '#485569', lilac: '#b5a0d1', moss: '#91ae91'},
  accent: {cyan: '#64dbff', amber: '#ffc26b', mint: '#79f6bd', coral: '#ff8f93'},
  eyes: {blue: '#1884b5', amber: '#c78118', violet: '#7c4bbe', green: '#299276'},
};
export const NOVA = Object.freeze({family: 'fox', coat: 'cream', accent: 'cyan', eyes: 'blue', ears: 'large', tail: 'curled', build: 'round', personality: 'curious'});
export const PRESETS = [
  {name: 'Nova', modelUrl: '/models/nova-living.glb?v=expressions-1', description: 'A tiny cream fox-cat with huge ears, blue eyes, glowing cyan paws and a curled tail. Curious and friendly.', design: {...NOVA}},
  {name: 'Mochi', modelUrl: '/models/mochi-living.glb?v=expressions-1', description: 'A round lilac bunny with long ears, violet eyes, a little puff tail and mint paws. Sleepy and cuddly.', design: {...NOVA, family: 'bunny', coat: 'lilac', accent: 'mint', eyes: 'violet', ears: 'long', tail: 'puff', personality: 'sleepy'}},
  {name: 'Ember', modelUrl: '/models/ember-living.glb?v=expressions-1', description: 'A slender charcoal cat with small ears, amber eyes, a fluffy tail and warm amber paws. Playful and energetic.', design: {...NOVA, family: 'cat', coat: 'charcoal', accent: 'amber', eyes: 'amber', ears: 'small', tail: 'fluffy', build: 'slender', personality: 'playful'}},
];
export function includedModel(design,description='') {
  const normalise=text=>text.trim().toLowerCase().replace(/\s+/g,' ');
  const preset=PRESETS.find(p=>normalise(p.description)===normalise(description))
    ||PRESETS.find(p=>Object.keys(p.design).every(key=>p.design[key]===design?.[key]));
  return preset?.modelUrl;
}
export function validateDesign(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid pet design.');
  const result = {};
  for (const [key, options] of Object.entries(choices)) {
    if (!options.includes(input[key])) throw new Error(`Invalid design option: ${key}.`);
    result[key] = input[key];
  }
  return result;
}
export function validateBrief(input) {
  if (!input || typeof input !== 'object') throw new Error('Please describe your companion.');
  const name = typeof input.name === 'string' ? input.name.trim() : 'Nova';
  const description = typeof input.description === 'string' ? input.description.trim() : '';
  if (!name || name.length > 32 || /[\x00-\x1f<>]/.test(name)) throw new Error('Use a pet name of 1â€“32 characters.');
  if (description.length < 12 || description.length > 1200 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(description)) throw new Error('Describe your pet in 12â€“1,200 characters.');
  if (/\b(eight legs|six legs|tentacles|human face|humanoid|spider|octopus|snake)\b/i.test(description)) throw new Error('This version creates four-legged fox, cat and bunny companions. Try one of those shapes.');
  return {name, description};
}
export function localDesign(description) {
  const text = description.toLowerCase();
  const pick = (items, fallback) => items.find(x => text.includes(x)) || fallback;
  return {
    family: /bunny|rabbit/.test(text) ? 'bunny' : /\bcat\b/.test(text) && !/fox/.test(text) ? 'cat' : 'fox',
    coat: pick(choices.coat, /black|dark/.test(text) ? 'charcoal' : 'cream'),
    accent: pick(choices.accent, 'cyan'), eyes: /violet eyes/.test(text) ? 'violet' : /amber eyes/.test(text) ? 'amber' : /green eyes/.test(text) ? 'green' : 'blue',
    ears: /long ears/.test(text) ? 'long' : /small ears/.test(text) ? 'small' : 'large',
    tail: /puff|bunny|rabbit/.test(text) ? 'puff' : /fluffy tail/.test(text) ? 'fluffy' : 'curled',
    build: /slender|slim/.test(text) ? 'slender' : 'round', personality: pick(choices.personality, 'curious'),
  };
}

// Upgrade saved bundled URLs; custom generation URLs remain unchanged.
export function currentModelUrl(url) {
  const match=typeof url==='string'&&url.match(/^\/models\/(nova|mochi|ember)(?:-living)?\.glb(?:\?.*)?$/);
  return match?'/models/'+match[1]+'-living.glb?v=expressions-1':url;
}
