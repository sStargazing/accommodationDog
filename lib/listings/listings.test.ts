import { describe, expect, it } from "vitest";
import { formatPrice, formatRating } from "@/lib/utils/format";
import { calculatePrice, countNights } from "./pricing";
import { countActiveFilters, filtersToSearchParams, parseListingFilters, searchTermFilters } from "./search-params";

describe("parseListingFilters", () => {
  it("parses a full query", () => {
    expect(
      parseListingFilters({
        q: "  castle ",
        type: "castle",
        guests: "4",
        min_price: "50",
        max_price: "300",
        amenity: ["wifi", "pool", "wifi"],
        rating: "4.5",
        sort: "price_asc",
        page: "2",
        checkin: "2026-12-01",
        checkout: "2026-12-05",
      }),
    ).toEqual({
      q: "castle",
      type: "castle",
      guests: 4,
      minPrice: 50,
      maxPrice: 300,
      amenities: ["wifi", "pool"],
      rating: 4.5,
      sort: "price_asc",
      page: 2,
      checkIn: "2026-12-01",
      checkOut: "2026-12-05",
    });
  });

  it("drops invalid values instead of failing", () => {
    expect(
      parseListingFilters({
        type: "spaceship",
        guests: "-3",
        min_price: "abc",
        amenity: "jacuzzi",
        rating: "2",
        sort: "chaos",
        page: "0",
        checkin: "yesterday",
      }),
    ).toEqual({ amenities: [], sort: "popular", page: 1 });
  });

  it("treats empty form fields as unset", () => {
    expect(parseListingFilters({ q: "", min_price: "", max_price: " ", guests: "", rating: "" })).toEqual({
      amenities: [],
      sort: "popular",
      page: 1,
    });
  });

  it("ignores inverted price and date ranges", () => {
    const filters = parseListingFilters({ min_price: "500", max_price: "100", checkin: "2026-12-05", checkout: "2026-12-01" });
    expect(filters.minPrice).toBe(500);
    expect(filters.maxPrice).toBeUndefined();
    expect(filters.checkOut).toBeUndefined();
  });

  it("round-trips through URL parameters", () => {
    const params = { q: "igloo", type: "other", amenity: ["heating", "parking"], rating: "4", sort: "newest", page: "3" };
    const filters = parseListingFilters(params);
    const again = parseListingFilters(Object.fromEntries(
      [...new Set(filtersToSearchParams(filters).keys())].map((key) => [key, filtersToSearchParams(filters).getAll(key)]),
    ));
    expect(again).toEqual(filters);
  });

  it("counts panel filters", () => {
    expect(countActiveFilters(parseListingFilters({ min_price: "10", amenity: ["wifi", "gym"], rating: "4", q: "x" }))).toBe(4);
  });
});

describe("searchTermFilters", () => {
  it("builds one OR group per word", () => {
    expect(searchTermFilters("Castle  Scotland")).toEqual([
      'title.ilike."%Castle%",city.ilike."%Castle%",country.ilike."%Castle%",description.ilike."%Castle%"',
      'title.ilike."%Scotland%",city.ilike."%Scotland%",country.ilike."%Scotland%",description.ilike."%Scotland%"',
    ]);
  });

  it("strips characters that could alter the filter syntax", () => {
    const [filter] = searchTermFilters('x"),user_id.eq.(1');
    expect(filter).not.toMatch(/user_id\.eq|\)/);
    expect(searchTermFilters("%%% ___ ***")).toEqual([]);
  });
});

describe("pricing", () => {
  it("counts nights between dates", () => {
    expect(countNights("2026-12-01", "2026-12-05")).toBe(4);
    expect(countNights("2026-12-05", "2026-12-05")).toBeNull();
    expect(countNights("2026-12-05", "2026-12-01")).toBeNull();
    expect(countNights(undefined, "2026-12-01")).toBeNull();
    expect(countNights("2026-01-01", "2027-06-01")).toBeNull();
  });

  it("totals nightly price, cleaning and service fees", () => {
    expect(calculatePrice({ nightlyPrice: 120, cleaningFee: 40, serviceFee: 15.5, nights: 3 })).toEqual({
      nights: 3,
      nightsSubtotal: 360,
      cleaningFee: 40,
      serviceFee: 15.5,
      total: 415.5,
    });
    // No floating-point drift.
    expect(calculatePrice({ nightlyPrice: 0.1, cleaningFee: 0.2, serviceFee: 0, nights: 3 }).total).toBe(0.5);
  });
});

describe("formatting", () => {
  it("formats prices and ratings", () => {
    expect(formatPrice(1200)).toBe("$1,200");
    expect(formatPrice(99.5)).toBe("$99.50");
    expect(formatRating(5)).toBe("5.0");
    expect(formatRating(4.5)).toBe("4.5");
    expect(formatRating(4.67)).toBe("4.67");
  });
});
