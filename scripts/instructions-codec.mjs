#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function compressBuffer(buf) {
  return zlib.brotliCompressSync(buf, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
    },
  });
}

function decompressBuffer(buf) {
  return zlib.brotliDecompressSync(buf);
}

function readFileBuffer(p) {
  return fs.readFileSync(p);
}

function writeFileBuffer(p, buf) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, buf);
}

function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj));
}

function readJson(p) {
  const txt = fs.readFileSync(p, 'utf8');
  return JSON.parse(txt);
}

function nowIso() {
  return new Date().toISOString();
}

function usage() {
  console.log(
    'Usage:\n' +
      '  node scripts/instructions-codec.mjs compress [in=.copilot-instructions.md] [out=.copilot-instructions.br.json]\n' +
      '  node scripts/instructions-codec.mjs decompress [in=.copilot-instructions.br.json] [out=.copilot-instructions.md]\n' +
      '  node scripts/instructions-codec.mjs verify [in=.copilot-instructions.br.json] [orig=.copilot-instructions.md]\n'
  );
}

function makeArtifact({ sourcePath, rawBytes, compressedBytes }) {
  return {
    magic: 'UEBWI-COPILOT-INS/1',
    source: path.basename(sourcePath),
    created: nowIso(),
    alg: 'brotli+base64',
    len: rawBytes.length,
    sha256: sha256(rawBytes),
    data: Buffer.from(compressedBytes).toString('base64'),
  };
}

function parseArtifact(obj) {
  if (!obj || obj.magic !== 'UEBWI-COPILOT-INS/1') {
    throw new Error('Invalid artifact: bad magic');
  }
  if (obj.alg !== 'brotli+base64') {
    throw new Error('Unsupported alg: ' + obj.alg);
  }
  const compressed = Buffer.from(obj.data, 'base64');
  const decompressed = decompressBuffer(compressed);
  const hash = sha256(decompressed);
  if (obj.sha256 && obj.sha256 !== hash) {
    throw new Error('Checksum mismatch: expected ' + obj.sha256 + ' got ' + hash);
  }
  return { decompressed, meta: obj };
}

async function main() {
  const [cmd, inArg, outArg] = process.argv.slice(2);
  const projectRoot = process.cwd();
  const defaultInMd = path.join(projectRoot, '.copilot-instructions.md');
  const defaultOutJson = path.join(projectRoot, '.copilot-instructions.br.json');
  try {
    if (!cmd || cmd === '--help' || cmd === '-h') {
      usage();
      process.exit(0);
    }
    if (cmd === 'compress') {
      const inPath = inArg ? path.resolve(inArg) : defaultInMd;
      const outPath = outArg ? path.resolve(outArg) : defaultOutJson;
      const raw = readFileBuffer(inPath);
      const compressed = compressBuffer(raw);
      const artifact = makeArtifact({ sourcePath: inPath, rawBytes: raw, compressedBytes: compressed });
      writeJson(outPath, artifact);
      console.log('Compressed', path.basename(inPath), '->', path.relative(projectRoot, outPath));
      console.log('Original bytes:', raw.length, 'Compressed bytes:', Buffer.from(artifact.data, 'base64').length);
      console.log('SHA256:', artifact.sha256);
      process.exit(0);
    }
    if (cmd === 'decompress') {
      const inPath = inArg ? path.resolve(inArg) : defaultOutJson;
      const outPath = outArg ? path.resolve(outArg) : defaultInMd;
      const artifact = readJson(inPath);
      const { decompressed, meta } = parseArtifact(artifact);
      writeFileBuffer(outPath, decompressed);
      console.log('Decompressed', path.relative(projectRoot, inPath), '->', path.relative(projectRoot, outPath));
      console.log('Bytes:', decompressed.length, 'SHA256:', meta.sha256);
      process.exit(0);
    }
    if (cmd === 'verify') {
      const inPath = inArg ? path.resolve(inArg) : defaultOutJson;
      const maybeOrig = outArg ? path.resolve(outArg) : null;
      const artifact = readJson(inPath);
      const { decompressed, meta } = parseArtifact(artifact);
      let ok = true;
      if (maybeOrig && fs.existsSync(maybeOrig)) {
        const raw = readFileBuffer(maybeOrig);
        const same = Buffer.compare(raw, decompressed) === 0;
        if (!same) {
          ok = false;
          console.error('Round-trip mismatch vs', path.relative(projectRoot, maybeOrig));
        }
      }
      if (ok) {
        console.log('VERIFY OK:', path.relative(projectRoot, inPath), 'len', decompressed.length, 'sha256', meta.sha256);
        process.exit(0);
      } else {
        process.exit(1);
      }
    }
    console.error('Unknown command:', cmd);
    usage();
    process.exit(2);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();

