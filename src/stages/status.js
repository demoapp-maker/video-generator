/** Menandai status sebuah ide di bank ide: ide → scripted → produced. */
import path from "node:path";
import {paths} from "../config.js";
import {listFiles, readJson, writeJson} from "../lib/fsx.js";

export const STATUS = ["ide", "scripted", "produced"];

export const tandaiStatus = (id, status) => {
  for (const file of listFiles(paths.ideas, ".json")) {
    const full = path.join(paths.ideas, file);
    const batch = readJson(full);
    const target = (batch.ide ?? []).find((i) => i.id === id);
    if (!target) continue;
    target.status = status;
    writeJson(full, batch);
    return {id, status, file};
  }
  return null;
};
