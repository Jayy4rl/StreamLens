/**
 * Schema Templates
 *
 * Pre-built schema templates for common use cases
 */

export interface SchemaTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  schema: string;
  icon: string;
}

export const SCHEMA_TEMPLATES: SchemaTemplate[] = [
  {
    id: "token-transfer",
    name: "Token Transfer",
    category: "DeFi",
    description: "Track token transfers between addresses",
    schema:
      "address token, address sender, address recipient, uint256 amount, uint256 timestamp",
    icon: "💸",
  },
  {
    id: "nft-metadata",
    name: "NFT Metadata",
    category: "NFT",
    description: "Store NFT token metadata",
    schema:
      "address collection, uint256 tokenId, string uri, address owner, uint256 mintedAt",
    icon: "🖼️",
  },
  {
    id: "user-profile",
    name: "User Profile",
    category: "Social",
    description: "User profile data and reputation",
    schema:
      "address userAddress, string username, uint256 reputation, bool isVerified, uint256 joinedAt",
    icon: "👤",
  },
  {
    id: "game-score",
    name: "Game Score",
    category: "Gaming",
    description: "Track game scores and achievements",
    schema:
      "address player, uint256 score, uint256 level, uint256 achievements, uint256 lastPlayedAt",
    icon: "🎮",
  },
  {
    id: "price-oracle",
    name: "Price Oracle",
    category: "DeFi",
    description: "Store price feed data",
    schema:
      "string symbol, uint256 price, uint256 timestamp, uint256 volume, address reporter",
    icon: "📊",
  },
  {
    id: "event-ticket",
    name: "Event Ticket",
    category: "Events",
    description: "Event ticketing information",
    schema:
      "bytes32 eventId, address attendee, uint256 ticketNumber, bool isUsed, uint256 purchasedAt",
    icon: "🎫",
  },
  {
    id: "dao-vote",
    name: "DAO Vote",
    category: "Governance",
    description: "Record DAO voting data",
    schema:
      "bytes32 proposalId, address voter, bool support, uint256 weight, uint256 timestamp",
    icon: "🗳️",
  },
  {
    id: "iot-sensor",
    name: "IoT Sensor Data",
    category: "IoT",
    description: "IoT device sensor readings",
    schema:
      "bytes32 deviceId, uint256 temperature, uint256 humidity, uint256 timestamp, bool isActive",
    icon: "📡",
  },
  {
    id: "supply-chain",
    name: "Supply Chain",
    category: "Logistics",
    description: "Track product in supply chain",
    schema:
      "bytes32 productId, string location, address handler, uint256 timestamp, bool isVerified",
    icon: "📦",
  },
  {
    id: "simple-kv",
    name: "Simple Key-Value",
    category: "Basic",
    description: "Basic key-value storage",
    schema: "bytes32 key, string value, uint256 timestamp",
    icon: "🔑",
  },
  {
    id: "social-post",
    name: "Social Post",
    category: "Social",
    description: "Social media post data",
    schema:
      "address author, string content, uint256 likes, uint256 shares, uint256 timestamp",
    icon: "📱",
  },
  {
    id: "auction-bid",
    name: "Auction Bid",
    category: "Marketplace",
    description: "Auction bidding information",
    schema:
      "bytes32 auctionId, address bidder, uint256 amount, uint256 timestamp, bool isWinning",
    icon: "🔨",
  },
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): SchemaTemplate[] {
  return SCHEMA_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get all categories
 */
export function getCategories(): string[] {
  const categories = new Set(SCHEMA_TEMPLATES.map((t) => t.category));
  return Array.from(categories).sort();
}

/**
 * Search templates
 */
export function searchTemplates(query: string): SchemaTemplate[] {
  const lowerQuery = query.toLowerCase();
  return SCHEMA_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.category.toLowerCase().includes(lowerQuery)
  );
}
