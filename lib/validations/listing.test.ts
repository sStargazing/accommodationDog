import { describe, expect, it } from "vitest";
import { detectImageType } from "@/lib/images/signature";
import { listingFormSchema, stepForField, toDatabasePayload, listingDetailsSchema } from "./listing";

const owner = "5b6f3a52-6f3e-4a8e-9a0d-2d2a7c1f0e11";
const photo = (n: number) => `${owner}/00000000-0000-4000-8000-00000000000${n}.webp`;

const valid = {
  title: "Treehouse With Mandatory Squirrel Negotiations",
  description: "Peanuts are non-negotiable.",
  property_type: "cabin",
  city: "Acorn Hollow",
  country: "Canada",
  max_guests: 3,
  bedrooms: 1,
  beds: 2,
  bathrooms: 0.5,
  nightly_price: 145,
  cleaning_fee: 30,
  service_fee: 19.99,
  amenities: { standard: ["wifi", "heating"], custom: ["Rope bridge", "Acorn minibar"] },
  images: [
    { path: photo(1), isPrimary: true },
    { path: photo(2), isPrimary: false },
  ],
  confirmFictional: true,
  confirmImageRights: true,
};

const errorPaths = (input: unknown) => {
  const result = listingFormSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
};

describe("listingFormSchema", () => {
  it("accepts a complete listing and trims text", () => {
    const parsed = listingFormSchema.parse({ ...valid, title: "  Spaced out  " });
    expect(parsed.title).toBe("Spaced out");
  });

  it.each([
    ["a 101-character title", { title: "x".repeat(101) }, "title"],
    ["an empty title", { title: "   " }, "title"],
    ["a 3001-character description", { description: "x".repeat(3001) }, "description"],
    ["an unknown property type", { property_type: "spaceship" }, "property_type"],
    ["zero guests", { max_guests: 0 }, "max_guests"],
    ["fractional beds", { beds: 1.5 }, "beds"],
    ["quarter bathrooms", { bathrooms: 1.25 }, "bathrooms"],
    ["a negative price", { nightly_price: -1 }, "nightly_price"],
    ["a missing price", { nightly_price: Number.NaN }, "nightly_price"],
    ["fractions of a cent", { cleaning_fee: 1.005 }, "cleaning_fee"],
    ["an unknown amenity", { amenities: { standard: ["jacuzzi"], custom: [] } }, "amenities.standard.0"],
    ["six custom amenities", { amenities: { standard: [], custom: ["a", "b", "c", "d", "e", "f"] } }, "amenities.custom"],
    ["duplicate custom amenities", { amenities: { standard: [], custom: ["Moat", "moat"] } }, "amenities.custom"],
    ["a 41-character custom amenity", { amenities: { standard: [], custom: ["x".repeat(41)] } }, "amenities.custom.0"],
    ["no photos", { images: [] }, "images"],
    ["eleven photos", { images: Array.from({ length: 11 }, (_, i) => ({ path: `${owner}/${crypto.randomUUID()}.jpg`, isPrimary: i === 0 })) }, "images"],
    ["no cover photo", { images: [{ path: photo(1), isPrimary: false }] }, "images"],
    ["two cover photos", { images: [{ path: photo(1), isPrimary: true }, { path: photo(2), isPrimary: true }] }, "images"],
    ["an unsafe photo path", { images: [{ path: "../../etc/passwd", isPrimary: true }] }, "images.0.path"],
    ["a gif", { images: [{ path: `${owner}/00000000-0000-4000-8000-000000000001.gif`, isPrimary: true }] }, "images.0.path"],
    ["no fictional confirmation", { confirmFictional: false }, "confirmFictional"],
    ["no image-rights confirmation", { confirmImageRights: false }, "confirmImageRights"],
  ])("rejects %s", (_label, override, path) => {
    expect(errorPaths({ ...valid, ...override })).toContain(path);
  });

  it("maps fields to their form steps", () => {
    expect(stepForField("title")).toBe(0);
    expect(stepForField("nightly_price")).toBe(1);
    expect(stepForField("amenities.custom")).toBe(2);
    expect(stepForField("images")).toBe(3);
    expect(stepForField("confirmFictional")).toBe(4);
  });

  it("builds the database payload without the confirmations", () => {
    const payload = toDatabasePayload(listingDetailsSchema.parse(valid));
    expect(payload.listing).not.toHaveProperty("confirmFictional");
    expect(payload.listing).not.toHaveProperty("images");
    expect(payload.images).toEqual([
      { storage_path: photo(1), is_primary: true },
      { storage_path: photo(2), is_primary: false },
    ]);
  });
});

describe("detectImageType", () => {
  const bytes = (...values: number[]) => new Uint8Array(values);

  it("recognises JPEG, PNG and WebP signatures", () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpg");
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("png");
    expect(detectImageType(new TextEncoder().encode("RIFF\x00\x00\x00\x00WEBPVP8 "))).toBe("webp");
  });

  it("rejects other content, even with an image-like start", () => {
    expect(detectImageType(new TextEncoder().encode("<script>alert(1)</script>"))).toBeNull();
    expect(detectImageType(new TextEncoder().encode("GIF89a"))).toBeNull();
    expect(detectImageType(new TextEncoder().encode("RIFF\x00\x00\x00\x00WAVE"))).toBeNull();
    expect(detectImageType(bytes(0xff, 0xd8))).toBeNull();
  });
});
