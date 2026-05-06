import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import XLSX from "xlsx";

const PORT = Number(process.env.PORT || 3023);
const ROOT = process.cwd();
const TOOL_DIR = path.join(ROOT, "tools", "caucasmetal-scraper");
const OUT_DIR = path.join(TOOL_DIR, "out");
const BASE = "https://caucasmetal.ge";
const START_URL = `${BASE}/ka/categories`;

const state = {
  running: false,
  done: false,
  error: "",
  startedAt: null,
  finishedAt: null,
  progress: 0,
  current: "",
  categories: 0,
  rows: 0,
  skipped: 0,
  logs: [],
  result: null,
};

function log(message) {
  const line = `${new Date().toLocaleTimeString("ka-GE")} · ${message}`;
  state.logs = [line, ...state.logs].slice(0, 80);
  console.log(line);
}

function json(res, payload, status = 200) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(href) {
  try {
    return new URL(href, BASE).toString();
  } catch {
    return "";
  }
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; engineers.ge material scraper)",
      accept: "text/html,application/xhtml+xml",
      "accept-language": "ka,en;q=0.8",
    },
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} · ${url}`);
  }
  return res.text();
}

function collectCategoryLinks(html) {
  const links = new Map();
  for (const match of html.matchAll(/href="(\/ka\/categories[^"#?]*)"[^>]*>([^<]*)/g)) {
    const url = absoluteUrl(match[1]);
    const label = cleanText(match[2]);
    if (url && !url.includes("/cart")) {
      links.set(url, label);
    }
  }
  for (const match of html.matchAll(/\\"href\\":\\"(\/ka\/categories[^"\\?#]*)\\"(?:,[^}]*?\\"children\\":\\"([^"\\]*)\\")?/g)) {
    const url = absoluteUrl(match[1]);
    const label = cleanText(match[2] || "");
    if (url) {
      links.set(url, label || links.get(url) || "");
    }
  }
  return links;
}

function extractFlightLines(html) {
  const chunks = [];
  const scripts = html.match(/<script>self\.__next_f\.push\([\s\S]*?<\/script>/g) || [];
  for (const script of scripts) {
    const code = script.replace(/^<script>/, "").replace(/<\/script>$/, "");
    const sandbox = {
      self: {
        __next_f: {
          push(value) {
            if (Array.isArray(value) && typeof value[1] === "string") {
              chunks.push(value[1]);
            }
          },
        },
      },
    };
    try {
      vm.runInNewContext(code, sandbox, { timeout: 50 });
    } catch {
      // Some flight chunks reference browser globals; static row chunks still parse in later scripts.
    }
  }
  return chunks.flatMap((chunk) => chunk.split("\n"));
}

function firstPlainChild(node) {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return node;
  if (!Array.isArray(node)) return "";
  const props = node[3];
  if (!props || !Object.prototype.hasOwnProperty.call(props, "children")) return "";
  return firstPlainChild(props.children);
}

function valueFromCell(cell) {
  const children = cell?.[3]?.children;
  if (!Array.isArray(children) || children.length < 2) return "";
  const valueNode = children[1];
  const props = Array.isArray(valueNode) ? valueNode[3] : null;
  if (props && typeof props.value === "number") return props.value;
  return firstPlainChild(valueNode);
}

function labelFromCell(cell) {
  const children = cell?.[3]?.children;
  if (!Array.isArray(children) || children.length < 1) return "";
  return cleanText(firstPlainChild(children[0]));
}

function parseRows(html, pageUrl, categoryFallback) {
  const rows = [];
  const lines = extractFlightLines(html);
  for (const line of lines) {
    const payload = line.replace(/^[a-z0-9]+:/i, "");
    if (!payload.startsWith('["$","tr"')) continue;
    let tr;
    try {
      tr = JSON.parse(payload);
    } catch {
      continue;
    }
    const productId = tr[2];
    const cells = tr?.[3]?.children;
    if (!Array.isArray(cells) || cells.length < 2) continue;

    const fields = {};
    for (const cell of cells) {
      const label = labelFromCell(cell);
      const value = valueFromCell(cell);
      if (label && label !== "კალათა") {
        fields[label] = value;
      }
    }

    const productName = cleanText(fields["დასახელება"] || categoryFallback);
    const priceLabel = Object.keys(fields).find((key) => key.includes("ფასი"));
    const price = priceLabel ? Number(fields[priceLabel]) : null;
    const unit = priceLabel?.includes("₾") ? priceLabel.replace("ფასი", "").replace(/[()]/g, "").trim() || "₾" : "";
    delete fields["დასახელება"];
    if (priceLabel) delete fields[priceLabel];

    rows.push({
      productId,
      category: categoryFallback,
      productName,
      price,
      unit,
      url: pageUrl,
      specs: fields,
    });
  }
  return rows;
}

function flattenRow(row) {
  const specs = row.specs || {};
  return {
    ID: row.productId,
    კატეგორია: row.category,
    დასახელება: row.productName,
    ფასი: row.price ?? "",
    ერთეული: row.unit,
    ბმული: row.url,
    ...specs,
  };
}

async function scrape() {
  if (state.running) return;
  Object.assign(state, {
    running: true,
    done: false,
    error: "",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    progress: 1,
    current: START_URL,
    categories: 0,
    rows: 0,
    skipped: 0,
    logs: [],
    result: null,
  });

  try {
    await mkdir(OUT_DIR, { recursive: true });
    log("საწყისი კატეგორიების ჩამოტვირთვა");
    const startHtml = await fetchText(START_URL);
    const queue = [[START_URL, "პროდუქცია"], ...collectCategoryLinks(startHtml).entries()];
    const seen = new Set();
    const allRows = [];
    const categorySummary = [];

    for (let i = 0; i < queue.length; i += 1) {
      const [url, label] = queue[i];
      if (seen.has(url)) continue;
      seen.add(url);
      state.current = url;
      state.progress = Math.max(2, Math.round((i / Math.max(queue.length, 1)) * 92));

      const html = url === START_URL ? startHtml : await fetchText(url);
      for (const [nextUrl, nextLabel] of collectCategoryLinks(html)) {
        if (!seen.has(nextUrl) && !queue.some(([queued]) => queued === nextUrl)) {
          queue.push([nextUrl, nextLabel]);
        }
      }

      const title = cleanText(
        html.match(/<title>(.*?)\s*(?:\||—)/)?.[1] ||
          label ||
          url.split("/").filter(Boolean).pop()
      );
      const rows = parseRows(html, url, title);
      if (rows.length) {
        log(`${title}: ${rows.length} პოზიცია`);
        categorySummary.push({ კატეგორია: title, პოზიციები: rows.length, ბმული: url });
        allRows.push(...rows);
      } else {
        state.skipped += 1;
      }
      state.categories = seen.size;
      state.rows = allRows.length;
    }

    const rowsFlat = allRows.map(flattenRow);
    const jsonPath = path.join(OUT_DIR, "caucasmetal-products.json");
    const xlsxPath = path.join(OUT_DIR, "caucasmetal-products.xlsx");
    await writeFile(jsonPath, JSON.stringify({ scrapedAt: new Date().toISOString(), rows: allRows }, null, 2));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsFlat), "მასალები");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(categorySummary), "კატეგორიები");
    XLSX.writeFile(wb, xlsxPath);

    Object.assign(state, {
      running: false,
      done: true,
      finishedAt: new Date().toISOString(),
      progress: 100,
      current: "",
      result: {
        rows: allRows.length,
        categories: categorySummary.length,
        json: "/download/json",
        xlsx: "/download/xlsx",
      },
    });
    log(`დასრულდა: ${allRows.length} პოზიცია, ${categorySummary.length} ფასიანი კატეგორია`);
  } catch (error) {
    Object.assign(state, {
      running: false,
      done: false,
      error: error instanceof Error ? error.message : String(error),
      finishedAt: new Date().toISOString(),
    });
    log(`შეცდომა: ${state.error}`);
  }
}

async function sendFile(res, filePath, contentType, filename) {
  if (!existsSync(filePath)) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("File not ready");
    return;
  }
  const body = await readFile(filePath);
  res.writeHead(200, {
    "content-type": contentType,
    "content-disposition": `attachment; filename="${filename}"`,
    "cache-control": "no-store",
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  try {
    if (url.pathname === "/") {
      const body = await readFile(path.join(TOOL_DIR, "index.html"), "utf8");
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(body);
      return;
    }
    if (url.pathname === "/api/start") {
      scrape();
      json(res, { ok: true });
      return;
    }
    if (url.pathname === "/api/status") {
      json(res, state);
      return;
    }
    if (url.pathname === "/favicon.ico") {
      res.writeHead(204, { "cache-control": "public, max-age=86400" });
      res.end();
      return;
    }
    if (url.pathname === "/download/xlsx") {
      await sendFile(
        res,
        path.join(OUT_DIR, "caucasmetal-products.xlsx"),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "caucasmetal-products.xlsx"
      );
      return;
    }
    if (url.pathname === "/download/json") {
      await sendFile(res, path.join(OUT_DIR, "caucasmetal-products.json"), "application/json", "caucasmetal-products.json");
      return;
    }
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  } catch (error) {
    json(res, { error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`CaucasMetal scraper viewer: http://localhost:${PORT}`);
});
