import { mergeConfig } from "vitest/config";
import base from "./vitest.config";
export default mergeConfig(base, { server: { fs: { allow: ["/persist", "/dev-server"] } } });
