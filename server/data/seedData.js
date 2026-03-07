const productSeeds = [
  {
    slug: "bone-shaker-limited-edition",
    title: "Bone Shaker Limited Edition",
    category: "Cars",
    price: 24.99,
    sku: "CAR-001",
    stock: 18,
    condition: "Mint / Sealed",
    saleMode: "hybrid",
    series: "Premium Collector",
    images: [
      "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?auto=format&fit=crop&w=901&q=80"
    ],
    badge: "Exclusive",
    rating: 4.9,
    isFeatured: true,
    description: "The iconic Bone Shaker returns in a matte black finish with chrome accents built for serious collectors."
  },
  {
    slug: "twin-mill-classic",
    title: "Twin Mill Classic",
    category: "Cars",
    price: 19.99,
    sku: "CAR-002",
    stock: 24,
    condition: "Near Mint",
    saleMode: "fixed",
    series: "Legends",
    images: [
      "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?auto=format&fit=crop&w=900&q=80"
    ],
    rating: 4.8,
    isFeatured: true,
    description: "Double the engines, double the power. A legendary shelf and track piece."
  },
  {
    slug: "loop-star-track-set",
    title: "Loop Star Track Set",
    category: "Tracks",
    price: 49.99,
    sku: "TRK-003",
    stock: 9,
    condition: "Boxed",
    saleMode: "fixed",
    series: "Track Builder",
    images: [
      "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=900&q=80"
    ],
    badge: "Best Seller",
    rating: 4.7,
    isNewDrop: true,
    description: "A gravity-defying loop set with booster sections and modular expansion support."
  },
  {
    slug: "night-shifter-drift",
    title: "Night Shifter Drift",
    category: "Cars",
    price: 14.99,
    sku: "CAR-004",
    stock: 31,
    condition: "Loose",
    saleMode: "auction",
    series: "Street Series",
    images: [
      "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=901&q=80"
    ],
    rating: 4.5,
    description: "Built for the midnight streets with a low profile and tuned drift tires."
  },
  {
    slug: "mega-garage-tower",
    title: "Mega Garage Tower",
    category: "Playsets",
    price: 89.99,
    sku: "PLY-005",
    stock: 7,
    condition: "Boxed",
    saleMode: "fixed",
    series: "Display Systems",
    images: [
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=900&q=80"
    ],
    badge: "Collector Pick",
    rating: 4.9,
    isFeatured: true,
    description: "A multi-level garage with elevator, ramp exits, and premium display-friendly styling."
  },
  {
    slug: "custom-motors-pack",
    title: "Custom Motors Pack",
    category: "Accessories",
    price: 29.99,
    sku: "ACC-006",
    stock: 0,
    condition: "Sealed",
    saleMode: "fixed",
    series: "Upgrade Kit",
    images: [
      "https://images.unsplash.com/photo-1566008885218-90abf9200ddb?auto=format&fit=crop&w=900&q=80"
    ],
    rating: 4.6,
    description: "Five interchangeable motors and exhausts for collectors who want tuning-room energy."
  },
  {
    slug: "speedway-champion",
    title: "Speedway Champion",
    category: "Cars",
    price: 15.99,
    sku: "CAR-007",
    stock: 12,
    condition: "Carded",
    saleMode: "fixed",
    series: "Championship",
    images: [
      "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?auto=format&fit=crop&w=902&q=80"
    ],
    rating: 4.4,
    description: "A classic speedway hero with aggressive aero and a fast-launch stance."
  },
  {
    slug: "desert-rally-truck",
    title: "Desert Rally Truck",
    category: "Cars",
    price: 22.99,
    sku: "CAR-008",
    stock: 14,
    condition: "Carded",
    saleMode: "fixed",
    series: "Off Road",
    images: [
      "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?auto=format&fit=crop&w=901&q=80"
    ],
    rating: 4.7,
    description: "Oversized tires and raid styling built for rough terrain displays."
  },
  {
    slug: "neon-city-track",
    title: "Neon City Track",
    category: "Tracks",
    price: 59.99,
    sku: "TRK-009",
    stock: 11,
    condition: "Boxed",
    saleMode: "fixed",
    series: "Night Runs",
    images: [
      "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=902&q=80"
    ],
    badge: "New",
    rating: 4.8,
    description: "Glow-heavy city track sections for after-dark display setups."
  },
  {
    slug: "turbo-boost-launcher",
    title: "Turbo Boost Launcher",
    category: "Accessories",
    price: 12.99,
    sku: "ACC-010",
    stock: 40,
    condition: "Sealed",
    saleMode: "fixed",
    series: "Launch Systems",
    images: [
      "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=903&q=80"
    ],
    rating: 4.2,
    description: "A compact launcher engineered for faster starts and cleaner release power."
  },
  {
    slug: "stunt-arena-playset",
    title: "Stunt Arena Playset",
    category: "Playsets",
    price: 75,
    sku: "PLY-011",
    stock: 6,
    condition: "Boxed",
    saleMode: "hybrid",
    series: "Showcase Arena",
    images: [
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=901&q=80"
    ],
    badge: "Exclusive",
    rating: 4.9,
    description: "A stunt-focused arena with flaming hoops, jump ramps, and collector-grade scale."
  },
  {
    slug: "classic-muscle-car",
    title: "Classic Muscle Car",
    category: "Cars",
    price: 18.5,
    sku: "CAR-012",
    stock: 15,
    condition: "Carded",
    saleMode: "fixed",
    series: "Heritage",
    images: [
      "https://images.unsplash.com/photo-1566008885218-90abf9200ddb?auto=format&fit=crop&w=901&q=80"
    ],
    rating: 4.5,
    description: "Vintage lines and modern finish for shelves that lean classic."
  }
];

