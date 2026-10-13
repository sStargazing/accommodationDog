import type { Amenity, PropertyType } from "../../lib/listings/constants.ts";

// Development seed data. Everything here is fictional and comedic, including
// the reviews, which the UI labels as such. Photos are from Unsplash
// (https://unsplash.com/license); photographers are credited alongside.

export type SeedUser = { username: string; avatar: string; avatarCredit: string };

export type SeedPhoto = { url: string; credit: string };

export type SeedListing = {
  key: string;
  host: string;
  title: string;
  description: string;
  property_type: PropertyType;
  city: string;
  country: string;
  nightly_price: number;
  cleaning_fee: number;
  service_fee: number;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  amenities: { standard: Amenity[]; custom: string[] };
  createdDaysAgo: number;
  views: number;
  photos: SeedPhoto[];
  reviews: { by: string; rating: number; daysAgo: number; content: string }[];
};

const u = (id: string) => `https://images.unsplash.com/photo-${id}`;

export const USERS: SeedUser[] = [
  { username: "captain_foghorn", avatar: u("1493916665398-143bdeabe500"), avatarCredit: "Alexandru Rotariu" },
  { username: "lady_brothbury", avatar: u("1517423440428-a5a00ad493e8"), avatarCredit: "charlesdeluvio" },
  { username: "nutty_landlord", avatar: u("1625316708582-7c38734be31d"), avatarCredit: "Alvan Nee" },
  { username: "snack_baron", avatar: u("1766866173905-a2bf01b921fb"), avatarCredit: "OSMAN ESPINOZA FRANCO" },
  { username: "frosty_hosty", avatar: u("1737309657220-025e96d413fe"), avatarCredit: "Haberdoedas" },
  { username: "upper_crust", avatar: u("1566710582818-d673dc761201"), avatarCredit: "Cristofer Maximilian" },
  { username: "damp_dave", avatar: u("1763941802516-0bd483f33f71"), avatarCredit: "Gennady Zakharin" },
  { username: "ring_ring_rentals", avatar: u("1612940960267-4549a58fb257"), avatarCredit: "Ivana La" },
  { username: "mirage_management", avatar: u("1647179924662-13b7bc73a886"), avatarCredit: "Nail Gilfanov" },
  { username: "goose_management", avatar: u("1518020382113-a7e8fc38eac9"), avatarCredit: "charlesdeluvio" },
  { username: "concierge_404", avatar: u("1561037404-61cd46aa615b"), avatarCredit: "Victor G" },
  { username: "deep_thoughts", avatar: u("1610705975766-fd3e537bb782"), avatarCredit: "Linda Mynhardt" },
  { username: "sleepy_traveller", avatar: u("1656839631462-1adf96d4320f"), avatarCredit: "Yusuf Onuk" },
  { username: "suitcase_sam", avatar: u("1558788353-f76d92427f16"), avatarCredit: "Victor G" },
  { username: "backpack_betty", avatar: u("1519138130-85a949fdcb4f"), avatarCredit: "Laula Co" },
  { username: "wanderlost", avatar: u("1466921583968-f07aa80c526e"), avatarCredit: "Braydon Anderson" },
];

