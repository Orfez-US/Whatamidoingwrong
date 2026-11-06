const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const modalTitle = document.getElementById('modalTitle');
const modalText = document.getElementById('modalText');
const modalButtons = document.getElementById('modalButtons');
const logBox = document.getElementById('logBox');
const coinsStat = document.getElementById('coinsStat');
const orbsStat = document.getElementById('orbsStat');
const questStat = document.getElementById('questStat');
const dexStat = document.getElementById('dexStat');
const objectiveText = document.getElementById('objectiveText');
const teamDisplay = document.getElementById('teamDisplay');
const dexList = document.getElementById('dexList');

const world = {
  width: canvas.width,
  height: canvas.height,
  map: { x: 0, y: 0 },
  biome: 'Grove',
  weather: 'clear',
  encounters: [],
  player: {
    x: 160,
    y: 400,
    radius: 18,
    speed: 2.3,
    direction: { x: 1, y: 0 },
    team: [],
  },
  markers: [],
};

const state = {
  coins: 120,
  orbs: 12,
  questsCompleted: 0,
  questIndex: 0,
  milestone: 'Grove',
  activeCreature: null,
  inventory: [],
  logs: [],
  defeated: new Set(),
  captureCount: 0,
  danger: 0,
  roamTick: 0,
  messageMap: [],
};

const creatureMeta = buildCreatureCatalog();
const creatureMap = new Map();

function buildCreatureCatalog() {
  const families = [
    'Bloomfin', 'Driftwing', 'Emberpaw', 'Pebbletoad', 'Glimmerfox', 'Mossling', 'Frostbat', 'Skyfin', 'Vineback', 'Duskpaw',
    'Sunmoth', 'Mistcat', 'Stoneharrow', 'Dewhopper', 'Runehare', 'Mirelark', 'Glasspike', 'Thornfang', 'Cinderbee', 'Moonmole',
    'Ashleaf', 'Pearlfin', 'Tidepup', 'Cavernot', 'Starling', 'Prairieglow', 'Bogbeast', 'Lanternmoth', 'Brambleclaw', 'Cloudtusk',
    'Quartzfox', 'Willowimp', 'Flarecat', 'Galeasp', 'Riverpike', 'Fellotter', 'Abysswren', 'Marecap', 'Berrywhorl', 'Seabloom',
    'Thundercrow', 'Velvetpup', 'Mallowram', 'Pinewisp', 'Moltenfin', 'Siltstag', 'Silverskiff', 'Savannahlark', 'Oakmoss', 'Rimegull',
    'Marshdrake', 'Amberwhip', 'Chimera', 'Sunroot', 'Raincat', 'Coppergecko', 'Dawnstilt', 'Nightbloom', 'Cloverdrake', 'Frostwhorl',
    'Cinderpelt', 'Mossbat', 'Prairietotem', 'Wispfang', 'Feralfin', 'Goldrill', 'Solsticecat', 'Tanglehorn', 'Moonhare', 'Featherbloom'
  ];

  const variations = ['Alpha', 'Bloom', 'Rift'];
  const catalog = [];
  for (let i = 0; i < 60; i++) {
    const name = families[i % families.length];
    const baseColors = ['#9af7d3', '#8ec7ff', '#ffe88d', '#ffb0b0', '#d9a7ff', '#a8ffb5', '#ffd7a6', '#c7ffd2'];
    for (let v = 0; v < 3; v++) {
      const variantName = `${name} ${variations[v]}`;
      const color = baseColors[(i + v) % baseColors.length];
      const traits = ['Swift', 'Sturdy', 'Mystic', 'Forest', 'Solar', 'Aerial', 'Reed', 'Stone', 'Moonlit', 'Feral'];
      catalog.push({
        id: `${i + 1}-${v + 1}`,
        species: name,
        variant: variations[v],
        name: variantName,
        color,
        trait: traits[(i + v) % traits.length],
        rarity: v === 0 ? 'Common' : v === 1 ? 'Rare' : 'Epic',
        level: 1 + ((i + v) % 7),
        hp: 24 + i * 2 + v * 7,
        power: 4 + ((i + v) * 2) % 12,
        element: ['Forest', 'Water', 'Fire', 'Earth', 'Wind', 'Moon'][((i + v) * 2) % 6],
        habit: ['Grove', 'Dunes', 'Cavern', 'Tide', 'Ruins', 'Peak'][i % 6],
      });
    }
  }
  return catalog;
}

