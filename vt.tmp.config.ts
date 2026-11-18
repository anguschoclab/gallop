import base from "./vitest.config.ts";
import { mergeConfig } from "vitest/config";
export default mergeConfig(base, { server: { fs: { strict: false } } });
