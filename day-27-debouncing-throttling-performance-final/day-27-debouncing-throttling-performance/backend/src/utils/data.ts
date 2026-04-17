// src/utils/data.ts
// In-memory product dataset for search.
// In production this would be Elasticsearch, Postgres full-text search,
// or a dedicated search service like Typesense / Meilisearch.

export interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  tags: string[];
}

// 60 realistic products across categories for demo search
export const PRODUCTS: Product[] = [
  // Electronics
  { id: '1',  title: 'Sony WH-1000XM5 Headphones',     description: 'Industry-leading noise cancelling wireless headphones with 30hr battery', category: 'Electronics', price: 349.99, tags: ['audio', 'wireless', 'noise-cancelling'] },
  { id: '2',  title: 'Apple AirPods Pro 2nd Gen',       description: 'Active noise cancellation, transparency mode, spatial audio', category: 'Electronics', price: 249.00, tags: ['audio', 'wireless', 'apple'] },
  { id: '3',  title: 'Samsung 65" QLED 4K TV',          description: 'Quantum dot technology, 120Hz refresh rate, smart TV features', category: 'Electronics', price: 1199.99, tags: ['tv', 'display', '4k'] },
  { id: '4',  title: 'Logitech MX Master 3S Mouse',     description: 'Advanced wireless mouse with 8K DPI sensor and USB-C charging', category: 'Electronics', price: 99.99, tags: ['mouse', 'wireless', 'productivity'] },
  { id: '5',  title: 'iPad Pro 12.9" M2',               description: 'Liquid Retina XDR display, M2 chip, USB-C with Thunderbolt', category: 'Electronics', price: 1099.00, tags: ['tablet', 'apple', 'productivity'] },
  { id: '6',  title: 'Mechanical Keyboard TKL',         description: 'Tenkeyless mechanical keyboard with Cherry MX Red switches', category: 'Electronics', price: 129.99, tags: ['keyboard', 'mechanical', 'gaming'] },
  { id: '7',  title: 'Dell UltraSharp 27" Monitor',     description: '4K USB-C monitor with 99% sRGB color accuracy for professionals', category: 'Electronics', price: 579.99, tags: ['monitor', 'display', '4k'] },
  { id: '8',  title: 'Anker 65W GaN Charger',           description: 'Compact 3-port GaN fast charger, charges laptop and phone simultaneously', category: 'Electronics', price: 45.99, tags: ['charger', 'usb-c', 'portable'] },
  { id: '9',  title: 'Bose QuietComfort Earbuds II',    description: 'Personalized noise cancellation, custom fit earbuds', category: 'Electronics', price: 279.00, tags: ['audio', 'earbuds', 'noise-cancelling'] },
  { id: '10', title: 'Raspberry Pi 5 4GB',              description: 'Latest Raspberry Pi with 2.4GHz quad-core CPU and PCIe connector', category: 'Electronics', price: 60.00, tags: ['computing', 'diy', 'linux'] },

  // Books
  { id: '11', title: 'Clean Code by Robert Martin',     description: 'A handbook of agile software craftsmanship', category: 'Books', price: 39.99, tags: ['programming', 'software', 'best-practices'] },
  { id: '12', title: 'The Pragmatic Programmer',        description: 'Your journey to mastery, 20th Anniversary Edition', category: 'Books', price: 49.99, tags: ['programming', 'career', 'software'] },
  { id: '13', title: 'Designing Data-Intensive Apps',   description: 'The big ideas behind reliable, scalable systems', category: 'Books', price: 54.99, tags: ['databases', 'systems', 'architecture'] },
  { id: '14', title: 'JavaScript: The Good Parts',      description: 'Unearthing the excellence in JavaScript by Douglas Crockford', category: 'Books', price: 29.99, tags: ['javascript', 'programming', 'web'] },
  { id: '15', title: 'Atomic Habits',                   description: 'An easy and proven way to build good habits and break bad ones', category: 'Books', price: 18.99, tags: ['productivity', 'self-help', 'habits'] },
  { id: '16', title: 'System Design Interview Vol 2',   description: 'An insider\'s guide to system design questions', category: 'Books', price: 35.99, tags: ['system-design', 'interview', 'architecture'] },
  { id: '17', title: 'You Don\'t Know JS Yet',          description: 'Deep dive into the JavaScript language specification', category: 'Books', price: 24.99, tags: ['javascript', 'programming', 'advanced'] },
  { id: '18', title: 'The Psychology of Money',         description: 'Timeless lessons on wealth, greed, and happiness', category: 'Books', price: 19.99, tags: ['finance', 'investing', 'psychology'] },

  // Sports
  { id: '19', title: 'Yoga Mat Pro 6mm',                description: 'Non-slip TPE yoga mat with alignment lines and carrying strap', category: 'Sports', price: 39.99, tags: ['yoga', 'fitness', 'mat'] },
  { id: '20', title: 'Resistance Bands Set (5-pack)',   description: 'Heavy duty latex bands, 10-50lb resistance levels', category: 'Sports', price: 24.99, tags: ['resistance', 'fitness', 'strength'] },
  { id: '21', title: 'Garmin Forerunner 255 GPS Watch', description: 'GPS running watch with training load and recovery time insights', category: 'Sports', price: 349.99, tags: ['running', 'gps', 'fitness-tracker'] },
  { id: '22', title: 'Adjustable Dumbbell Set 5-52lb',  description: 'Space-saving adjustable dumbbells replace 15 sets of weights', category: 'Sports', price: 299.99, tags: ['weights', 'strength', 'home-gym'] },
  { id: '23', title: 'Foam Roller Deep Tissue',         description: 'High-density foam roller for muscle recovery and trigger points', category: 'Sports', price: 34.99, tags: ['recovery', 'massage', 'fitness'] },
  { id: '24', title: 'Hydration Running Belt',          description: 'Hands-free running belt with 2x water bottles and phone pocket', category: 'Sports', price: 29.99, tags: ['running', 'hydration', 'accessories'] },

  // Home & Kitchen
  { id: '25', title: 'Instant Pot Duo 7-in-1',         description: 'Electric pressure cooker, slow cooker, rice cooker and more', category: 'Home', price: 99.99, tags: ['cooking', 'pressure-cooker', 'kitchen'] },
  { id: '26', title: 'Vitamix 5200 Blender',            description: 'Professional-grade blender with 64oz container', category: 'Home', price: 449.99, tags: ['blender', 'kitchen', 'smoothies'] },
  { id: '27', title: 'Dyson V15 Detect Vacuum',         description: 'Laser dust detection, HEPA filtration, 60min runtime', category: 'Home', price: 699.99, tags: ['vacuum', 'dyson', 'cleaning'] },
  { id: '28', title: 'Nespresso Vertuo Coffee Machine', description: 'Capsule coffee machine with milk frother included', category: 'Home', price: 199.99, tags: ['coffee', 'kitchen', 'espresso'] },
  { id: '29', title: 'Philips Hue Starter Kit',         description: 'Smart LED lights with bridge, voice control compatible', category: 'Home', price: 149.99, tags: ['smart-home', 'lighting', 'iot'] },
  { id: '30', title: 'Cast Iron Skillet 12"',           description: 'Pre-seasoned Lodge cast iron skillet, oven safe to 500°F', category: 'Home', price: 39.99, tags: ['cooking', 'skillet', 'cast-iron'] },

  // Clothing
  { id: '31', title: 'Patagonia Down Jacket',           description: 'Lightweight packable 800-fill down jacket, recycled materials', category: 'Clothing', price: 279.00, tags: ['jacket', 'outdoor', 'warm'] },
  { id: '32', title: 'Levi\'s 501 Original Jeans',     description: 'Classic straight fit jeans in authentic rigid denim', category: 'Clothing', price: 59.99, tags: ['jeans', 'denim', 'casual'] },
  { id: '33', title: 'Nike Dri-FIT Running Shirt',      description: 'Moisture-wicking fabric, reflective details, lightweight', category: 'Clothing', price: 34.99, tags: ['running', 'fitness', 'nike'] },
  { id: '34', title: 'Merino Wool Base Layer',          description: 'Temperature regulating, odor resistant, 100% merino wool', category: 'Clothing', price: 89.99, tags: ['wool', 'outdoor', 'hiking'] },
  { id: '35', title: 'Allbirds Tree Runners',           description: 'Lightweight sustainable sneakers made from eucalyptus fiber', category: 'Clothing', price: 98.00, tags: ['shoes', 'sustainable', 'sneakers'] },

  // Tools
  { id: '36', title: 'DeWalt 20V Drill Driver Kit',    description: 'Brushless motor drill with 2 batteries and fast charger', category: 'Tools', price: 159.99, tags: ['drill', 'dewalt', 'power-tools'] },
  { id: '37', title: 'Leatherman Wave+ Multi-tool',    description: '18-in-1 stainless steel multi-tool with nylon sheath', category: 'Tools', price: 109.99, tags: ['multi-tool', 'outdoor', 'edc'] },
  { id: '38', title: 'Milwaukee M12 Screwdriver',      description: 'Cordless screwdriver with 35in/lbs of torque, USB charging', category: 'Tools', price: 69.99, tags: ['screwdriver', 'milwaukee', 'cordless'] },
  { id: '39', title: 'Stanley FatMax Tape Measure 25\'', description: 'Wide blade, mylar coating, magnetic tip for solo measuring', category: 'Tools', price: 19.99, tags: ['measuring', 'stanley', 'hand-tools'] },
  { id: '40', title: 'Bosch 12V Combo Kit',            description: 'Drill driver and impact driver combo with 2 batteries', category: 'Tools', price: 199.99, tags: ['drill', 'bosch', 'combo-kit'] },

  // Gaming
  { id: '41', title: 'PlayStation 5 DualSense Controller', description: 'Haptic feedback, adaptive triggers, built-in microphone', category: 'Gaming', price: 69.99, tags: ['ps5', 'controller', 'sony'] },
  { id: '42', title: 'Xbox Series X 1TB',              description: '4K gaming console, 120fps, Quick Resume, Game Pass ready', category: 'Gaming', price: 499.99, tags: ['xbox', 'console', 'microsoft'] },
  { id: '43', title: 'Corsair K100 Gaming Keyboard',   description: 'Optical-mechanical switches, per-key RGB, macro wheel', category: 'Gaming', price: 229.99, tags: ['keyboard', 'gaming', 'rgb'] },
  { id: '44', title: 'Razer DeathAdder V3 Mouse',      description: 'Ultra-lightweight esports mouse, 30K DPI optical sensor', category: 'Gaming', price: 69.99, tags: ['mouse', 'gaming', 'razer'] },
  { id: '45', title: 'Nintendo Switch OLED',            description: '7-inch OLED screen, enhanced audio, 64GB storage', category: 'Gaming', price: 349.99, tags: ['nintendo', 'portable', 'gaming'] },

  // Office
  { id: '46', title: 'Herman Miller Aeron Chair',      description: 'Iconic ergonomic office chair with PostureFit SL lumbar', category: 'Office', price: 1445.00, tags: ['chair', 'ergonomic', 'office'] },
  { id: '47', title: 'Uplift V2 Standing Desk',        description: 'Electric sit-stand desk, 355lb capacity, memory presets', category: 'Office', price: 799.00, tags: ['desk', 'standing', 'ergonomic'] },
  { id: '48', title: 'Elgato Stream Deck MK2',         description: '15 LCD key stream controller for creators and productivity', category: 'Office', price: 149.99, tags: ['streaming', 'productivity', 'elgato'] },
  { id: '49', title: 'Blue Yeti USB Microphone',       description: 'Professional USB condenser mic, four polar patterns', category: 'Office', price: 129.99, tags: ['microphone', 'podcast', 'streaming'] },
  { id: '50', title: 'Jabra Evolve2 85 Headset',       description: 'Professional wireless headset with ANC for office calls', category: 'Office', price: 379.00, tags: ['headset', 'office', 'wireless'] },

  // Outdoors
  { id: '51', title: 'Hydro Flask 32oz Water Bottle',  description: 'TempShield double-wall insulation, keeps cold 24h', category: 'Outdoors', price: 49.95, tags: ['water-bottle', 'hydration', 'hiking'] },
  { id: '52', title: 'Black Diamond Spot 400 Headlamp', description: '400 lumens, waterproof, single hand dimming, red night vision', category: 'Outdoors', price: 49.95, tags: ['headlamp', 'camping', 'hiking'] },
  { id: '53', title: 'Osprey Atmos AG 65 Backpack',    description: 'Anti-Gravity suspension, ventilated back panel, 65L', category: 'Outdoors', price: 290.00, tags: ['backpack', 'hiking', 'osprey'] },
  { id: '54', title: 'GSI Outdoors Bugaboo Cookset',   description: 'Ultralight camping cookset with frying pan and plates', category: 'Outdoors', price: 59.95, tags: ['cooking', 'camping', 'ultralight'] },
  { id: '55', title: 'Sea to Summit Sleeping Bag Liner', description: 'Thermolite fleece liner adds 15°F warmth, compact pack', category: 'Outdoors', price: 79.95, tags: ['sleeping', 'camping', 'liner'] },

  // Health
  { id: '56', title: 'Theragun Prime Massager',        description: 'Percussive therapy device, 5 built-in speeds, quiet motor', category: 'Health', price: 299.00, tags: ['massage', 'recovery', 'fitness'] },
  { id: '57', title: 'Fitbit Charge 6 Fitness Tracker', description: 'Built-in GPS, ECG, SpO2, 7-day battery, Google integration', category: 'Health', price: 149.95, tags: ['fitness-tracker', 'health', 'sleep'] },
  { id: '58', title: 'Withings Body+ Smart Scale',     description: 'WiFi body composition scale, BMI, body fat, muscle mass', category: 'Health', price: 99.95, tags: ['scale', 'health', 'body-composition'] },
  { id: '59', title: 'Manta Sleep Mask Pro',           description: 'Total blackout mask with adjustable eye cups, memory foam', category: 'Health', price: 49.95, tags: ['sleep', 'mask', 'travel'] },
  { id: '60', title: 'CamelBak Eddy+ 25oz',           description: 'Spill-proof water bottle with bite valve and straw', category: 'Health', price: 24.99, tags: ['water-bottle', 'hydration', 'bpa-free'] },
];
