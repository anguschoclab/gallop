import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config";
export default mergeConfig(base, defineConfig({ server: { fs: { allow: ["/persist", "."] } } }));
