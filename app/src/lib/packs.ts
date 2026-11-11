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
    id: "sock-drawer", // ids are from version 1; old orders still point at them
    name: "3 finds",
    searches: 3,
    priceCents: 3000,
    blurb: "For one lost thing and a second look.",
    color: "bg-white",
    badge: null,
  },
  {
    id: "couch-cushions",
    name: "10 finds",
    searches: 10,
    priceCents: 10000,
    blurb: "For a household that loses things often.",
    color: "bg-white",
    badge: "Most chosen",
  },
  {
    id: "teenagers-bedroom",
    name: "25 finds",
    searches: 25,
    priceCents: 25000,
    blurb: "For moving house, or a family.",
    color: "bg-white",
    badge: null,
  },
];

export const findPack = (id: unknown) => PACKS.find((p) => p.id === id) ?? null;
export const rands = (cents: number) => (cents / 100).toFixed(2); // "49.00", PayFast's amount format
