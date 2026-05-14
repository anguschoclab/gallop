"use strict";
/**
 * types.ts - Central type exports
 *
 * This file re-exports all type definitions from core modules and provides a unified
 * type interface for the game module.
 *
 * Dependencies: @/core/common/types, @/core/genetics/types, @/core/horse/types, @/core/jockey/types, @/core/race/types, @/core/stable/types, @/core/market/types, @/core/breeding/types, @/core/campaign/types, ./state (GameState), ./awards/types (RegionalAward, AwardRegion)
 * Related files: All game files use these types
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("@/core/common/types"), exports);
__exportStar(require("@/core/genetics/types"), exports);
__exportStar(require("@/core/horse/types"), exports);
__exportStar(require("@/core/jockey/types"), exports);
__exportStar(require("@/core/race/types"), exports);
__exportStar(require("@/core/stable/types"), exports);
__exportStar(require("@/core/market/types"), exports);
__exportStar(require("@/core/breeding/types"), exports);
__exportStar(require("@/core/campaign/types"), exports);
