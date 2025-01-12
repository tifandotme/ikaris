import * as cheerio from "cheerio";
import { walk } from "@std/fs";
import { globToRegExp } from "@std/path";
import { parseArgs } from "@std/cli";
import { parseFile } from "@swc/core";
import { collectIconIds } from "./utils.ts";

function printHelp(): void {
  console.log("Usage: jois [..options]");
  console.log("\nOptions:");
  // deno-fmt-ignore
  console.log("  -p, --project-root       Set project root path (default: current working directory)");
  // deno-fmt-ignore
  console.log("  -s, --svg-path           Sprite SVG path (default: public/sprite.svg)");
  console.log("  -h, --help               Display this help and exit");
}

async function main() {
  const args = parseArgs(Deno.args, {
    alias: {
      h: "help",
      p: "project-root",
      s: "svg-path",
    },
    boolean: ["help"],
    string: ["svg-path", "project-root"],
  });

  if (args.help) {
    printHelp();
    Deno.exit(0);
  }

  const projectRootPath = args["project-root"] ?? Deno.cwd();
  const spriteSvgPath = args["svg-path"]
    ? `${projectRootPath}/${args["svg-path"]}`
    : `${projectRootPath}/public/sprite.svg`;

  const spriteSvg = await Deno.readFile(spriteSvgPath);
  const $ = cheerio.load(new TextDecoder("utf-8").decode(spriteSvg));
  const iconIds = new Set($("symbol").map((_, el) => $(el).attr("id")).get());

  if (iconIds.size === 0) {
    console.log("No sprite icons found!");
    return;
  }

  const files = await Array.fromAsync(walk(projectRootPath, {
    includeDirs: false,
    match: [
      /\.(jsx|tsx)$/,
      ...args._.map((pattern) => globToRegExp(pattern.toString())),
    ],
    skip: [/node_modules/, /\.git/],
  }));

  const usedIds = new Set<string>();

  for (const file of files) {
    const ast = await parseFile(file.path, {
      syntax: /\.(tsx|ts)$/.test(file.path) ? "typescript" : "ecmascript",
      tsx: /\.tsx$/.test(file.path),
      jsx: /\.jsx$/.test(file.path),
    });

    collectIconIds(ast).forEach((id) => usedIds.add(id));
  }

  const unusedIds = [...iconIds].filter((id) => !usedIds.has(id));

  if (unusedIds.length > 0) {
    console.log("Unused icons found:");
    unusedIds.forEach((id) => console.log(`- ${id}`));
  } else {
    console.log("No unused icons found!");
  }
}

main().catch((error) => {
  console.error(error);
  Deno.exit(1);
});
