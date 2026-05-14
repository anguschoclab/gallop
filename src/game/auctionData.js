"use strict";
/**
 * auctionData.ts - Auction sale triggers and labels
 *
 * This file provides auction sale schedule triggers and kind labels for
 * different types of horse sales (weanling, yearling, mixed, broodmare, etc.).
 *
 * Dependencies: ./types (AuctionSaleKind)
 * Related files: auction.ts (uses sale triggers), auctionRunner.ts (uses sale data)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KIND_LABELS = exports.SALE_TRIGGERS = void 0;
exports.SALE_TRIGGERS = [
    { doy: 75, kind: "2yo_training", name: "Spring 2YO Breeze-Up Sale" },
    { doy: 90, kind: "weanling", name: "Spring Weanling Sale" },
    { doy: 105, kind: "yearling_south", name: "Southern Yearling Sale" },
    { doy: 165, kind: "mixed", name: "Midsummer Mixed Sale" },
    { doy: 240, kind: "yearling", name: "Late Summer Yearling Sale" },
    { doy: 270, kind: "racing_age", name: "Autumn Horses-of-Racing-Age Sale" },
    { doy: 290, kind: "weanling_south", name: "Southern Weanling Sale" },
    { doy: 335, kind: "broodmare", name: "Year-End Broodmare & Breeding Stock Sale" },
];
exports.KIND_LABELS = {
    weanling: "Weanling Sale",
    yearling: "Yearling Sale",
    weanling_south: "Southern Weanling Sale",
    yearling_south: "Southern Yearling Sale",
    mixed: "Mixed Sale",
    broodmare: "Broodmare & Breeding Stock Sale",
    "2yo_training": "2YOs in Training Sale",
    racing_age: "Horses-of-Racing-Age Sale",
};
