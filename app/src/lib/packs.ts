// The single source of truth for credit packs. Prices are in ZAR cents and are only ever
// read on the server when an order is created — the browser never tells us the price.
export type Pack = {
  id: "sock-drawer" | "couch-cushions" | "teenagers-bedroom";
  name: string;
  searches: number;
  priceCents: number;
  blurb: string;
  color: string;
  badge: string | null;
};

export const PACKS: Pack[] = [
  {
    id: "sock-drawer",
    name: "The Sock Drawer",
    searches: 3,
    priceCents: 3000,
    blurb: "For the occasional AirPod and the sock that never had a partner anyway.",
    color: "bg-white",
    badge: null,
  },
  {
    id: "couch-cushions",
    name: "The Couch Cushions",
    searches: 10,
    priceCents: 10000,
    blurb: "Remotes, coins, a fork from 2019. If it fell, it's in there. We'll circle it.",
    color: "bg-sun",
    badge: "Most lost",
  },
  {
    id: "teenagers-bedroom",
    name: "The Teenager's Bedroom",
    searches: 25,
    priceCents: 25000,
    blurb: "Archaeology-grade. Recommended for gap years, house moves and families of five.",
    color: "bg-mint",
    badge: "Brave",
  },
];

export const findPack = (id: unknown) => PACKS.find((p) => p.id === id) ?? null;
export const rands = (cents: number) => (cents / 100).toFixed(2); // "49.00", PayFast's amount format