function addLog(message) {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = message;
  logBox.prepend(entry);
  state.logs.unshift(message);
  while (state.logs.length > 16) state.logs.pop();
}

function updateStats() {
  coinsStat.textContent = String(state.coins);
  orbsStat.textContent = String(state.orbs);
  questStat.textContent = String(state.questsCompleted);
  dexStat.textContent = `${state.captureCount}/180`;
}

function buildCreatureMap() {
  creatureMap.clear();
  creatureMeta.forEach((creature) => creatureMap.set(creature.id, creature));
}

function loadTeam() {
  const team = [
    creatureMeta[0],
    creatureMeta[3],
    creatureMeta[6],
  ];
  world.player.team = team.map((creature) => ({ ...creature }));
  state.activeCreature = world.player.team[0];
  updateTeamDisplay();
}

function updateTeamDisplay() {
  teamDisplay.innerHTML = '';
  world.player.team.forEach((creature, index) => {
    const slot = document.createElement('div');
    slot.className = `team-slot ${index === 0 ? 'active' : ''}`;
    slot.innerHTML = `<span class="name">${creature.name}</span><span class="trait">${creature.trait}</span>`;
    teamDisplay.appendChild(slot);
  });
}

function updateDexList() {
  const seen = new Set();
  const entries = [];
  for (const creature of world.player.team) {
    seen.add(creature.name);
    entries.push(creature);
  }
  for (const entry of world.encounters) {
    if (!seen.has(entry.creature.name)) {
      entries.push(entry.creature);
      seen.add(entry.creature.name);
    }
  }
  const bestiary = creatureMeta.slice(0, 12).map((creature) => ({ ...creature }));
  dexList.innerHTML = '';
  bestiary.forEach((creature) => {
    const item = document.createElement('div');
    item.className = 'dex-item';
    item.innerHTML = `<strong>${creature.name}</strong><span>${creature.element} • ${creature.rarity}</span>`;
    dexList.appendChild(item);
  });
}

function openModal(title, text, actions) {
  modalTitle.textContent = title;
  modalText.textContent = text;
  modalButtons.innerHTML = '';
  actions.forEach((action) => {
    const button = document.createElement('button');
    button.textContent = action.label;
    button.addEventListener('click', action.handler);
    modalButtons.appendChild(button);
  });
  overlay.classList.remove('hidden');
}

function closeModal() {
  overlay.classList.add('hidden');
}

function setQuestObjective() {
  const quests = [
    'Find a partner creature in the Grove',
    'Investigate the Moonlit Ruins',
    'Defeat a wild Emberpaw pack',
    'Cross the Sunfen Dunes',
    'Collect glowing Orb shards',
    'Challenge the Crystal Peak',
  ];
  objectiveText.textContent = quests[state.questIndex % quests.length];
}

function spawnCreatures() {
  const regions = [
    { x: 120, y: 100, color: '#8ee9a2', label: 'Bloom' },
    { x: 740, y: 180, color: '#7ec9ff', label: 'Lake' },
    { x: 620, y: 420, color: '#ffbf74', label: 'Dune' },
    { x: 310, y: 320, color: '#d8b3ff', label: 'Ruins' },
    { x: 840, y: 500, color: '#b4f9d3', label: 'Meadow' },
  ];
  world.encounters = [];
  for (let i = 0; i < 12; i++) {
    const region = regions[i % regions.length];
    const creature = creatureMeta[(i * 7 + state.questIndex * 9) % creatureMeta.length];
    world.encounters.push({
      id: `${creature.id}-enc-${i}`,
      x: region.x + Math.sin(i * 2.4) * 55,
      y: region.y + Math.cos(i * 1.6) * 45,
      radius: 16,
      creature,
      isWild: true,
      hp: creature.hp,
      awake: true,
    });
  }
}

