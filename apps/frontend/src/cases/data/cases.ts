export type CaseItem = {
  name: string;
  chance: number; // percentage (0-100)
  value: number;
  image?: string;
  /** If true, item is in the "gold tier"; first spin shows gold placeholder, then a gold-only second spin reveals it. */
  isGold?: boolean;
};

export type CaseDefinition = {
  id: string;
  name: string;
  price: number;
  image: string;
  items: CaseItem[];
};

export const cases: CaseDefinition[] = [
  {
    id: 'starter-case',
    name: 'Asiimov Case',
    price: 1.37,
    image: '/cases/cs2/asiimov/asiimov.png',
    items: [
      {
        name: '[FT] AWP Asimov',
        chance: 0.001,
        value: 111.81,
        image: '/cases/cs2/asiimov/awp%20asiimov.png',
      },
      {
        name: '[FT] AWP Chrome Cannon',
        chance: 0.002,
        value: 85.67,
        image: '/cases/cs2/asiimov/awp%20chrome%20cannon.png',
      },
      {
        name: '[FT] ★ Hydra Gloves | Case Hardened',
        chance: 0.003,
        value: 85.88,
        image: '/cases/cs2/asiimov/hydra%20gloves%20case%20hardened.png',
      },
      {
        name: '[FT] ★ Bloodhound Gloves | Guerrilla',
        chance: 0.016,
        value: 81.42,
        image: '/cases/cs2/asiimov/bloodhound%20gloves%20guerilla.png',
      },

      {
        name: '[FT StatTrak™] M4A1-S | Mecha Industries',
        chance: 0.008,
        value: 49.10,
        image: '/cases/cs2/asiimov/m4a1-s%20mecha%20industries.png',
      },
      {
        name: '[BS] ★ Hand Wraps | Duct Tape',
        chance: 0.005,
        value: 48.39,
        image: '/cases/cs2/asiimov/hand%20wraps%20duct%20tapes.png',
      },
      {
        name: '[FT] AK-47 | Neon Rider',
        chance: 0.009,
        value: 35.04,
        image: '/cases/cs2/asiimov/ak-47%20neon%20rider.png',
      },
      {
        name: '[MW StatTrak™] M4A4 | The Emperor',
        chance: 0.01,
        value: 24.57,
        image: '/cases/cs2/asiimov/m4a4%20the%20emperor.png',
      },

      {
        name: '[FT] AWP | Neo-Noir',
        chance: 0.02,
        value: 18.41,
        image: '/cases/cs2/asiimov/awp%20neo%20noir.png',
      },
      {
        name: '[MW] AK-47 | Cartel',
        chance: 0.03,
        value: 11.52,
        image: '/cases/cs2/asiimov/ak-47%20cartel.png',
      },
      {
        name: '[MW] AK-47 | Jungle Spray',
        chance: 0.04,
        value: 10.96,
        image: '/cases/cs2/asiimov/ak-47%20jungle%20spray.png',
      },
      {
        name: '[MW] M4A4 | 龍王 (Dragon King)',
        chance: 0.08,
        value: 8.10,
        image: '/cases/cs2/asiimov/m4a4%20dragon%20king.png',
      },

      {
        name: '[FT] M4A4 | Desolate Space',
        chance: 0.178,
        value: 4.85,
        image: '/cases/cs2/asiimov/m4a4%20desolate%20space.png',
      },
      {
        name: '[FT] P250 | Asimov',
        chance: 0.4,
        value: 2.78,
        image: '/cases/cs2/asiimov/p250%20asiimov.png',
      },
      {
        name: '[FT] Five-SeveN | Angry Mob',
        chance: 1.4,
        value: 2.46,
        image: '/cases/cs2/asiimov/p250%20angry%20mob.png',
      },
      {
        name: '[MW] P90 | Module',
        chance: 3.8,
        value: 2.09,
        image: '/cases/cs2/asiimov/p90%20module.png',
      },

      {
        name: '[FT] AWP | Phobos',
        chance: 6.1,
        value: 1.96,
        image: '/cases/cs2/asiimov/awp%20phobos.png',
      },
      {
        name: '[MW StatTrak™] USP-S | Black Lotus',
        chance: 7.5,
        value: 1.84,
        image: '/cases/cs2/usp-2/usp-s%20black%20lotus.png',
      },
      {
        name: '[MW] MP7 | Special Delivery',
        chance: 12.0,
        value: 1.71,
        image: '/cases/cs2/asiimov/mp7%20special%20delivery.png',
      },
      {
        name: '[MW StatTrak™] MP7 | Bloodsport',
        chance: 15.6,
        value: 1.80,
        image: '/cases/cs2/asiimov/mp7%20blood%20sport.png',
      },

      {
        name: '[FT StatTrak™] CZ75-Auto | Crimson Web',
        chance: 15.4,
        value: 1.35,
        image: '/cases/cs2/asiimov/cz-75auto%20crimson%20web.png',
      },
      {
        name: '[BS] USP-S | Cyrex',
        chance: 9.4,
        value: 0.86,
        image: '/cases/cs2/usp-2/usp-s%20cyrex.png',
      },
      {
        name: '[FT] AUG | Akoben',
        chance: 6.5,
        value: 0.37,
        image: '/cases/cs2/asiimov/mp7%20akoben.png',
      },
      {
        name: '[FT] AUG | Plague',
        chance: 21.5,
        value: 0.20,
        image: '/cases/cs2/asiimov/aug%20plague.png',
      },
    ],
  },
  {
    id: 'usp_case',
    name: 'USP-S Case',
    price: 0.68,
    image: '/cases/cs2/usp-2/usp-s%20case.avif',
    items: [
      { name: 'USP-S Printstream (FN)', value: 91.74, chance: 0.1, image: '/cases/cs2/usp-2/usp-s%20printstream.png', isGold: true },
      { name: 'USP-S Kill Confirmed (WW)', value: 29.44, chance: 0.1, image: '/cases/cs2/usp-2/usp-s%20kill%20confirmed.png', isGold: true },
      { name: 'USP-S Monster Mashup (FT)', value: 17.11, chance: 0.15, image: '/cases/cs2/usp-2/usp-s%20monster%20mashup.png', isGold: true },
      { name: 'USP-S Jawbreaker (FT)', value: 13.0, chance: 0.2, image: '/cases/cs2/usp-2/usp-s%20jawbreaker.png', isGold: true },
      { name: 'USP-S Neo-Noir (FT)', value: 11.53, chance: 0.25, image: '/cases/cs2/usp-2/usp-s%20neonoir.png', isGold: true },
      { name: 'USP-S The Traitor (WW)', value: 8.94, chance: 0.4, image: '/cases/cs2/usp-2/usp-s%20the%20traitor.png', isGold: true },
      { name: 'USP-S Cortex (FN)', value: 7.8, chance: 0.6, image: '/cases/cs2/usp-2/usp-s%20cortex.png', isGold: true },
      { name: 'USP-S Black Lotus (FN)', value: 6.27, chance: 0.8, image: '/cases/cs2/usp-2/usp-s%20black%20lotus.png' },
      { name: 'USP-S Stainless (MW)', value: 5.91, chance: 0.9, image: '/cases/cs2/usp-2/usp-s%20stainless.png' },
      { name: 'USP-S Blueprint (FT)', value: 4.37, chance: 1.2, image: '/cases/cs2/usp-2/usp-s%20blueprint.png' },
      { name: 'USP-S Guardian (FN)', value: 3.64, chance: 2.1, image: '/cases/cs2/usp-2/usp-s%20guardian.png' },
      { name: 'USP-S Cyrex (FN)', value: 2.94, chance: 3.2, image: '/cases/cs2/usp-2/usp-s%20cyrex.png' },
      { name: 'USP-S Forest Leaves (BS)', value: 0.01, chance: 90.0, image: '/cases/cs2/usp-2/usp-s%20forest%20leaves.png' },
    ],
  },
];

