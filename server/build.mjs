import esbuild from "esbuild";
import fs from "fs";

const functions = ["s3url", "reader", "parser", "crud"];

if (!fs.existsSync("dist")) {
  fs.mkdirSync("dist");
}

for (const fn of functions) {
  await esbuild.build({
    entryPoints: [`functions/${fn}.ts`],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "esm",
    outfile: `dist/${fn}.js`,
    sourcemap: true,
    minify: false,
    external: ["@aws-sdk/*"],
  });

  console.log(`Built ${fn}`);
}
