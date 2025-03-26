import { x } from "tinyexec";
import process from "node:process";
import * as fs from "node:fs/promises";
import * as path from "node:path";

async function getContents(filename) {}
/**
 * @returns {import('vite').Plugin}
 */
export default function ElmHot() {
  return {
    name: "@abuffseagull/vite-plugin-elm",
    enforce: "pre",
    async buildStart() {
      const fifoPath = path.resolve(process.env.XDG_RUNTIME_DIR, "elm-fifo.js");

      try {
        await fs.stat(fifoPath);
      } catch (err) {
        if (err.code === "ENOENT") {
          await x("mkfifo", [fifoPath]);
        }
      }
    },
    async load(id) {
      if (!id.endsWith(".elm")) return;

      const fifoPath = path.resolve(process.env.XDG_RUNTIME_DIR, "elm-fifo.js");

      const contents = fs.readFile(fifoPath, { encoding: "utf-8" });
      await x("elm", ["make", id, "--output", fifoPath]);
      let code = await contents;

      code = code.replace(/\(function\(scope\)\{(.*)\}\(this\)\);/gs, "$1");
      code = code.replace(
        /_Platform_export\(\{'(?<name>\w+)':(?<value>.*)\}\);/gs,
        "export const $<name> = $<value>;",
      );
      code = code.replaceAll(
        /var view = impl\.view/gs,
        "import.meta.hot.data.view ??= impl.view",
      );
      code = code.replaceAll(
        /return (_Browser_makeAnimator\(.*?\}\);)/gs,
        "import.meta.hot.data.doUpdate = $1\nreturn import.meta.hot.data.doUpdate;",
      );
      code = code.replaceAll(
        /view\(model\);/gs,
        `import.meta.hot.data.view(model);
        import.meta.hot.data.lastModel = model;`,
      );
      const {
        groups: { updateFunction, viewFunction },
      } =
        /update: (?<updateFunction>\$[\w$]+),\s+view: (?<viewFunction>\$[\w$]+)/gs.exec(
          code,
        );
      const escapedUpdateFunction = updateFunction.replaceAll(
        "$",
        String.raw`\$`,
      );
      const regex = new RegExp(
        String.raw`var (${escapedUpdateFunction}) = (F2\(.*?^\s+}\));`,
        "gms",
      );
      code = code.replaceAll(
        regex,
        `var $1 = $2;
         import.meta.hot.data.update ??= $1;
        `,
      );

      code += `
      export const hmr = { update: ${updateFunction}, view: ${viewFunction}};
      import.meta.hot.accept((mod) => {
      debugger;
        import.meta.hot.data.update = mod.hmr.update;
        import.meta.hot.data.view = mod.hmr.view;
        import.meta.hot.data.doUpdate(import.meta.hot.data.lastModel);
      })
      `;

      return { code };
    },
  };
}
