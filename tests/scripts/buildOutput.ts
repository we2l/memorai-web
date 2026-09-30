import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Tests under tests/scripts that read the production build. They skip when there
// is no build (plain `npm test`) and are required in CI (`REQUIRE_BUILD=1 npm run test:build`).
export const PUBLIC_DIR = resolve(__dirname, '../../.output/public')
export const skipWithoutBuild = !existsSync(PUBLIC_DIR) && !process.env.REQUIRE_BUILD
