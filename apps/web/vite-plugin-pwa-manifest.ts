import type { Plugin } from "vite";

import {
  createPwaManifest,
  PWA_LOGO_DEV_SRC,
} from "./src/lib/pwa-manifest";

function findBuiltLogoAsset(bundle: Record<string, unknown>): string | undefined {
  const match = Object.keys(bundle).find(
    (file) => file.startsWith("assets/") && /logo.*\.png$/i.test(file),
  );
  return match ? `/${match}` : undefined;
}

export function pwaManifestPlugin(): Plugin {
  return {
    name: "pwa-manifest",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== "/manifest.webmanifest") {
          next();
          return;
        }

        res.setHeader("Content-Type", "application/manifest+json");
        res.end(
          `${JSON.stringify(createPwaManifest(PWA_LOGO_DEV_SRC), null, 2)}\n`,
        );
      });
    },
    generateBundle(_options, bundle) {
      const logoSrc = findBuiltLogoAsset(bundle) ?? PWA_LOGO_DEV_SRC;
      this.emitFile({
        type: "asset",
        fileName: "manifest.webmanifest",
        source: `${JSON.stringify(createPwaManifest(logoSrc), null, 2)}\n`,
      });
    },
  };
}
