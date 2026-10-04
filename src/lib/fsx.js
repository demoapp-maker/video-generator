/** Utilitas file & JSON kecil yang dipakai seluruh stage. */
import fs from "node:fs";
import path from "node:path";

export const ensureDir = (dir) => {
  fs.mkdirSync(dir, {recursive: true});
  return dir;
};

export const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

export const writeJson = (file, data) => {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return file;
};

export const writeText = (file, text) => {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, text, "utf8");
  return file;
};

export const exists = (file) => fs.existsSync(file);

export const listFiles = (dir, ext = null) => {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => (ext ? f.toLowerCase().endsWith(ext) : true))
    .filter((f) => !f.startsWith("."))
    .sort();
};

export const findFirst = (dir, names) => {
  if (!fs.existsSync(dir)) return null;
  for (const name of names) {
    const candidate = path.join(dir, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
};

export const rel = (from, to) => path.relative(from, to).split(path.sep).join("/");
