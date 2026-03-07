export interface Bid {
  id: string;
  user: string;
  amount: number;
  time: string;
  isUser: boolean;
}

export interface Auction {
  id: string;
  name: string;
  year: number;
  condition: string;
  authenticity: string;
  image: string;
  gallery: string[];
  startingBid: number;
  currentBid: number;
  buyNowPrice: number;
  endTime: string;
  viewers: number;
  status: 'LIVE' | 'UPCOMING' | 'ENDED';
  bids: Bid[];
}

const MOCK_USERS = ['Racer_X', 'Collector99', 'SpeedDemon', 'DiecastKing', 'VintageHunter', 'ApexApex', 'DriftKing', 'TurboTuner'];

const generateMockAuctions = (): Auction[] => {
  const brands = ['Porsche', 'Nissan', 'Chevrolet', 'Ford', 'Ferrari', 'Lamborghini', 'BMW', 'Audi', 'Toyota', 'Honda'];
  const models = ['911 GT3', 'Skyline R34', 'Camaro SS', 'Mustang Boss', 'F40', 'Countach', 'M3 E30', 'R8', 'Supra MK4', 'NSX'];
  const conditions = ['Mint / Sealed', 'Near Mint', 'Loose', 'Restored'];
  
  return Array.from({ length: 24 }).map((_, i) => {
    const brand = brands[i % brands.length];
    const model = models[i % models.length];
    const isLive = i < 18; // First 18 are live, rest are ended or upcoming
    const isEnded = i >= 18 && i < 21;
    
    let endTime;
    if (isLive) {
      // Ending between 5 minutes and 24 hours from now
      endTime = new Date(Date.now() + (Math.random() * 24 * 60 * 60 * 1000) + 5 * 60 * 1000).toISOString();
    } else if (isEnded) {
      endTime = new Date(Date.now() - (Math.random() * 24 * 60 * 60 * 1000)).toISOString();
    } else {
      // Upcoming
      endTime = new Date(Date.now() + (Math.random() * 7 * 24 * 60 * 60 * 1000) + 24 * 60 * 60 * 1000).toISOString();
    }

    const startingBid = Math.floor(Math.random() * 50 + 10) * 100;
    const currentBid = startingBid + Math.floor(Math.random() * 50) * 100;
    
    // Generate some mock bids
    const numBids = isLive ? Math.floor(Math.random() * 10) + 1 : (isEnded ? 15 : 0);
    const bids: Bid[] = [];
    let bidAmount = startingBid;
    
    for (let j = 0; j < numBids; j++) {
      bidAmount += Math.floor(Math.random() * 5 + 1) * 100;
      const isWinningBid = isEnded && j === numBids - 1;
      const isUserBid = isWinningBid || (isLive && Math.random() > 0.8);
      bids.unshift({
        id: `bid-${i}-${j}`,
        user: isUserBid ? 'YOU' : MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)],
        amount: bidAmount,
        time: new Date(Date.now() - Math.random() * 1000000).toLocaleTimeString(),
        isUser: isUserBid
      });
    }

    return {
      id: `LOT-${100 + i}`,
      name: `${brand} ${model} (Custom)`,
      year: 1990 + Math.floor(Math.random() * 30),
      condition: conditions[Math.floor(Math.random() * conditions.length)],
      authenticity: `Verified Tier ${Math.floor(Math.random() * 3) + 1}`,
      image: `https://picsum.photos/seed/diecastcar${i}/800/600`,
      gallery: [
        `https://picsum.photos/seed/diecastcar${i}/800/600`,
        `https://picsum.photos/seed/diecastcar${i}_front/800/600`,
        `https://picsum.photos/seed/diecastcar${i}_back/800/600`,
        `https://picsum.photos/seed/diecastcar${i}_side/800/600`,
      ],
      startingBid,
      currentBid: bids.length > 0 ? bids[0].amount : startingBid,
      buyNowPrice: currentBid + Math.floor(Math.random() * 100 + 50) * 100,
      endTime,
      viewers: isLive ? Math.floor(Math.random() * 1500 + 100) : 0,
      status: isLive ? 'LIVE' : (isEnded ? 'ENDED' : 'UPCOMING'),
      bids
    };
  });
};

export const AUCTIONS = generateMockAuctions();