export const LISTINGS: SeedListing[] = [
  {
    key: "lighthouse",
    host: "captain_foghorn",
    title: "Haunted Lighthouse With Strong Opinions",
    description: `Perched on a windswept cliff, this 19th-century lighthouse offers uninterrupted views of the Atlantic and uninterrupted commentary from Gerald, the resident ghost.

Gerald has lived here since 1874 and has opinions about your luggage, your posture and your choice of breakfast cereal. He is otherwise an excellent host and will happily point out the best rock pools at 3 a.m.

The space: a spiral staircase of 117 steps (we counted, Gerald recounted), two round bedrooms with no corners to hide in, and a lantern room that is strictly off limits because the light is load-bearing.

Please note: the foghorn sounds every 30 seconds in poor weather. Poor weather is every day.`,
    property_type: "other",
    city: "Foghorn Point",
    country: "Ireland",
    nightly_price: 189,
    cleaning_fee: 45,
    service_fee: 28,
    max_guests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 1,
    amenities: { standard: ["wifi", "heating", "kitchen", "parking"], custom: ["Resident ghost (friendly-ish)", "360° sea views", "Foghorn alarm clock"] },
    createdDaysAgo: 92,
    views: 1840,
    photos: [
      { url: u("1661199279480-4c0ae25cf213"), credit: "Kate Kaya" },
      { url: u("1785683987155-495ffcb7a419"), credit: "Andrew Dawes" },
      { url: u("1614656063939-a8e76036a703"), credit: "Nazhan Syahiran" },
      { url: u("1524679166686-04237b4667b4"), credit: "Torsten Dederichs" },
      { url: u("1779870458288-95fd59cd2c5b"), credit: "Sang Ho" },
    ],
    reviews: [
      { by: "suitcase_sam", rating: 5, daysAgo: 80, content: "Gerald critiqued my packing for forty minutes and he was right about everything. The views are spectacular. The foghorn is not a sound, it is a lifestyle." },
      { by: "backpack_betty", rating: 4, daysAgo: 61, content: "Lovely stay. Lost a star because Gerald hid my left shoe and denied it. Also he has never paid rent, which feels relevant." },
      { by: "goose_management", rating: 5, daysAgo: 40, content: "Finally, a host who understands the importance of supervision. Margaret sends her regards." },
      { by: "wanderlost", rating: 4, daysAgo: 12, content: "117 steps. I counted 118. Gerald and I are no longer speaking." },
    ],
  },
  {
    key: "castle",
    host: "lady_brothbury",
    title: "Castle With a Moat of Lukewarm Soup",
    description: `Lady Brothbury welcomes you to her ancestral home, defended for eight centuries by the only moat in Scotland filled entirely with leek and potato soup.

The moat is topped up daily and served lukewarm, which our lawyers have asked us to describe as a safety feature. Guests may help themselves with the provided ladles. Swimming is discouraged; croutons are not.

Inside you'll find six bedrooms, a great hall with a fireplace the size of a studio flat, and a suit of armour in the east corridor that we are 90% sure is empty.

House rules: no bread in the moat after 10 p.m. It attracts the ducks, and the ducks attract the lawyers.`,
    property_type: "castle",
    city: "Brothbury",
    country: "Scotland",
    nightly_price: 640,
    cleaning_fee: 150,
    service_fee: 95,
    max_guests: 12,
    bedrooms: 6,
    beds: 8,
    bathrooms: 4.5,
    amenities: { standard: ["heating", "kitchen", "parking", "tv"], custom: ["Soup moat (seasonal flavours)", "Working drawbridge", "Suit of armour (occupied?)"] },
    createdDaysAgo: 120,
    views: 2650,
    photos: [
      { url: u("1628946578676-e1ee0a952c35"), credit: "Sourav Bhaduri" },
      { url: u("1784346344212-2c92e70d0750"), credit: "Marty Blood" },
      { url: u("1701625577678-164d13b9671a"), credit: "Winston Tjia" },
      { url: u("1786465089454-2c0d9092dbcf"), credit: "Sebastian Frederik Jacobsen" },
      { url: u("1665593998976-d957f2827fe7"), credit: "Keesha's Kitchen" },
    ],
    reviews: [
      { by: "sleepy_traveller", rating: 5, daysAgo: 101, content: "The moat was leek and potato on Tuesday and minestrone on Wednesday. Is this how all castles work? I'm never staying anywhere else." },
      { by: "damp_dave", rating: 4, daysAgo: 77, content: "As a man who lives on a boat, I was impressed by the moat's buoyancy. Minus one star: a crouton followed me to bed." },
      { by: "suitcase_sam", rating: 3, daysAgo: 30, content: "The suit of armour in the east corridor waved at me. Lady Brothbury says it didn't. One of us is lying and it isn't the armour." },
    ],
  },
  {
    key: "treehouse",
    host: "nutty_landlord",
    title: "Treehouse With Mandatory Squirrel Negotiations",
    description: `Fourteen metres up an old-growth maple, this hand-built treehouse is yours, subject to ongoing negotiations with the previous tenants.

The squirrels have agreed to a ceasefire for the duration of your stay in exchange for a daily tribute of unsalted peanuts (provided, but they check the receipts). Our on-call squirrel diplomat is available for disputes over the hammock.

Expect birdsong at dawn, rustling at dusk and a strongly worded acorn on your pillow if you forget the tribute. The bathroom is a half bath, in the sense that half of it is outdoors.`,
    property_type: "cabin",
    city: "Acorn Hollow",
    country: "Canada",
    nightly_price: 145,
    cleaning_fee: 30,
    service_fee: 20,
    max_guests: 3,
    bedrooms: 1,
    beds: 2,
    bathrooms: 0.5,
    amenities: { standard: ["wifi", "heating", "balcony", "pets_allowed"], custom: ["Rope bridge commute", "Squirrel diplomat on call", "Acorn minibar"] },
    createdDaysAgo: 75,
    views: 1320,
    photos: [
      { url: u("1604004218771-05c55db4f9f4"), credit: "Kadarius Seegars" },
      { url: u("1747056032562-1c73b853a79d"), credit: "Mick Kirchman" },
      { url: u("1658615324653-00fbdaee8a3f"), credit: "Chris Linnett" },
      { url: u("1507666405895-422eee7d517f"), credit: "Caleb Martin" },
      { url: u("1618767689160-da3fb810aad7"), credit: "Bernard Hermant" },
    ],
    reviews: [
      { by: "backpack_betty", rating: 5, daysAgo: 60, content: "Negotiations went smoothly once I agreed to the peanut clause. Would treaty again." },
      { by: "concierge_404", rating: 2, daysAgo: 44, content: "The squirrels demanded my booking reference, then my passport, then my lunch. I gave them all three. I was still not allowed to use the hammock." },
      { by: "wanderlost", rating: 5, daysAgo: 9, content: "Woke up to birdsong and an acorn on my pillow. I've never felt so passive-aggressively welcomed." },
    ],
  },
  {
    key: "vending",
    host: "snack_baron",
    title: "Studio Inside a Retired Vending Machine",
    description: `Experience the micro-living trend at its most micro. This beautifully converted vending machine offers 1.8 square metres of open-plan living and an illuminated facade that never, ever turns off.

Check-in is self-service: insert three ¥100 coins and press B4. If the door gets stuck halfway, give it a firm but loving shake, as is tradition.

The kitchenette includes a complimentary selection of snacks dating back to 2009. Sleeping is vertical but surprisingly restful. Not suitable for guests taller than the machine.`,
    property_type: "apartment",
    city: "Snackington",
    country: "Japan",
    nightly_price: 85,
    cleaning_fee: 15,
    service_fee: 12,
    max_guests: 1,
    bedrooms: 0,
    beds: 1,
    bathrooms: 0,
    amenities: { standard: ["wifi", "air_conditioning", "tv"], custom: ["Coin-operated front door", "Complimentary vintage snacks", "Glowing facade (permanent)"] },
    createdDaysAgo: 41,
    views: 2210,
    photos: [
      { url: u("1703924997249-e02946292b70"), credit: "Oh Taeyeon" },
      { url: u("1722942116153-ee3aa0fc2153"), credit: "Lisa Anna" },
      { url: u("1551641506-ee5bf4cb45f1"), credit: "Jezael Melgoza" },
      { url: u("1597418048367-7dd01e4404ee"), credit: "Evy Prentice" },
    ],
    reviews: [
      { by: "frosty_hosty", rating: 4, daysAgo: 35, content: "Cosy, bright, and the snacks have aged like fine wine. Minus one star because it took five attempts to press B4." },
      { by: "sleepy_traveller", rating: 5, daysAgo: 21, content: "Slept upright between a cola and a bag of crisps from 2009. Best sleep of my life. Possibly because of the crisps." },
      { by: "upper_crust", rating: 2, daysAgo: 6, content: "Considerably smaller than my wardrobe. The coin-operated door kept my coat." },
    ],
  },
  {
    key: "igloo",
    host: "frosty_hosty",
    title: "Igloo With Underfloor Heating (Results May Vary)",
    description: `Hand-carved from fresh Lapland snow every winter, our igloo combines ancient Arctic craftsmanship with one thoroughly modern luxury: underfloor heating.

We'll be honest. The underfloor heating works extremely well, which is why the floor is now a small indoor lake. Wellies are provided. The rest of the igloo remains a crisp −5 °C, perfect for preserving both cheese and memories.

On clear nights the northern lights dance directly overhead. On cloudy nights you can watch our reindeer neighbours, who are less colourful but more consistent.

No bathroom on site; the nearest one is a brisk 200-metre ski away.`,
    property_type: "other",
    city: "Frostbite Falls",
    country: "Finland",
    nightly_price: 230,
    cleaning_fee: 60,
    service_fee: 35,
    max_guests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 0,
    amenities: { standard: ["heating", "parking"], custom: ["Northern lights (weather permitting)", "Underfloor heating (see description)", "Reindeer neighbours"] },
    createdDaysAgo: 58,
    views: 1560,
    photos: [
      { url: u("1611582785023-91a3c0999d93"), credit: "Marquise de Photographie" },
      { url: u("1488415032361-b7e238421f1b"), credit: "Jonatan Pie" },
      { url: u("1712669869857-c9c0c098d024"), credit: "Visual Laurence" },
      { url: u("1483921020237-2ff51e8e4b22"), credit: "Erol Ahmed" },
      { url: u("1515279831895-4a03671e5edf"), credit: "Jon Garrison" },
    ],
    reviews: [
      { by: "mirage_management", rating: 5, daysAgo: 50, content: "I live in a desert and have never been colder or happier. The indoor lake was a delightful surprise." },
      { by: "suitcase_sam", rating: 4, daysAgo: 33, content: "Northern lights were incredible. The underfloor heating was also incredible, in the sense that I did not believe it until I was standing in it." },
      { by: "backpack_betty", rating: 5, daysAgo: 14, content: "The reindeer neighbours are very polite. One of them helped me with my bags." },
    ],
  },
  {
    key: "penthouse",
    host: "upper_crust",
    title: "Penthouse Reachable Only by Rope Ladder",
    description: `Floor-to-ceiling windows, Italian marble, a wraparound terrace with skyline views and one small quirk: the building has no lifts, no stairs and no fire escape. Just a very long, very premium rope ladder.

The climb takes most guests about four hours, which previous visitors have described as "character building", "a full-body workout" and "grounds for legal action". The rooftop gym is therefore entirely optional.

Groceries can be hoisted up in our artisanal wicker basket. Please do not order pizza; the delivery drivers have unionised.

Not suitable for guests with luggage, vertigo or plans.`,
    property_type: "apartment",
    city: "Upper Uppington",
    country: "United States",
    nightly_price: 980,
    cleaning_fee: 200,
    service_fee: 150,
    max_guests: 6,
    bedrooms: 3,
    beds: 3,
    bathrooms: 3,
    amenities: { standard: ["wifi", "air_conditioning", "kitchen", "gym", "balcony", "tv", "washing_machine"], custom: ["62-storey rope ladder", "Wicker grocery basket", "Personal sherpa (weekends)"] },
    createdDaysAgo: 33,
    views: 980,
    photos: [
      { url: u("1560448204-e02f11c3d0e2"), credit: "Francesca Tosolini" },
      { url: u("1500632907344-a073709b2448"), credit: "Kai Pilger" },
      { url: u("1560448204-444f743ef6e7"), credit: "Francesca Tosolini" },
      { url: u("1676574362161-c7f164d72a75"), credit: "Jakob Pfalz" },
      { url: u("1780257562963-3389a4105371"), credit: "Poojan Thanekar" },
    ],
    reviews: [
      { by: "deep_thoughts", rating: 5, daysAgo: 25, content: "Coming from 40 metres underground, I appreciated the change of scenery. Took six hours to reach the door. Worth it for the view, not for my knees." },
      { by: "wanderlost", rating: 3, daysAgo: 18, content: "Gorgeous apartment. I've been here three weeks now because I can't face the climb down." },
      { by: "snack_baron", rating: 4, daysAgo: 4, content: "The basket delivery system is genius. Sent up a vending machine. It's living its best life." },
    ],
  },
  {
    key: "houseboat",
    host: "damp_dave",
    title: "Houseboat That Is Mostly Boat",
    description: `Is it a house? Is it a boat? After extensive surveying we can confirm it is about 80% boat, 15% house and 5% open to interpretation.

Moored on a peaceful canal, this charming vessel offers two snug cabins, a galley kitchen and a deck perfect for watching the sunset or bailing water, whichever feels more urgent.

The boat is perfectly safe and has only drifted away twice this year. Each time it came back. We think it likes it here.

A complimentary bucket is provided. Please return it to the same place you found it, ideally above the waterline.`,
    property_type: "other",
    city: "Leakwater",
    country: "Netherlands",
    nightly_price: 120,
    cleaning_fee: 25,
    service_fee: 18,
    max_guests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 1,
    amenities: { standard: ["wifi", "heating", "kitchen"], custom: ["Gentle rocking (constant)", "Complimentary bucket", "Ducks on retainer"] },
    createdDaysAgo: 66,
    views: 870,
    photos: [
      { url: u("1593693397690-362cb9666fc2"), credit: "Abhishek Prasad" },
      { url: u("1459679749680-18eb1eb37418"), credit: "Javier M." },
      { url: u("1767549707544-8d938616d471"), credit: "K. K." },
      { url: u("1495616811223-4d98c6e9c869"), credit: "Johannes Plenio" },
      { url: u("1593693401060-9fc28cf9e368"), credit: "Abhishek Prasad" },
    ],
    reviews: [
      { by: "ring_ring_rentals", rating: 4, daysAgo: 52, content: "Gentle rocking, gorgeous sunsets, and only one unscheduled trip to Belgium. Would float again." },
      { by: "sleepy_traveller", rating: 5, daysAgo: 37, content: "The bucket really completes the experience. Ducks were attentive and professional." },
      { by: "lady_brothbury", rating: 3, daysAgo: 8, content: "Charming, though I must say the water is very under-seasoned." },
    ],
  },
  {
    key: "phonebox",
    host: "ring_ring_rentals",
    title: "Converted Red Phone Box, Sleeps Four (Vertically)",
    description: `A true British icon, lovingly converted into the country's most intimate shared accommodation. Sleeps four guests, provided all four are comfortable standing very still and very close.

Original features include the rotary telephone, which still works but only connects to 1987, and a faint aroma we've decided to call "heritage".

Panoramic windows on all four sides offer unrivalled views of the street and, crucially, the street's unrivalled views of you. Curtains are available as an optional extra at £40 per curtain.

The nearest bathroom is a 3-minute walk, or 11 minutes if one of your roommates has fallen asleep against the door.`,
    property_type: "shared_room",
    city: "Dialtone",
    country: "United Kingdom",
    nightly_price: 59,
    cleaning_fee: 10,
    service_fee: 9,
    max_guests: 4,
    bedrooms: 0,
    beds: 0,
    bathrooms: 0,
    amenities: { standard: ["wifi", "heating"], custom: ["Rotary phone (calls 1987 only)", "Windows on all four sides", "Standing-room-only beds"] },
    createdDaysAgo: 22,
    views: 1990,
    photos: [
      { url: u("1546771350-23d3ea8ae3f0"), credit: "Ilinca Roman" },
      { url: u("1594230381998-da6f0b256b63"), credit: "Karen Uppal" },
      { url: u("1635247049885-0910fd28901b"), credit: "Hemant Kanojiya" },
      { url: u("1698337841339-8a95f6512dbe"), credit: "The Now Time" },
    ],
    reviews: [
      { by: "nutty_landlord", rating: 4, daysAgo: 19, content: "Very social accommodation. I know my roommates better than my own family now. The phone connected me to my mum in 1987; she says I should eat more vegetables." },
      { by: "backpack_betty", rating: 3, daysAgo: 11, content: "Great location, great views, great audience. Bring your own curtain." },
      { by: "captain_foghorn", rating: 5, daysAgo: 3, content: "Gerald hasn't stopped talking about how quiet it was. I'm told that's a compliment." },
    ],
  },
  {
    key: "desert",
    host: "mirage_management",
    title: "Desert Villa With Complimentary Mirage",
    description: `Set among rolling golden dunes, this riad-style villa wraps around a tiled courtyard and a sparkling pool. At least, we're fairly sure the pool is there.

Every afternoon from 1 to 4 p.m. guests enjoy our signature complimentary mirage: a shimmering lake, palm trees and, on good days, a fully staffed ice-cream parlour. None of it is real, but the experience is free and refreshingly immersive.

The villa itself has four airy bedrooms, cool tiled floors and enough cushions to build a second villa. Sand will get into everything, including places you didn't know you had.

Camel parking is available out front. Bring your own camel.`,
    property_type: "villa",
    city: "Oasis Maybe",
    country: "Morocco",
    nightly_price: 410,
    cleaning_fee: 90,
    service_fee: 60,
    max_guests: 8,
    bedrooms: 4,
    beds: 5,
    bathrooms: 3,
    amenities: { standard: ["wifi", "air_conditioning", "kitchen", "parking", "pool"], custom: ["Daily mirage (1–4 p.m.)", "Camel parking", "Sand in everything"] },
    createdDaysAgo: 49,
    views: 1430,
    photos: [
      { url: u("1565020244281-fe53df7df170"), credit: "Serge Taeymans" },
      { url: u("1611522135886-a632d94ff6ae"), credit: "Dylan Jenkinson" },
      { url: u("1544234674-d099c6efdb0d"), credit: "Aleks" },
      { url: u("1671056434397-e1799d2e1c7b"), credit: "Ahmad Ajmi" },
      { url: u("1749704647688-a5ee71ac578c"), credit: "Kailun Zhang" },
    ],
    reviews: [
      { by: "frosty_hosty", rating: 5, daysAgo: 41, content: "The mirage ice-cream parlour was the best ice cream I've never had." },
      { by: "suitcase_sam", rating: 4, daysAgo: 27, content: "Beautiful villa. Still finding sand. It's been a month. I live in a flat in Leeds." },
      { by: "goose_management", rating: 4, daysAgo: 15, content: "Margaret enjoyed the pool. The camel did not enjoy Margaret." },
    ],
  },
  {
    key: "cottage",
    host: "goose_management",
    title: "Thatched Cottage Supervised by a Very Strict Goose",
    description: `Roses round the door, a crackling wood burner and a thatched roof straight off a biscuit tin. Everything about this cottage is gentle, cosy and calm, except Margaret.

Margaret is the goose. Margaret runs the property. Margaret will inspect your booking confirmation, your footwear and your intentions. She has no formal authority, but nobody has ever successfully argued with her.

Inside you'll find two cosy bedrooms, a farmhouse kitchen and a reading nook with a view of the garden, which Margaret will be patrolling.

Pets allowed, subject to Margaret's approval. Margaret does not approve.`,
    property_type: "house",
    city: "Honkleby",
    country: "England",
    nightly_price: 165,
    cleaning_fee: 35,
    service_fee: 22,
    max_guests: 5,
    bedrooms: 2,
    beds: 3,
    bathrooms: 1,
    amenities: { standard: ["wifi", "heating", "kitchen", "parking", "washing_machine", "pets_allowed"], custom: ["Goose supervision (mandatory)", "Wood-burning stove", "Rose garden"] },
    createdDaysAgo: 104,
    views: 2480,
    photos: [
      { url: u("1682516086739-c3fbf844529b"), credit: "Karen Cann" },
      { url: u("1580560400778-5d9fafd7fe18"), credit: "Amit Talwar" },
      { url: u("1783388744197-a15aba3334cc"), credit: "Clay Banks" },
      { url: u("1688396538097-af54bb314ab6"), credit: "Hugo Kruip" },
      { url: u("1564149567196-0c1d8bb7148f"), credit: "Sanjoy Saha" },
    ],
    reviews: [
      { by: "upper_crust", rating: 3, daysAgo: 88, content: "Idyllic cottage, but Margaret wouldn't let me in until I explained what I do for a living. She was unimpressed." },
      { by: "concierge_404", rating: 5, daysAgo: 64, content: "Margaret located my room faster than our own guests ever have. I've offered her a job." },
      { by: "wanderlost", rating: 4, daysAgo: 39, content: "Five stars for the cottage, three for Margaret, averaged out of respect and fear." },
      { by: "sleepy_traveller", rating: 5, daysAgo: 10, content: "Wood burner, roses, total peace. Then Margaret. Then peace again, eventually." },
    ],
  },
  {
    key: "hotel404",
    host: "concierge_404",
    title: "Hotel Room 404 (Not Found)",
    description: `Room 404 is our most exclusive room. So exclusive, in fact, that no guest has ever located it.

Reception will cheerfully direct you to the fourth floor, where the corridor continues for what our surveyor describes as "technically forever". Room 403 and Room 405 are right where you'd expect. Room 404 is not.

Guests who reach the end of the corridor report a strange sense of calm and a door labelled "Try again later". The room behind it has a king bed, blackout curtains and a minibar that only stocks cached items.

Breakfast is served 7–10 a.m. in the lobby, which, reassuringly, can always be found.`,
    property_type: "hotel",
    city: "Errorville",
    country: "Germany",
    nightly_price: 99,
    cleaning_fee: 20,
    service_fee: 15,
    max_guests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    amenities: { standard: ["wifi", "air_conditioning", "heating", "tv", "gym"], custom: ["Infinite corridor", "Reception that redirects you", "Minibar (cached items only)"] },
    createdDaysAgo: 15,
    views: 3120,
    photos: [
      { url: u("1495365200479-c4ed1d35e1aa"), credit: "runnyrem" },
      { url: u("1631049307264-da0ec9d70304"), credit: "Point3D Commercial Imaging Ltd." },
      { url: u("1611048267451-e6ed903d4a38"), credit: "Huy Nguyen" },
      { url: u("1739083168122-f1f59db99e78"), credit: "Jakub Żerdzicki" },
    ],
    reviews: [
      { by: "deep_thoughts", rating: 4, daysAgo: 13, content: "Never found the room but the corridor was very calming. Like a bunker, but horizontal." },
      { by: "backpack_betty", rating: 2, daysAgo: 8, content: "Walked for six hours. Found a vending machine that turned out to be someone's flat. Apologised to the tenant." },
      { by: "snack_baron", rating: 5, daysAgo: 7, content: "Can confirm the vending machine was my flat. Lovely visitor." },
    ],
  },
  {
    key: "bunker",
    host: "deep_thoughts",
    title: "Underground Bunker With Optimistic Lighting",
    description: `Built for the end of the world and redecorated for the beginning of a lovely weekend. Forty metres beneath a sheep paddock, this decommissioned bunker has been transformed with 3,000 fairy lights and an unshakeable positive attitude.

Enjoy total silence, a constant 14 °C and the peace of mind that comes from blast doors rated for just about anything. The communal kitchen includes a library of tinned food sorted by expiry date and then by mood.

There's no phone signal and no natural light, but the fairy lights are on a timer that simulates a gentle sunrise, a cheerful afternoon and, if you leave them on, a nightclub.

Please close the blast door behind you. The sheep are very curious.`,
    property_type: "other",
    city: "Deepdown",
    country: "New Zealand",
    nightly_price: 75,
    cleaning_fee: 20,
    service_fee: 10,
    max_guests: 6,
    bedrooms: 2,
    beds: 4,
    bathrooms: 1,
    amenities: { standard: ["wifi", "heating", "kitchen", "washing_machine"], custom: ["40 metres of reinforced concrete", "3,000 fairy lights", "Tinned-food library"] },
    createdDaysAgo: 8,
    views: 640,
    photos: [
      { url: u("1736322584712-9f32bd1ee2dd"), credit: "Evgeniy Smersh" },
      { url: u("1586871608370-4adee64d1794"), credit: "Dorsa Masghati" },
      { url: u("1513625047154-f390b1b0df20"), credit: "Arash" },
      { url: u("1702480259246-33a8476d91b2"), credit: "Jakub Żerdzicki" },
      { url: u("1677659143415-fed24d4e1fc8"), credit: "Miguel Alcântara" },
    ],
    reviews: [
      { by: "mirage_management", rating: 4, daysAgo: 6, content: "Total darkness was a nice break from the mirage. The fairy lights are aggressively cheerful." },
      { by: "damp_dave", rating: 5, daysAgo: 4, content: "Finally, somewhere completely dry. I wept." },
      { by: "suitcase_sam", rating: 4, daysAgo: 2, content: "The tinned-food library is curated with real love. I recommend the melancholy shelf." },
    ],
  },
];

/** username → listing keys they've favourited (drives "Most popular"). */
export const FAVOURITES: Record<string, string[]> = {
  sleepy_traveller: ["castle", "cottage", "vending", "lighthouse"],
  suitcase_sam: ["lighthouse", "igloo", "desert", "hotel404"],
  backpack_betty: ["treehouse", "igloo", "cottage"],
  wanderlost: ["lighthouse", "penthouse", "cottage", "castle"],
  goose_management: ["lighthouse"],
  concierge_404: ["cottage", "hotel404"],
  deep_thoughts: ["penthouse", "bunker"],
  frosty_hosty: ["desert", "castle"],
};
