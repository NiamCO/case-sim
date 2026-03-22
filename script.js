// Wait for Supabase library to load
function initializeApp() {
  if (typeof window.supabase === 'undefined') {
    console.log('Waiting for Supabase library...');
    setTimeout(initializeApp, 100);
    return;
  }

const SUPABASE_URL = 'https://zavxywrocjrnuzqchjaz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inphdnh5d3JvY2pybnV6cWNoamF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3ODM3MzUsImV4cCI6MjA4OTM1OTczNX0.1xOya_AA0VXbM-6Vj-6TTeoMVwc3P3g7TmCMyQFhKCs';

console.log('Initializing Supabase client...');
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('Supabase client created:', supabaseClient ? 'SUCCESS' : 'FAILED');

let currentUser = null;
let playerData = {
  money: 100,
  inventory: [],
  totalCasesOpened: 0,
  bestItemWon: null,
  totalSpent: 0,
  totalEarned: 0,
  dailyStreak: 1,
  lastDailyClaim: null,
  shopItems: []
};

let selectedCase = null;
let selectedInventoryItems = [];
let craftingSlots = Array(9).fill(null);
let currentLeaderboardFilter = 'value';

window.giveMoney = (amount) => {
  playerData.money += amount;
  updateMoney();
  savePlayerData();
  console.log(`💰 Added $${amount}`);
};

window.setMoney = (amount) => {
  playerData.money = amount;
  updateMoney();
  savePlayerData();
};

window.resetProgress = async () => {
  if (confirm('Reset ALL progress?')) {
    playerData = {
      money: 100, inventory: [], totalCasesOpened: 0, bestItemWon: null,
      totalSpent: 0, totalEarned: 0, dailyStreak: 1, lastDailyClaim: null, shopItems: []
    };
    await savePlayerData();
    location.reload();
  }
};

const RARITIES = {
  0: { name: 'Common', color: '#6b7280', bgColor: '#4b5563' },
  1: { name: 'Uncommon', color: '#22c55e', bgColor: '#16a34a' },
  2: { name: 'Rare', color: '#3b82f6', bgColor: '#2563eb' },
  3: { name: 'Epic', color: '#a855f7', bgColor: '#9333ea' },
  4: { name: 'Legendary', color: '#fbbf24', bgColor: '#f59e0b' },
  5: { name: 'Divine', color: '#06b6d4', bgColor: '#0891b2' }
};

function createItemSVG(type, rarity, size = 80) {
  const color = RARITIES[rarity].color;
  const bgColor = RARITIES[rarity].bgColor;
  const id = Date.now() + Math.random();
  
  const svgs = {
    sword: `<svg width="${size}" height="${size}" viewBox="0 0 100 100"><defs><linearGradient id="g${id}"><stop offset="0%" stop-color="${color}"/><stop offset="100%" stop-color="${bgColor}"/></linearGradient></defs><rect x="45" y="10" width="10" height="60" fill="url(#g${id})" rx="2"/><rect x="35" y="65" width="30" height="8" fill="${color}" rx="2"/><circle cx="50" cy="73" r="6" fill="${bgColor}"/><rect x="48" y="75" width="4" height="15" fill="${color}" rx="2"/></svg>`,
    bow: `<svg width="${size}" height="${size}" viewBox="0 0 100 100"><path d="M 30 20 Q 20 50 30 80" stroke="${color}" stroke-width="4" fill="none"/><path d="M 30 20 L 70 50 L 30 80" stroke="${bgColor}" stroke-width="2" fill="none"/><line x1="30" y1="20" x2="30" y2="80" stroke="${color}" stroke-width="2"/></svg>`,
    potion: `<svg width="${size}" height="${size}" viewBox="0 0 100 100"><rect x="35" y="30" width="30" height="50" fill="${color}" rx="5"/><rect x="40" y="20" width="20" height="15" fill="${bgColor}" rx="2"/><circle cx="50" cy="22" r="3" fill="${color}"/></svg>`,
    armor: `<svg width="${size}" height="${size}" viewBox="0 0 100 100"><path d="M 50 20 L 30 30 L 30 70 L 50 80 L 70 70 L 70 30 Z" fill="${color}" stroke="${bgColor}" stroke-width="2"/><circle cx="50" cy="45" r="8" fill="${bgColor}"/></svg>`,
    food: `<svg width="${size}" height="${size}" viewBox="0 0 100 100"><circle cx="50" cy="50" r="25" fill="${color}"/><circle cx="45" cy="45" r="20" fill="${bgColor}"/></svg>`,
    block: `<svg width="${size}" height="${size}" viewBox="0 0 100 100"><rect x="25" y="35" width="50" height="50" fill="${bgColor}"/><polygon points="25,35 50,20 75,35" fill="${color}"/><polygon points="75,35 75,85 50,70 50,20" fill="${color}" opacity="0.7"/></svg>`,
    resource: `<svg width="${size}" height="${size}" viewBox="0 0 100 100"><polygon points="50,15 65,35 85,40 67,57 72,78 50,67 28,78 33,57 15,40 35,35" fill="${color}"/></svg>`,
    music: `<svg width="${size}" height="${size}" viewBox="0 0 100 100"><circle cx="35" cy="70" r="12" fill="${color}"/><circle cx="65" cy="65" r="12" fill="${bgColor}"/><rect x="33" y="30" width="4" height="40" fill="${color}"/><rect x="63" y="25" width="4" height="40" fill="${bgColor}"/></svg>`,
    tool: `<svg width="${size}" height="${size}" viewBox="0 0 100 100"><rect x="20" y="60" width="60" height="15" fill="${color}" rx="3"/><rect x="45" y="20" width="10" height="50" fill="${bgColor}" rx="2"/></svg>`,
    gem: `<svg width="${size}" height="${size}" viewBox="0 0 100 100"><polygon points="50,10 70,30 65,60 50,80 35,60 30,30" fill="${color}"/></svg>`
  };
  return svgs[type] || svgs.resource;
}

function formatMoney(amount) {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(2)}K`;
  return `$${Math.floor(amount)}`;
}

function updateMoney() {
  document.getElementById('money').textContent = formatMoney(playerData.money);
}

window.playSound = function(type) {
  const audio = document.getElementById(`audio-${type}`);
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }
}

function selectRandomItem(caseData) {
  const totalWeight = caseData.items.reduce((a, b) => a + b.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of caseData.items) {
    random -= item.weight;
    if (random <= 0) return { ...item };
  }
  return { ...caseData.items[0] };
}

// 30 TOTAL CASES - Original 10 + 20 NEW!
const CASES = [
  // Original 10 cases
  { id: 'resources', name: 'RESOURCES CASE', price: 12, image: 'images/resourcescase.png', items: [
    { name: 'Coal', rarity: 0, minPrice: 2, maxPrice: 6, weight: 1200, type: 'resource' },
    { name: 'Flint', rarity: 0, minPrice: 3, maxPrice: 8, weight: 1000, type: 'resource' },
    { name: 'Iron', rarity: 1, minPrice: 7, maxPrice: 13, weight: 600, type: 'resource' },
    { name: 'Slime', rarity: 1, minPrice: 10, maxPrice: 16, weight: 500, type: 'resource' },
    { name: 'Redstone', rarity: 1, minPrice: 12, maxPrice: 22, weight: 300, type: 'resource' },
    { name: 'Lapis', rarity: 2, minPrice: 20, maxPrice: 28, weight: 150, type: 'resource' },
    { name: 'Glowstone', rarity: 2, minPrice: 30, maxPrice: 43, weight: 100, type: 'resource' },
    { name: 'Gold', rarity: 2, minPrice: 70, maxPrice: 110, weight: 70, type: 'resource' },
    { name: 'Diamond', rarity: 3, minPrice: 280, maxPrice: 450, weight: 45, type: 'resource' },
    { name: 'Emerald', rarity: 3, minPrice: 380, maxPrice: 600, weight: 30, type: 'resource' },
    { name: 'Nether Star', rarity: 4, minPrice: 800, maxPrice: 1000, weight: 15, type: 'resource' }
  ]},
  { id: 'food', name: 'FOOD CASE', price: 30, image: 'images/foodcase.png', items: [
    { name: 'Rotten Flesh', rarity: 0, minPrice: 2, maxPrice: 5, weight: 1100, type: 'food' },
    { name: 'Bread', rarity: 0, minPrice: 5, maxPrice: 10, weight: 1000, type: 'food' },
    { name: 'Carrot', rarity: 1, minPrice: 6, maxPrice: 10, weight: 800, type: 'food' },
    { name: 'Apple', rarity: 1, minPrice: 6, maxPrice: 11, weight: 750, type: 'food' },
    { name: 'Chicken', rarity: 1, minPrice: 20, maxPrice: 34, weight: 500, type: 'food' },
    { name: 'Beef', rarity: 2, minPrice: 20, maxPrice: 34, weight: 400, type: 'food' },
    { name: 'Porkchop', rarity: 2, minPrice: 20, maxPrice: 35, weight: 350, type: 'food' },
    { name: 'Mushrooms', rarity: 2, minPrice: 120, maxPrice: 280, weight: 200, type: 'food' },
    { name: 'Pumpkin Pie', rarity: 3, minPrice: 140, maxPrice: 300, weight: 150, type: 'food' },
    { name: 'Cookie', rarity: 3, minPrice: 330, maxPrice: 530, weight: 100, type: 'food' },
    { name: 'Golden Carrot', rarity: 4, minPrice: 640, maxPrice: 765, weight: 40, type: 'food' },
    { name: 'Golden Apple', rarity: 4, minPrice: 640, maxPrice: 800, weight: 30, type: 'food' }
  ]},
  { id: 'swords', name: 'SWORDS CASE', price: 35, image: 'images/swordscase.png', items: [
    { name: 'Wooden Sword', rarity: 0, minPrice: 3, maxPrice: 5, weight: 1000, type: 'sword' },
    { name: 'Stone Sword', rarity: 0, minPrice: 4, maxPrice: 7, weight: 850, type: 'sword' },
    { name: 'Iron Sword', rarity: 1, minPrice: 12, maxPrice: 20, weight: 600, type: 'sword' },
    { name: 'Lapis Sword', rarity: 2, minPrice: 50, maxPrice: 60, weight: 250, type: 'sword' },
    { name: 'Golden Sword', rarity: 2, minPrice: 100, maxPrice: 175, weight: 120, type: 'sword' },
    { name: 'Ender Sword', rarity: 3, minPrice: 200, maxPrice: 250, weight: 80, type: 'sword' },
    { name: 'Diamond Sword', rarity: 4, minPrice: 560, maxPrice: 940, weight: 30, type: 'sword' },
    { name: 'Emerald Sword', rarity: 4, minPrice: 1500, maxPrice: 3000, weight: 15, type: 'sword' }
  ]},
  { id: 'shooting', name: 'SHOOTING CASE', price: 40, image: 'images/shootingcase.png', items: [
    { name: 'Arrow', rarity: 0, minPrice: 3, maxPrice: 8, weight: 1000, type: 'bow' },
    { name: 'Wooden Bow', rarity: 0, minPrice: 4, maxPrice: 12, weight: 800, type: 'bow' },
    { name: 'Wooden Crossbow', rarity: 1, minPrice: 7, maxPrice: 16, weight: 650, type: 'bow' },
    { name: 'Trident', rarity: 1, minPrice: 13, maxPrice: 22, weight: 400, type: 'bow' },
    { name: 'Golden Arrow', rarity: 2, minPrice: 25, maxPrice: 40, weight: 220, type: 'bow' },
    { name: 'Diamond Arrow', rarity: 3, minPrice: 50, maxPrice: 150, weight: 100, type: 'bow' },
    { name: 'Emerald Bow', rarity: 4, minPrice: 950, maxPrice: 1500, weight: 45, type: 'bow' },
    { name: 'Emerald Trident', rarity: 4, minPrice: 1500, maxPrice: 2300, weight: 20, type: 'bow' }
  ]},
  { id: 'music', name: 'MUSIC CASE', price: 60, image: 'images/musiccase.png', items: [
    { name: 'Music Disc 1', rarity: 0, minPrice: 8, maxPrice: 20, weight: 900, type: 'music' },
    { name: 'Music Disc 2', rarity: 1, minPrice: 25, maxPrice: 50, weight: 700, type: 'music' },
    { name: 'Music Disc 5', rarity: 2, minPrice: 25, maxPrice: 53, weight: 400, type: 'music' },
    { name: 'Music Disc 8', rarity: 3, minPrice: 25, maxPrice: 56, weight: 200, type: 'music' },
    { name: 'Music Disc 11', rarity: 4, minPrice: 550, maxPrice: 740, weight: 70, type: 'music' },
    { name: 'Music Disc 13', rarity: 4, minPrice: 950, maxPrice: 1100, weight: 40, type: 'music' }
  ]},
  { id: 'armor', name: 'ARMOR CASE', price: 110, image: 'images/armorcase.png', items: [
    { name: 'Leather Boots', rarity: 0, minPrice: 10, maxPrice: 22, weight: 850, type: 'armor' },
    { name: 'Iron Helmet', rarity: 2, minPrice: 35, maxPrice: 65, weight: 400, type: 'armor' },
    { name: 'Diamond Boots', rarity: 3, minPrice: 730, maxPrice: 850, weight: 150, type: 'armor' },
    { name: 'Diamond Chestplate', rarity: 3, minPrice: 800, maxPrice: 900, weight: 100, type: 'armor' },
    { name: 'Emerald Boots', rarity: 4, minPrice: 1800, maxPrice: 2000, weight: 70, type: 'armor' },
    { name: 'Elytra', rarity: 4, minPrice: 2650, maxPrice: 3000, weight: 40, type: 'armor' }
  ]},
  { id: 'blocks', name: 'BLOCKS CASE', price: 150, image: 'images/blockscase.png', items: [
    { name: 'Workbench', rarity: 0, minPrice: 40, maxPrice: 55, weight: 800, type: 'block' },
    { name: 'Chest', rarity: 0, minPrice: 55, maxPrice: 60, weight: 750, type: 'block' },
    { name: 'Furnace', rarity: 1, minPrice: 55, maxPrice: 65, weight: 650, type: 'block' },
    { name: 'Golden Block', rarity: 2, minPrice: 300, maxPrice: 550, weight: 250, type: 'block' },
    { name: 'Obsidian Block', rarity: 3, minPrice: 700, maxPrice: 800, weight: 180, type: 'block' },
    { name: 'Diamond Block', rarity: 3, minPrice: 2000, maxPrice: 2300, weight: 100, type: 'block' },
    { name: 'Beacon', rarity: 4, minPrice: 8500, maxPrice: 9300, weight: 25, type: 'block' }
  ]},
  { id: 'potion', name: 'POTION CASE', price: 350, image: 'images/potioncase.png', items: [
    { name: 'Potion of Swiftness', rarity: 1, minPrice: 50, maxPrice: 100, weight: 600, type: 'potion' },
    { name: 'Potion of Healing', rarity: 2, minPrice: 100, maxPrice: 200, weight: 400, type: 'potion' },
    { name: 'Potion of Regeneration', rarity: 3, minPrice: 300, maxPrice: 500, weight: 200, type: 'potion' },
    { name: 'Potion of Luck', rarity: 4, minPrice: 800, maxPrice: 1200, weight: 80, type: 'potion' },
    { name: 'Dragon Breath', rarity: 4, minPrice: 1500, maxPrice: 2500, weight: 40, type: 'potion' }
  ]},
  { id: 'emerald', name: 'EMERALD CASE', price: 600, image: 'images/emeraldcase.png', items: [
    { name: 'Emerald Arrow', rarity: 3, minPrice: 400, maxPrice: 600, weight: 300, type: 'bow' },
    { name: 'Emerald Shield', rarity: 3, minPrice: 500, maxPrice: 700, weight: 280, type: 'armor' },
    { name: 'Emerald Helmet', rarity: 4, minPrice: 800, maxPrice: 1200, weight: 200, type: 'armor' },
    { name: 'Emerald Sword', rarity: 4, minPrice: 1500, maxPrice: 2200, weight: 100, type: 'sword' },
    { name: 'Emerald Block', rarity: 4, minPrice: 2500, maxPrice: 3500, weight: 50, type: 'block' }
  ]},
  { id: 'super', name: 'SUPER CASE', price: 1000, image: 'images/supercase.png', items: [
    { name: 'Diamond Sword', rarity: 3, minPrice: 800, maxPrice: 1200, weight: 200, type: 'sword' },
    { name: 'Dragon Breath', rarity: 4, minPrice: 1500, maxPrice: 2500, weight: 120, type: 'potion' },
    { name: 'Emerald Sword', rarity: 4, minPrice: 2000, maxPrice: 3000, weight: 100, type: 'sword' },
    { name: 'Beacon', rarity: 4, minPrice: 5000, maxPrice: 7000, weight: 70, type: 'block' },
    { name: 'Nether Star', rarity: 5, minPrice: 8000, maxPrice: 12000, weight: 50, type: 'resource' },
    { name: 'Divine Sword', rarity: 5, minPrice: 10000, maxPrice: 15000, weight: 30, type: 'sword' }
  ]},
  
  // 20 NEW CASES START HERE!
  { id: 'tools', name: 'TOOLS CASE', price: 75, image: 'images/toolscase.png', items: [
    { name: 'Wooden Pickaxe', rarity: 0, minPrice: 5, maxPrice: 10, weight: 900, type: 'tool' },
    { name: 'Stone Axe', rarity: 0, minPrice: 6, maxPrice: 12, weight: 850, type: 'tool' },
    { name: 'Iron Pickaxe', rarity: 1, minPrice: 20, maxPrice: 35, weight: 600, type: 'tool' },
    { name: 'Iron Shovel', rarity: 1, minPrice: 18, maxPrice: 32, weight: 580, type: 'tool' },
    { name: 'Golden Pickaxe', rarity: 2, minPrice: 80, maxPrice: 150, weight: 300, type: 'tool' },
    { name: 'Diamond Pickaxe', rarity: 3, minPrice: 500, maxPrice: 800, weight: 150, type: 'tool' },
    { name: 'Netherite Pickaxe', rarity: 4, minPrice: 1800, maxPrice: 2500, weight: 50, type: 'tool' }
  ]},
  { id: 'gems', name: 'GEMS CASE', price: 200, image: 'images/gemscase.png', items: [
    { name: 'Quartz', rarity: 1, minPrice: 50, maxPrice: 100, weight: 700, type: 'gem' },
    { name: 'Amethyst', rarity: 2, minPrice: 150, maxPrice: 300, weight: 500, type: 'gem' },
    { name: 'Ruby', rarity: 3, minPrice: 400, maxPrice: 700, weight: 300, type: 'gem' },
    { name: 'Sapphire', rarity: 3, minPrice: 450, maxPrice: 750, weight: 250, type: 'gem' },
    { name: 'Black Diamond', rarity: 4, minPrice: 2000, maxPrice: 4000, weight: 80, type: 'gem' },
    { name: 'Dragon Egg', rarity: 5, minPrice: 15000, maxPrice: 25000, weight: 20, type: 'gem' }
  ]},
  { id: 'nether', name: 'NETHER CASE', price: 450, image: 'images/nethercase.png', items: [
    { name: 'Netherrack', rarity: 0, minPrice: 10, maxPrice: 25, weight: 800, type: 'block' },
    { name: 'Soul Sand', rarity: 1, minPrice: 40, maxPrice: 80, weight: 600, type: 'block' },
    { name: 'Magma Cream', rarity: 2, minPrice: 120, maxPrice: 200, weight: 400, type: 'resource' },
    { name: 'Blaze Rod', rarity: 2, minPrice: 200, maxPrice: 350, weight: 300, type: 'resource' },
    { name: 'Wither Skeleton Skull', rarity: 3, minPrice: 800, maxPrice: 1200, weight: 150, type: 'armor' },
    { name: 'Netherite Ingot', rarity: 4, minPrice: 2500, maxPrice: 4000, weight: 70, type: 'resource' }
  ]},
  { id: 'end', name: 'END CASE', price: 800, image: 'images/endcase.png', items: [
    { name: 'End Stone', rarity: 1, minPrice: 80, maxPrice: 150, weight: 600, type: 'block' },
    { name: 'Chorus Fruit', rarity: 2, minPrice: 200, maxPrice: 350, weight: 400, type: 'food' },
    { name: 'Ender Pearl', rarity: 2, minPrice: 300, maxPrice: 500, weight: 300, type: 'resource' },
    { name: 'Shulker Shell', rarity: 3, minPrice: 1000, maxPrice: 1800, weight: 150, type: 'resource' },
    { name: 'Elytra Wings', rarity: 4, minPrice: 4000, maxPrice: 6000, weight: 60, type: 'armor' },
    { name: 'Dragon Head', rarity: 4, minPrice: 8000, maxPrice: 12000, weight: 30, type: 'armor' }
  ]},
  { id: 'enchanted', name: 'ENCHANTED CASE', price: 550, image: 'images/enchantedcase.png', items: [
    { name: 'Enchanted Book I', rarity: 1, minPrice: 100, maxPrice: 200, weight: 600, type: 'resource' },
    { name: 'Enchanted Book II', rarity: 2, minPrice: 250, maxPrice: 450, weight: 400, type: 'resource' },
    { name: 'Enchanted Book III', rarity: 3, minPrice: 600, maxPrice: 1000, weight: 200, type: 'resource' },
    { name: 'Mending Book', rarity: 4, minPrice: 2500, maxPrice: 4000, weight: 80, type: 'resource' },
    { name: 'Sharpness V Book', rarity: 4, minPrice: 4000, maxPrice: 6000, weight: 30, type: 'resource' }
  ]},
  { id: 'ocean', name: 'OCEAN CASE', price: 120, image: 'images/oceancase.png', items: [
    { name: 'Kelp', rarity: 0, minPrice: 5, maxPrice: 15, weight: 800, type: 'food' },
    { name: 'Tropical Fish', rarity: 1, minPrice: 20, maxPrice: 40, weight: 600, type: 'food' },
    { name: 'Prismarine Shard', rarity: 2, minPrice: 80, maxPrice: 150, weight: 400, type: 'resource' },
    { name: 'Heart of the Sea', rarity: 3, minPrice: 800, maxPrice: 1200, weight: 150, type: 'gem' },
    { name: 'Trident', rarity: 4, minPrice: 3000, maxPrice: 5000, weight: 40, type: 'bow' }
  ]},
  { id: 'village', name: 'VILLAGE CASE', price: 90, image: 'images/villagecase.png', items: [
    { name: 'Hay Bale', rarity: 0, minPrice: 8, maxPrice: 18, weight: 800, type: 'block' },
    { name: 'Bell', rarity: 1, minPrice: 30, maxPrice: 60, weight: 600, type: 'block' },
    { name: 'Lectern', rarity: 1, minPrice: 40, maxPrice: 70, weight: 500, type: 'block' },
    { name: 'Smithing Table', rarity: 2, minPrice: 150, maxPrice: 250, weight: 200, type: 'block' },
    { name: 'Totem of Undying', rarity: 4, minPrice: 5000, maxPrice: 8000, weight: 30, type: 'resource' }
  ]},
  { id: 'rareblocks', name: 'RARE BLOCKS', price: 380, image: 'images/rareblockscase.png', items: [
    { name: 'Sponge', rarity: 2, minPrice: 200, maxPrice: 350, weight: 500, type: 'block' },
    { name: 'Ancient Debris', rarity: 3, minPrice: 800, maxPrice: 1200, weight: 300, type: 'block' },
    { name: 'Crying Obsidian', rarity: 3, minPrice: 900, maxPrice: 1400, weight: 250, type: 'block' },
    { name: 'Reinforced Deepslate', rarity: 4, minPrice: 3000, maxPrice: 5000, weight: 80, type: 'block' }
  ]},
  { id: 'megasword', name: 'MEGA SWORD', price: 700, image: 'images/megaswordcase.png', items: [
    { name: 'Netherite Sword', rarity: 3, minPrice: 1500, maxPrice: 2500, weight: 300, type: 'sword' },
    { name: 'Fire Aspect Sword', rarity: 3, minPrice: 1800, maxPrice: 2800, weight: 250, type: 'sword' },
    { name: 'God Sword', rarity: 4, minPrice: 6000, maxPrice: 10000, weight: 100, type: 'sword' },
    { name: 'Ultimate Blade', rarity: 5, minPrice: 18000, maxPrice: 28000, weight: 30, type: 'sword' }
  ]},
  { id: 'megaarmor', name: 'MEGA ARMOR', price: 850, image: 'images/megaarmorcase.png', items: [
    { name: 'Netherite Helmet', rarity: 3, minPrice: 1800, maxPrice: 2800, weight: 300, type: 'armor' },
    { name: 'Netherite Chestplate', rarity: 3, minPrice: 2000, maxPrice: 3000, weight: 280, type: 'armor' },
    { name: 'Full Netherite Set', rarity: 4, minPrice: 8000, maxPrice: 12000, weight: 80, type: 'armor' },
    { name: 'God Armor Set', rarity: 5, minPrice: 20000, maxPrice: 35000, weight: 25, type: 'armor' }
  ]},
  { id: 'lucky', name: 'LUCKY CASE', price: 1500, image: 'images/luckycase.png', items: [
    { name: 'Lucky Block', rarity: 3, minPrice: 2000, maxPrice: 3500, weight: 250, type: 'block' },
    { name: 'Golden Lucky Block', rarity: 4, minPrice: 5000, maxPrice: 8000, weight: 120, type: 'block' },
    { name: 'Rainbow Lucky Block', rarity: 5, minPrice: 25000, maxPrice: 40000, weight: 30, type: 'block' }
  ]},
  { id: 'ancient', name: 'ANCIENT CASE', price: 2000, image: 'images/ancientcase.png', items: [
    { name: 'Ancient Fragment', rarity: 3, minPrice: 2500, maxPrice: 4000, weight: 300, type: 'resource' },
    { name: 'Ancient Relic', rarity: 4, minPrice: 6000, maxPrice: 10000, weight: 150, type: 'gem' },
    { name: 'Ancient Crown', rarity: 5, minPrice: 20000, maxPrice: 35000, weight: 40, type: 'armor' }
  ]},
  { id: 'cosmic', name: 'COSMIC CASE', price: 3500, image: 'images/cosmiccase.png', items: [
    { name: 'Star Fragment', rarity: 4, minPrice: 8000, maxPrice: 12000, weight: 200, type: 'gem' },
    { name: 'Galaxy Sword', rarity: 5, minPrice: 25000, maxPrice: 40000, weight: 60, type: 'sword' },
    { name: 'Universe Crystal', rarity: 5, minPrice: 50000, maxPrice: 80000, weight: 15, type: 'gem' }
  ]},
  { id: 'ultimate', name: 'ULTIMATE CASE', price: 5000, image: 'images/ultimatecase.png', items: [
    { name: 'Ultimate Sword', rarity: 5, minPrice: 40000, maxPrice: 60000, weight: 100, type: 'sword' },
    { name: 'Ultimate Armor', rarity: 5, minPrice: 50000, maxPrice: 70000, weight: 80, type: 'armor' },
    { name: 'Infinity Stone', rarity: 5, minPrice: 100000, maxPrice: 150000, weight: 20, type: 'gem' }
  ]},
  { id: 'mystery', name: 'MYSTERY CASE', price: 500, image: 'images/mysterycase.png', items: [
    { name: 'Mystery Box', rarity: 2, minPrice: 300, maxPrice: 600, weight: 400, type: 'block' },
    { name: 'Rare Mystery Box', rarity: 3, minPrice: 1000, maxPrice: 2000, weight: 200, type: 'block' },
    { name: 'Legendary Mystery Box', rarity: 4, minPrice: 5000, maxPrice: 10000, weight: 50, type: 'block' }
  ]},
  { id: 'wizard', name: 'WIZARD CASE', price: 650, image: 'images/wizardcase.png', items: [
    { name: 'Wizard Hat', rarity: 2, minPrice: 400, maxPrice: 700, weight: 400, type: 'armor' },
    { name: 'Magic Wand', rarity: 3, minPrice: 1200, maxPrice: 2000, weight: 200, type: 'tool' },
    { name: 'Wizard Staff', rarity: 4, minPrice: 4000, maxPrice: 7000, weight: 80, type: 'tool' }
  ]},
  { id: 'ice', name: 'ICE CASE', price: 300, image: 'images/icecase.png', items: [
    { name: 'Ice Block', rarity: 1, minPrice: 60, maxPrice: 120, weight: 600, type: 'block' },
    { name: 'Packed Ice', rarity: 2, minPrice: 200, maxPrice: 400, weight: 300, type: 'block' },
    { name: 'Blue Ice', rarity: 3, minPrice: 800, maxPrice: 1500, weight: 100, type: 'block' },
    { name: 'Frozen Heart', rarity: 4, minPrice: 4000, maxPrice: 7000, weight: 40, type: 'gem' }
  ]},
  { id: 'fire', name: 'FIRE CASE', price: 400, image: 'images/firecase.png', items: [
    { name: 'Fire Charge', rarity: 1, minPrice: 80, maxPrice: 150, weight: 600, type: 'resource' },
    { name: 'Lava Bucket', rarity: 2, minPrice: 250, maxPrice: 500, weight: 300, type: 'tool' },
    { name: 'Fire Sword', rarity: 3, minPrice: 1500, maxPrice: 2500, weight: 100, type: 'sword' },
    { name: 'Inferno Gem', rarity: 4, minPrice: 5000, maxPrice: 9000, weight: 40, type: 'gem' }
  ]},
  { id: 'nature', name: 'NATURE CASE', price: 250, image: 'images/naturecase.png', items: [
    { name: 'Oak Sapling', rarity: 0, minPrice: 20, maxPrice: 40, weight: 800, type: 'resource' },
    { name: 'Bamboo', rarity: 1, minPrice: 60, maxPrice: 120, weight: 500, type: 'resource' },
    { name: 'Cactus', rarity: 1, minPrice: 70, maxPrice: 130, weight: 450, type: 'block' },
    { name: 'Nature Staff', rarity: 3, minPrice: 1800, maxPrice: 3000, weight: 100, type: 'tool' },
    { name: 'Ancient Tree', rarity: 4, minPrice: 6000, maxPrice: 10000, weight: 30, type: 'block' }
  ]},
  { id: 'god', name: 'GOD CASE', price: 10000, image: 'images/godcase.png', items: [
    { name: 'God Sword', rarity: 5, minPrice: 80000, maxPrice: 120000, weight: 80, type: 'sword' },
    { name: 'God Armor', rarity: 5, minPrice: 100000, maxPrice: 150000, weight: 70, type: 'armor' },
    { name: 'God Bow', rarity: 5, minPrice: 90000, maxPrice: 130000, weight: 75, type: 'bow' },
    { name: 'Creators Essence', rarity: 5, minPrice: 200000, maxPrice: 300000, weight: 15, type: 'gem' }
  ]}
];

window.showSignup = function() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('signup-form').style.display = 'flex';
  document.getElementById('auth-error').textContent = '';
}

window.showLogin = function() {
  document.getElementById('signup-form').style.display = 'none';
  document.getElementById('login-form').style.display = 'flex';
  document.getElementById('auth-error').textContent = '';
}

window.signup = async function() {
  const username = document.getElementById('signup-username').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirm = document.getElementById('signup-confirm').value;
  const errorEl = document.getElementById('auth-error');
  
  if (!username || !password) {
    errorEl.textContent = 'Please fill in all fields';
    return;
  }
  
  if (password !== confirm) {
    errorEl.textContent = 'Passwords do not match';
    return;
  }
  
  if (password.length < 6) {
    errorEl.textContent = 'Password must be at least 6 characters';
    return;
  }
  
  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email: `${username}@minecraft-sim.com`,
      password: password,
    });
    
    if (error) throw error;
    
    const { error: dbError } = await supabaseClient
      .from('player_data')
      .insert([{
        id: data.user.id,
        username: username,
        money: 100,
        inventory: [],
        total_cases_opened: 0,
        total_spent: 0,
        total_earned: 0,
        daily_streak: 1
      }]);
    
    if (dbError) throw dbError;
    
    currentUser = { id: data.user.id, username };
    await loadPlayerData();
    showMainApp();
  } catch (error) {
    errorEl.textContent = error.message;
  }
}

window.login = async function() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('auth-error');
  
  if (!username || !password) {
    errorEl.textContent = 'Please fill in all fields';
    return;
  }
  
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: `${username}@minecraft-sim.com`,
      password: password,
    });
    
    if (error) throw error;
    
    currentUser = { id: data.user.id, username };
    await loadPlayerData();
    showMainApp();
  } catch (error) {
    errorEl.textContent = 'Invalid username or password';
  }
}

window.logout = async function() {
  await supabaseClient.auth.signOut();
  location.reload();
}

function showMainApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('main-app').style.display = 'block';
  document.getElementById('username-display').textContent = currentUser.username;
  initApp();
}

async function loadPlayerData() {
  try {
    const { data, error } = await supabaseClient
      .from('player_data')
      .select('*')
      .eq('id', currentUser.id)
      .single();
    
    if (error) throw error;
    
    playerData = {
      money: parseFloat(data.money) || 100,
      inventory: data.inventory || [],
      totalCasesOpened: data.total_cases_opened || 0,
      bestItemWon: data.best_item_won,
      totalSpent: parseFloat(data.total_spent) || 0,
      totalEarned: parseFloat(data.total_earned) || 0,
      dailyStreak: data.daily_streak || 1,
      lastDailyClaim: data.last_daily_claim,
      shopItems: data.shop_items || []
    };
    
    updateMoney();
    checkDailyReward();
    checkShopRefresh();
  } catch (error) {
    console.error('Error loading player data:', error);
  }
}

async function savePlayerData() {
  if (!currentUser) return;
  
  try {
    const { error } = await supabaseClient
      .from('player_data')
      .update({
        money: playerData.money,
        inventory: playerData.inventory,
        total_cases_opened: playerData.totalCasesOpened,
        best_item_won: playerData.bestItemWon,
        total_spent: playerData.totalSpent,
        total_earned: playerData.totalEarned,
        daily_streak: playerData.dailyStreak,
        last_daily_claim: playerData.lastDailyClaim,
        shop_items: playerData.shopItems,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentUser.id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error saving player data:', error);
  }
}

window.switchTab = function(tab) {
  document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  event.target.classList.add('active');
  document.getElementById(`${tab}-tab`).classList.add('active');
  
  if (tab === 'leaderboard') {
    loadLeaderboard();
  } else if (tab === 'upgrades') {
    renderUpgradeInventory();
  }
}

function checkDailyReward() {
  const today = new Date().toDateString();
  if (playerData.lastDailyClaim !== today) {
    const btn = document.getElementById('daily-reward-btn');
    btn.style.display = 'block';
    document.getElementById('daily-amount').textContent = playerData.dailyStreak * 100;
  }
}

window.claimDaily = async function() {
  const today = new Date().toDateString();
  if (playerData.lastDailyClaim === today) return;
  
  playSound('button');
  const reward = playerData.dailyStreak * 100;
  playerData.money += reward;
  playerData.dailyStreak++;
  playerData.lastDailyClaim = today;
  
  updateMoney();
  await savePlayerData();
  
  document.getElementById('daily-reward-btn').style.display = 'none';
}

function checkShopRefresh() {
  const today = new Date().toDateString();
  if (!playerData.lastShopRefresh || playerData.lastShopRefresh !== today) {
    generateShopItems();
    playerData.lastShopRefresh = today;
    savePlayerData();
  }
  renderShop();
}

function generateShopItems() {
  const allItems = CASES.flatMap(c => 
    c.items.filter(item => item.rarity >= 2).map(item => ({
      ...item,
      shopPrice: Math.round(item.maxPrice * 1.5)
    }))
  );
  
  const shuffled = allItems.sort(() => Math.random() - 0.5);
  playerData.shopItems = shuffled.slice(0, 8);
}

function renderShop() {
  const grid = document.getElementById('shop-grid');
  grid.innerHTML = '';
  
  playerData.shopItems.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = `shop-item rarity-${item.rarity}`;
    
    const canBuy = playerData.money >= item.shopPrice;
    
    card.innerHTML = `
      <div class="item-image-container bg-rarity-${item.rarity}">
        ${createItemSVG(item.type, item.rarity, 70)}
      </div>
      <div class="item-name" style="font-size: 12px; text-align: center; margin: 12px 0; font-weight: 600; color: ${RARITIES[item.rarity].color}">
        ${item.name}
      </div>
      <button class="buy-btn" ${!canBuy ? 'disabled' : ''} onclick="buyShopItem(${idx})">
        BUY $${item.shopPrice}
      </button>
    `;
    
    grid.appendChild(card);
  });
}

window.buyShopItem = async function(index) {
  const item = playerData.shopItems[index];
  if (playerData.money < item.shopPrice) return;
  
  playSound('button');
  playerData.money -= item.shopPrice;
  
  const newItem = {
    ...item,
    durability: 100,
    value: item.maxPrice,
    id: Date.now() + Math.random()
  };
  
  playerData.inventory.push(newItem);
  updateMoney();
  await savePlayerData();
  renderShop();
  renderInventory();
}

function renderCases() {
  const grid = document.getElementById('cases-grid');
  grid.innerHTML = '';
  
  CASES.forEach(caseItem => {
    const card = document.createElement('div');
    card.className = 'case-card';
    card.onclick = () => selectCaseView(caseItem);
    
    card.innerHTML = `
      <img src="${caseItem.image}" alt="${caseItem.name}" class="case-image" onerror="this.style.display='none'">
      <div class="case-name">${caseItem.name}</div>
      <div class="case-price">$${caseItem.price}</div>
    `;
    
    grid.appendChild(card);
  });
}

function selectCaseView(caseItem) {
  playSound('button');
  selectedCase = caseItem;
  
  document.getElementById('cases-tab').style.display = 'none';
  document.getElementById('case-view').style.display = 'block';
  document.getElementById('case-title').textContent = caseItem.name;
  document.getElementById('case-price').textContent = caseItem.price;
  
  const preview = document.getElementById('case-items-preview');
  preview.innerHTML = '';
  
  const goodItems = caseItem.items.filter(item => item.rarity >= 1).slice(0, 6);
  goodItems.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.className = `preview-item rarity-${item.rarity}`;
    itemDiv.style.borderColor = RARITIES[item.rarity].color;
    
    itemDiv.innerHTML = `
      <div class="item-icon">${createItemSVG(item.type, item.rarity, 70)}</div>
      <div class="item-name">${item.name}</div>
    `;
    
    preview.appendChild(itemDiv);
  });
  
  const btn = document.getElementById('open-case-btn');
  btn.disabled = playerData.money < caseItem.price;
}

window.closeCaseView = function() {
  playSound('button');
  document.getElementById('case-view').style.display = 'none';
  document.getElementById('cases-tab').style.display = 'block';
  selectedCase = null;
}

window.openCase = async function() {
  if (!selectedCase || playerData.money < selectedCase.price) return;
  
  playSound('button');
  playerData.money -= selectedCase.price;
  playerData.totalSpent += selectedCase.price;
  playerData.totalCasesOpened++;
  updateMoney();
  
  const finalItem = selectRandomItem(selectedCase);
  const spinItems = [];
  
  for (let i = 0; i < 30; i++) {
    spinItems.push(selectRandomItem(selectedCase));
  }
  spinItems.push(finalItem);
  for (let i = 0; i < 15; i++) {
    spinItems.push(selectRandomItem(selectedCase));
  }
  
  document.getElementById('case-view').style.display = 'none';
  document.getElementById('spin-screen').style.display = 'block';
  document.getElementById('spin-title').textContent = selectedCase.name;
  
  const container = document.getElementById('spin-items');
  container.innerHTML = '';
  container.classList.remove('animating');
  
  spinItems.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.className = `spin-item rarity-${item.rarity}`;
    itemDiv.style.borderColor = RARITIES[item.rarity].color;
    itemDiv.style.background = `linear-gradient(180deg, ${RARITIES[item.rarity].bgColor}60 0%, ${RARITIES[item.rarity].bgColor}20 100%)`;
    
    itemDiv.innerHTML = `
      ${createItemSVG(item.type, item.rarity, 90)}
      <div style="font-size: 13px; text-align: center; font-weight: 700; margin-top: 14px;">
        ${item.name}
      </div>
    `;
    
    container.appendChild(itemDiv);
  });
  
  setTimeout(() => {
    playSound('spin');
    container.classList.add('animating');
  }, 100);
  
  setTimeout(async () => {
    const durability = Math.floor(Math.random() * 100) + 1;
    const itemValue = finalItem.minPrice + (finalItem.maxPrice - finalItem.minPrice) * (durability / 100);
    
    const newItem = {
      ...finalItem,
      durability,
      value: Math.round(itemValue * 100) / 100,
      id: Date.now()
    };
    
    playerData.inventory.push(newItem);
    
    if (!playerData.bestItemWon || newItem.value > playerData.bestItemWon.value) {
      playerData.bestItemWon = newItem;
    }
    
    await savePlayerData();
    showWinScreen(newItem);
  }, 4200);
}

function showWinScreen(item) {
  playSound('opened');
  document.getElementById('spin-screen').style.display = 'none';
  document.getElementById('win-screen').style.display = 'flex';
  
  document.getElementById('win-value').textContent = item.value.toFixed(2);
  document.getElementById('win-item').innerHTML = createItemSVG(item.type, item.rarity, 160);
  document.getElementById('win-item').style.background = `linear-gradient(135deg, ${RARITIES[item.rarity].color}, ${RARITIES[item.rarity].bgColor})`;
  document.getElementById('win-name').textContent = item.name;
  document.getElementById('win-name').style.background = `linear-gradient(135deg, ${RARITIES[item.rarity].color}, ${RARITIES[item.rarity].bgColor})`;
  document.getElementById('win-durability').textContent = item.durability;
  
  const fill = document.getElementById('win-durability-fill');
  fill.style.width = `${item.durability}%`;
  if (item.durability > 70) {
    fill.style.background = 'linear-gradient(90deg, #22c55e, #16a34a)';
  } else if (item.durability > 30) {
    fill.style.background = 'linear-gradient(90deg, #fbbf24, #f59e0b)';
  } else {
    fill.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
  }
}

window.closeWinScreen = function() {
  playSound('button');
  document.getElementById('win-screen').style.display = 'none';
  document.getElementById('cases-tab').style.display = 'block';
  renderInventory();
}

function renderInventory() {
  const grid = document.getElementById('inventory-grid');
  const empty = document.getElementById('inventory-empty');
  
  document.getElementById('inventory-count').textContent = playerData.inventory.length;
  
  if (playerData.inventory.length === 0) {
    grid.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  
  grid.style.display = 'grid';
  empty.style.display = 'none';
  grid.innerHTML = '';
  
  playerData.inventory.forEach(item => {
    const card = document.createElement('div');
    card.className = `inventory-item ${selectedInventoryItems.includes(item.id) ? 'selected' : ''}`;
    card.onclick = () => toggleInventoryItem(item.id);
    
    card.innerHTML = `
      <div class="item-value">$${item.value.toFixed(2)}</div>
      <div class="item-image-container bg-rarity-${item.rarity}">
        ${createItemSVG(item.type, item.rarity, 65)}
      </div>
      <div class="durability-bar">
        <div class="durability-fill" style="width: ${item.durability}%; background: ${item.durability > 70 ? '#22c55e' : item.durability > 30 ? '#fbbf24' : '#ef4444'}"></div>
      </div>
      <div class="item-name" style="font-size: 11px; text-align: center; font-weight: 600; color: ${RARITIES[item.rarity].color}; margin-top: 8px;">
        ${item.name}
      </div>
    `;
    
    grid.appendChild(card);
  });
  
  updateSellButton();
}

function toggleInventoryItem(id) {
  playSound('select');
  if (selectedInventoryItems.includes(id)) {
    selectedInventoryItems = selectedInventoryItems.filter(i => i !== id);
  } else {
    selectedInventoryItems.push(id);
  }
  renderInventory();
}

function updateSellButton() {
  const btn = document.getElementById('sell-btn');
  if (selectedInventoryItems.length > 0) {
    btn.style.display = 'block';
    const total = playerData.inventory
      .filter(item => selectedInventoryItems.includes(item.id))
      .reduce((sum, item) => sum + item.value, 0);
    document.getElementById('sell-amount').textContent = total.toFixed(2);
  } else {
    btn.style.display = 'none';
  }
}

window.sellItems = async function() {
  if (selectedInventoryItems.length === 0) return;
  
  playSound('sold');
  const totalValue = playerData.inventory
    .filter(item => selectedInventoryItems.includes(item.id))
    .reduce((sum, item) => sum + item.value, 0);
  
  playerData.money += totalValue;
  playerData.totalEarned += totalValue;
  playerData.inventory = playerData.inventory.filter(item => !selectedInventoryItems.includes(item.id));
  selectedInventoryItems = [];
  
  updateMoney();
  await savePlayerData();
  renderInventory();
}

function renderUpgradeInventory() {
  const grid = document.getElementById('upgrade-inventory-grid');
  grid.innerHTML = '';
  
  playerData.inventory.forEach(item => {
    const card = document.createElement('div');
    card.className = 'upgrade-inventory-item';
    card.onclick = () => addToCrafting(item);
    
    card.innerHTML = `
      <div class="item-image-container bg-rarity-${item.rarity}" style="width: 80px; height: 80px; margin: 0 auto 8px;">
        ${createItemSVG(item.type, item.rarity, 60)}
      </div>
      <div style="font-size: 10px; text-align: center; font-weight: 600; color: ${RARITIES[item.rarity].color}">
        ${item.name}
      </div>
    `;
    
    grid.appendChild(card);
  });
}

function addToCrafting(item) {
  const emptySlot = craftingSlots.findIndex(slot => slot === null);
  if (emptySlot === -1) return;
  
  playSound('select');
  craftingSlots[emptySlot] = item;
  playerData.inventory = playerData.inventory.filter(i => i.id !== item.id);
  
  renderCraftingGrid();
  renderUpgradeInventory();
  calculateUpgradeChance();
}

function renderCraftingGrid() {
  craftingSlots.forEach((item, index) => {
    const slot = document.querySelector(`[data-slot="${index}"]`);
    if (item) {
      slot.classList.add('filled');
      slot.innerHTML = `
        ${createItemSVG(item.type, item.rarity, 60)}
        <div class="remove-item" onclick="removeFromCrafting(${index})">×</div>
      `;
    } else {
      slot.classList.remove('filled');
      slot.innerHTML = '';
    }
  });
}

window.removeFromCrafting = function(index) {
  event.stopPropagation();
  const item = craftingSlots[index];
  if (!item) return;
  
  playSound('select');
  craftingSlots[index] = null;
  playerData.inventory.push(item);
  
  renderCraftingGrid();
  renderUpgradeInventory();
  calculateUpgradeChance();
}

function calculateUpgradeChance() {
  const filledSlots = craftingSlots.filter(s => s !== null);
  const btn = document.getElementById('upgrade-btn');
  
  if (filledSlots.length === 0) {
    document.getElementById('success-rate').textContent = '0';
    btn.disabled = true;
    return;
  }
  
  const avgRarity = filledSlots.reduce((sum, item) => sum + item.rarity, 0) / filledSlots.length;
  const baseChance = 70 - (avgRarity * 10) - (filledSlots.length * 2);
  const chance = Math.max(10, Math.min(90, baseChance));
  
  document.getElementById('success-rate').textContent = Math.round(chance);
  btn.disabled = false;
}

window.attemptUpgrade = async function() {
  const filledSlots = craftingSlots.filter(s => s !== null);
  if (filledSlots.length === 0) return;
  
  playSound('button');
  
  const avgRarity = filledSlots.reduce((sum, item) => sum + item.rarity, 0) / filledSlots.length;
  const baseChance = 70 - (avgRarity * 10) - (filledSlots.length * 2);
  const chance = Math.max(10, Math.min(90, baseChance));
  
  const success = Math.random() * 100 < chance;
  
  if (success) {
    const newRarity = Math.min(5, Math.ceil(avgRarity) + 1);
    const randomCase = CASES[Math.floor(Math.random() * CASES.length)];
    const itemsOfRarity = randomCase.items.filter(i => i.rarity === newRarity);
    const newItem = itemsOfRarity[Math.floor(Math.random() * itemsOfRarity.length)] || randomCase.items[0];
    
    const durability = Math.floor(Math.random() * 100) + 1;
    const itemValue = newItem.minPrice + (newItem.maxPrice - newItem.minPrice) * (durability / 100);
    
    const upgradedItem = {
      ...newItem,
      durability,
      value: Math.round(itemValue * 100) / 100,
      id: Date.now()
    };
    
    playerData.inventory.push(upgradedItem);
    alert(`✅ SUCCESS! You got a ${newItem.name}!`);
  } else {
    alert('❌ FAILED! Items were destroyed...');
  }
  
  craftingSlots = Array(9).fill(null);
  renderCraftingGrid();
  renderUpgradeInventory();
  calculateUpgradeChance();
  await savePlayerData();
}

async function loadLeaderboard() {
  try {
    const { data, error } = await supabaseClient
      .from('leaderboard')
      .select('*')
      .order('inventory_value', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    
    renderLeaderboard(data, currentLeaderboardFilter);
  } catch (error) {
    console.error('Error loading leaderboard:', error);
  }
}

function renderLeaderboard(data, sortBy) {
  const list = document.getElementById('leaderboard-list');
  list.innerHTML = '';
  
  let sortedData = [...data];
  if (sortBy === 'money') {
    sortedData.sort((a, b) => parseFloat(b.money) - parseFloat(a.money));
  } else if (sortBy === 'cases') {
    sortedData.sort((a, b) => b.total_cases_opened - a.total_cases_opened);
  }
  
  sortedData.forEach((player, index) => {
    const item = document.createElement('div');
    item.className = `leaderboard-item ${player.username === currentUser?.username ? 'current-user' : ''}`;
    
    const rank = index + 1;
    const value = sortBy === 'value' ? parseFloat(player.inventory_value).toFixed(2) :
                  sortBy === 'money' ? parseFloat(player.money).toFixed(2) :
                  player.total_cases_opened;
    
    item.innerHTML = `
      <div class="rank-number ${rank <= 3 ? 'top-3' : ''}">#${rank}</div>
      <div class="player-info">
        <div class="player-username">${player.username}</div>
        <div class="player-stat">
          ${sortBy === 'value' ? 'Inventory Value' : sortBy === 'money' ? 'Money' : 'Cases Opened'}
        </div>
      </div>
      <div class="player-value">
        ${sortBy === 'cases' ? value : '$' + value}
      </div>
    `;
    
    list.appendChild(item);
  });
}

window.filterLeaderboard = async function(type) {
  currentLeaderboardFilter = type;
  
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  
  await loadLeaderboard();
}

window.showStats = function() {
  playSound('button');
  document.getElementById('stats-modal').style.display = 'flex';
  
  const invValue = playerData.inventory.reduce((sum, item) => sum + item.value, 0);
  
  document.getElementById('stat-cases').textContent = playerData.totalCasesOpened;
  document.getElementById('stat-spent').textContent = playerData.totalSpent.toFixed(2);
  document.getElementById('stat-earned').textContent = playerData.totalEarned.toFixed(2);
  document.getElementById('stat-streak').textContent = playerData.dailyStreak;
  document.getElementById('stat-inv-value').textContent = invValue.toFixed(2);
  document.getElementById('stat-best-item').textContent = playerData.bestItemWon?.name || 'None';
}

window.closeStats = function() {
  playSound('button');
  document.getElementById('stats-modal').style.display = 'none';
}

async function initApp() {
  renderCases();
  renderInventory();
  renderShop();
  renderCraftingGrid();
}

supabaseClient.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    supabaseClient.auth.getUser().then(async ({ data: { user } }) => {
      const { data: playerInfo } = await supabaseClient
        .from('player_data')
        .select('username')
        .eq('id', user.id)
        .single();
      
      if (playerInfo) {
        currentUser = { id: user.id, username: playerInfo.username };
        await loadPlayerData();
        showMainApp();
      }
    });
  }
});

console.log('💰 Commands: giveMoney(amount), setMoney(amount), resetProgress()');

}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
