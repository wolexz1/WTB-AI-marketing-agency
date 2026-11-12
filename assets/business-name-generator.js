(() => {
  const form = document.querySelector('#name-form');
  const keyword = document.querySelector('#name-keyword');
  const style = document.querySelector('#name-style');
  const cards = document.querySelector('#name-cards');
  const saved = document.querySelector('#name-saved');
  const message = document.querySelector('#name-message');
  const copyNote = document.querySelector('#copy-note');
  const shortlist = new Set();
  let offset = 0;
  let names = [];
  const words = {modern: ['Nova','Spark','Nest','Flow','Bright','Pulse','Bloom','Wave'], warm: ['Kindred','Honey','Joy','Golden','Bloom','Sunny','Gather','Nook'], professional: ['Prime','Sterling','Summit','Pioneer','Anchor','Meridian','Crest','Noble']};
  const endings = {modern: ['Studio','Collective','Works','Lab','House','Co'], warm: ['House','Corner','Collective','Co','Place','Studio'], professional: ['Partners','Consult','Works','Group','Solutions','Co']};
  const culturalWords = {yoruba: ['Ayo', 'Ife'], igbo: ['Ifeoma', 'Ngozi', 'Ifunanya', 'Ijeoma'], swahili: ['Amani', 'Asali', 'Azizi', 'Bahari']};
  const label = value => value.replace(/\s+/g, ' ').trim().replace(/\b\p{L}/gu, letter => letter.toLocaleUpperCase());
  function drawSaved() {
    saved.replaceChildren();
    document.querySelector('#name-shortlist').hidden = shortlist.size === 0;
    for (const name of shortlist) {
      const card = document.createElement('div'); card.className = 'naming-card';
      const title = document.createElement('strong'); title.textContent = name;
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Remove';
      remove.addEventListener('click', () => { shortlist.delete(name); drawSaved(); });
      card.append(title, remove); saved.append(card);
    }
  }
  function makeNames() {
    const value = label(keyword.value);
    if (!value || !/\p{L}/u.test(value)) { message.textContent = 'Please enter a word that describes your business.'; return false; }
    const cultural = culturalWords[style.value] || Object.values(culturalWords).flat();
    const selected = style.value === 'all' ? Object.keys(words) : (words[style.value] ? [style.value] : []);
    const culturalNames = [...cultural.map(word => `${word} ${value}`), ...cultural.map(word => `${value} ${word}`)];
    const generalNames = selected.flatMap(group => [...words[group].map(word => `${word} ${value}`), ...endings[group].map(word => `${value} ${word}`)]);
    names = [...new Set(culturalNames.flatMap((name, index) => [name, generalNames[index]].filter(Boolean)).concat(generalNames.slice(culturalNames.length)))];
    return true;
  }
  function render() {
    cards.replaceChildren();
    const picks = document.querySelector('#name-picks');
    picks.replaceChildren();
    const amount = Math.min(12, names.length);
    for (let index = 0; index < amount; index++) {
      const name = names[(offset + index) % names.length];
      const card = document.createElement('div'); card.className = 'naming-card';
      const title = document.createElement('strong'); title.textContent = name;
      const save = document.createElement('button'); save.type = 'button'; save.textContent = shortlist.has(name) ? 'Saved' : 'Save';
      save.addEventListener('click', () => { shortlist.add(name); save.textContent = 'Saved'; drawSaved(); });
      card.append(title, save);
      if (index < 2) picks.append(card); else cards.append(card);
    }
    document.querySelector('#name-results').hidden = false;
    message.textContent = 'These ideas are not checked for availability.';
  }
  form.addEventListener('submit', event => { event.preventDefault(); offset = 0; if (makeNames()) render(); });
  document.querySelectorAll('.dark-cta a[href="../contact/"], .naming-launch a[href="../contact/"]').forEach(link => link.addEventListener('click', () => {
    const brief = document.querySelector('#quickBriefForm textarea[name="message"]');
    if (brief && !brief.value.trim() && shortlist.size) brief.value = `My shortlisted business names: ${[...shortlist].join(', ')}. I would like help marketing my business.`;
  }));
  document.querySelector('#name-more').addEventListener('click', () => { offset = (offset + 12) % names.length; render(); });
  document.querySelector('#name-copy-all').addEventListener('click', async () => { try { await navigator.clipboard.writeText([...shortlist].join('\n')); copyNote.textContent = 'Shortlist copied.'; } catch { copyNote.textContent = 'Copy is unavailable here. Please select and copy the names manually.'; } });
})();