const couponSeeds = [
  {
    code: "SPEED10",
    type: "percent",
    value: 10,
    maxUses: 100,
    minOrderAmount: 20,
    appliesTo: "store",
    isActive: true
  }
];

const campaignTemplateSeeds = [
  {
    key: "weekly-drop",
    name: "Weekly Drop",
    subject: "Your next BidnSteal drop is live",
    html: "<p>Fresh inventory and auctions are live now.</p>"
  }
];

const auctionSeeds = [
  {
    slug: "bone-shaker-limited-edition",
    startOffsetHours: -12,
    endOffsetHours: 8,
    startingPrice: 1800,
    currentPrice: 2600,
    buyNowPrice: 4200,
    minIncrement: 100,
    reservePrice: 2200,
    viewerCount: 189,
    year: 2024,
    authenticity: "Verified Tier 1",
    description: "Factory-sealed collector lot with premium finish and verified provenance.",
    bids: [
      { bidderName: "Collector99", bidderEmail: "collector99@example.com", amount: 2000, hoursAgo: 7 },
      { bidderName: "SpeedDemon", bidderEmail: "speeddemon@example.com", amount: 2300, hoursAgo: 3 },
      { bidderName: "VintageHunter", bidderEmail: "vintagehunter@example.com", amount: 2600, hoursAgo: 1 }
    ]
  },
  {
    slug: "night-shifter-drift",
    startOffsetHours: 6,
    endOffsetHours: 48,
    startingPrice: 1200,
    currentPrice: 1200,
    buyNowPrice: 2600,
    minIncrement: 100,
    reservePrice: 1500,
    viewerCount: 94,
    year: 2023,
    authenticity: "Verified Tier 2",
    description: "Street-series drift piece set for an upcoming auction window.",
    bids: []
  },
  {
    slug: "stunt-arena-playset",
    startOffsetHours: -48,
    endOffsetHours: -4,
    startingPrice: 4000,
    currentPrice: 5900,
    buyNowPrice: 0,
    minIncrement: 200,
    reservePrice: 5000,
    viewerCount: 0,
    year: 2022,
    authenticity: "Verified Tier 1",
    description: "An ended arena lot that closed above reserve.",
    bids: [
      { bidderName: "DriftKing", bidderEmail: "driftking@example.com", amount: 4600, hoursAgo: 40 },
      { bidderName: "ApexApex", bidderEmail: "apex@example.com", amount: 5200, hoursAgo: 20 },
      { bidderName: "Collector99", bidderEmail: "collector99@example.com", amount: 5900, hoursAgo: 5 }
    ]
  }
];

module.exports = {
  productSeeds,
  couponSeeds,
  campaignTemplateSeeds,
  auctionSeeds
};
