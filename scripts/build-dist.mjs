import { mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

const srcDir = join(projectRoot, "src");
const distDir = join(projectRoot, "dist");

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

await build({
	entryPoints: [join(srcDir, "index.js")],
	outfile: join(distDir, "index.js"),
	bundle: true,
	format: "esm",
	minify: true,
	target: ["es2020"],
	legalComments: "none"
});

console.log("dist/index.js generated (single minified bundle)");

await build({
    entryPoints: [join(srcDir, "style.css")],
    outfile: join(distDir, "style.css"),
    bundle: true,
    minify: true
});

console.log("dist/style.css generated (single minified bundle)");