function updatePlayerMovement() {
  const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
  };
  const active = {};

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key in keys) {
      keys[key] = true;
      active[key] = true;
      if (key === 'w') world.player.direction = { x: 0, y: -1 };
      if (key === 's') world.player.direction = { x: 0, y: 1 };
      if (key === 'a') world.player.direction = { x: -1, y: 0 };
      if (key === 'd') world.player.direction = { x: 1, y: 0 };
    }
    if (key === 'e') {
      handleAction('capture');
    }
    if (key === ' ') {
      handleAction('attack');
    }
  });

  window.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (key in keys) keys[key] = false;
  });

  const tick = () => {
    let dx = 0;
    let dy = 0;
    if (keys.w) dy -= 1;
    if (keys.s) dy += 1;
    if (keys.a) dx -= 1;
    if (keys.d) dx += 1;

    if (dx || dy) {
      const mag = Math.hypot(dx, dy) || 1;
      world.player.x += (dx / mag) * world.player.speed;
      world.player.y += (dy / mag) * world.player.speed;
      world.player.x = Math.max(28, Math.min(canvas.width - 28, world.player.x));
      world.player.y = Math.max(34, Math.min(canvas.height - 34, world.player.y));
      world.player.direction = { x: dx / mag, y: dy / mag };
    }

    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function handleAction(action) {
  if (action === 'travel') {
    state.questIndex = (state.questIndex + 1) % 6;
    state.milestone = ['Grove', 'Ruins', 'Dunes', 'Tide', 'Peak', 'Wilds'][state.questIndex];
    world.biome = state.milestone;
    spawnCreatures();
    state.danger = Math.min(100, state.danger + 10);
    addLog(`You travel to the ${world.biome}. The wilds stir.`);
    setQuestObjective();
    return;
  }

  if (action === 'scan') {
    const nearby = getNearbyCreature();
    if (!nearby) {
      addLog('No creature is nearby enough to scan.');
      return;
    }
    const creature = nearby.creature;
    addLog(`Scan: ${creature.name} (${creature.element}, ${creature.rarity}) - trait ${creature.trait}.`);
    return;
  }

  if (action === 'switch') {
    if (world.player.team.length < 2) {
      addLog('No alternate companion ready.');
      return;
    }
    const current = world.player.team.shift();
    world.player.team.push(current);
    state.activeCreature = world.player.team[0];
    updateTeamDisplay();
    addLog(`You switch to ${state.activeCreature.name}.`);
    return;
  }

  if (action === 'guard') {
    state.danger = Math.max(0, state.danger - 18);
    addLog(`${state.activeCreature?.name || 'Your partner'} braces against the next hit.`);
    return;
  }

  if (action === 'attack') {
    const nearby = getNearbyCreature();
    if (!nearby) {
      addLog('You lash out at the air, but no creature is in range.');
      return;
    }
    const damage = (state.activeCreature?.power || 8) + 2;
    nearby.hp -= damage;
    addLog(`${state.activeCreature?.name || 'Your creature'} strikes ${nearby.creature.name} for ${damage} damage.`);
    if (nearby.hp <= 0) {
      state.defeated.add(nearby.creature.name);
      state.orbs += 2;
      state.coins += 12;
      addLog(`${nearby.creature.name} falls. You gather 2 orbs and 12 coins.`);
      world.encounters = world.encounters.filter((entry) => entry.id !== nearby.id);
    }
    return;
  }

  if (action === 'capture') {
    const nearby = getNearbyCreature();
    if (!nearby) {
      addLog('No creature is close enough to capture.');
      return;
    }
    const success = Math.random() < 0.6 + (state.orbs > 0 ? 0.15 : 0);
    if (success) {
      const result = nearby.creature;
      const captured = { ...result };
      world.player.team.push(captured);
      state.captureCount += 1;
      state.coins += 8;
      state.orbs = Math.max(0, state.orbs - 1);
      world.encounters = world.encounters.filter((entry) => entry.id !== nearby.id);
      addLog(`Capture! ${captured.name} joins your party.`);
    } else {
      addLog(`${nearby.creature.name} breaks free from the capture ring.`);
    }
    updateTeamDisplay();
    updateStats();
  }
}

function getNearbyCreature() {
  let nearest = null;
  let nearestDistance = Infinity;
  for (const creature of world.encounters) {
    const dist = Math.hypot(creature.x - world.player.x, creature.y - world.player.y);
    if (dist < 90 && dist < nearestDistance) {
      nearest = creature;
      nearestDistance = dist;
    }
  }
  return nearest;
}

function spawnQuestPrompt() {
  const opening = 'A peaceful field stretches before you. Capture, train, and roam across six wild regions.';
  addLog(opening);
  addLog('The courier hands you your first creature: Bloomfin Alpha.');
  openModal('Welcome', 'Your journey begins in the Grove. Capture creatures, defeat wilds, and complete quests.', [
    { label: 'Begin', handler: closeModal },
  ]);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // ground
  ctx.fillStyle = '#1b392f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // biome ambience
  ctx.fillStyle = 'rgba(120, 220, 160, 0.08)';
  for (let i = 0; i < 18; i++) {
    ctx.fillRect(i * 54, 0, 25, canvas.height);
  }

  // trees and landmarks
  for (let i = 0; i < 10; i++) {
    const x = i * 110 + 28;
    const y = 90 + (i % 3) * 40;
    ctx.fillStyle = '#123d31';
    ctx.fillRect(x, y, 18, 90);
    ctx.beginPath();
    ctx.fillStyle = '#5edc9d';
    ctx.arc(x + 9, y - 12, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  // water/lake
  ctx.fillStyle = 'rgba(112, 185, 255, 0.18)';
  ctx.beginPath();
  ctx.roundRect(690, 120, 170, 90, 18);
  ctx.fill();

  // player
  ctx.beginPath();
  ctx.fillStyle = '#8af0c7';
  ctx.arc(world.player.x, world.player.y, world.player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(world.player.x, world.player.y);
  ctx.lineTo(world.player.x + world.player.direction.x * 22, world.player.y + world.player.direction.y * 22);
  ctx.strokeStyle = '#dffef4';
  ctx.lineWidth = 2;
  ctx.stroke();

  // wild creatures
  world.encounters.forEach((entry) => {
    const c = entry.creature;
    ctx.beginPath();
    ctx.fillStyle = c.color;
    ctx.arc(entry.x, entry.y, entry.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = 'rgba(15, 22, 20, 0.6)';
    ctx.arc(entry.x - 4, entry.y - 4, 3, 0, Math.PI * 2);
    ctx.arc(entry.x + 4, entry.y - 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.moveTo(entry.x - 6, entry.y + 6);
    ctx.lineTo(entry.x + 6, entry.y + 6);
    ctx.stroke();
  });

  // selected creature info
  ctx.fillStyle = 'rgba(7, 17, 16, 0.72)';
  ctx.fillRect(20, 20, 210, 74);
  ctx.fillStyle = '#d9fff0';
  ctx.font = 'bold 18px Arial';
  ctx.fillText(state.activeCreature?.name || 'No partner', 28, 46);
  ctx.font = '14px Arial';
  ctx.fillStyle = '#9ed6b8';
  const active = state.activeCreature || { trait: 'Scout', element: 'Forest', hp: 0 };
  ctx.fillText(`${active.element} • ${active.trait}`, 28, 66);
  ctx.fillText(`HP ${active.hp}`, 28, 82);
}

function animate() {
  render();
  requestAnimationFrame(animate);
}

function attachButtons() {
  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      handleAction(button.dataset.action);
      updateStats();
    });
  });
}

function init() {
  buildCreatureMap();
  loadTeam();
  spawnCreatures();
  spawnQuestPrompt();
  setQuestObjective();
  attachButtons();
  updateStats();
  updateTeamDisplay();
  updateDexList();
  updatePlayerMovement();
  animate();
}

init();
