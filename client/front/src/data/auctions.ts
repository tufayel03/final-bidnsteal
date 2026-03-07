export interface Bid {
  id: string;
  user: string;
  amount: number;
  time: string;
  isUser: boolean;
}

export interface Auction {
  id: string;
  productId?: string;
  productSlug?: string;
  name: string;
  year: number;
  condition: string;
  authenticity: string;
  image: string;
  gallery: string[];
  startingBid: number;
  currentBid: number;
  buyNowPrice: number;
  minIncrement?: number;
  reservePrice?: number | null;
  reservePriceReached?: boolean;
  totalBids?: number;
  endTime: string;
  viewers: number;
  status: 'LIVE' | 'UPCOMING' | 'ENDED';
  bids: Bid[];
}

export const AUCTIONS: Auction[] = [];
