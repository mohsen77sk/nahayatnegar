import { readdir, rename } from "node:fs/promises";
import { join, parse, resolve } from "node:path";

const outputDirectory = resolve(process.argv[2] ?? "dist");
let renamedCount = 0;

async function renameHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      await renameHtmlFiles(entryPath);
    } else if (entry.isFile() && /\.html$/i.test(entry.name)) {
      const destination = join(directory, `${parse(entry.name).name}.phtml`);
      await rename(entryPath, destination);
      renamedCount += 1;
    }
  }
}

await renameHtmlFiles(outputDirectory);
console.log(`Renamed ${renamedCount} HTML file(s) to PHTML in ${outputDirectory}.`);
