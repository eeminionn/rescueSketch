import { access, readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const rulesetDirectories = ['rulesets'];
const requiredEntryFields = [
  'id',
  'title',
  'description',
  'value',
  'unit',
  'ruleType',
  'section',
  'page',
  'tolerance',
  'validationMode',
];

async function directoryExists(directory) {
  try {
    await access(directory);
    return true;
  } catch {
    return false;
  }
}

async function findJsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) {
        return findJsonFiles(path);
      }

      return extname(entry.name) === '.json' ? [path] : [];
    }),
  );

  return files.flat();
}

const existingDirectories = [];

for (const directory of rulesetDirectories) {
  if (await directoryExists(directory)) {
    existingDirectories.push(directory);
  }
}

const files = (
  await Promise.all(existingDirectories.map((directory) => findJsonFiles(directory)))
).flat();

const failures = [];

if (files.length === 0) {
  failures.push('At least one JSON ruleset is required.');
}

for (const file of files) {
  try {
    const value = JSON.parse(await readFile(file, 'utf8'));

    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      failures.push(`${relative(process.cwd(), file)} must contain a JSON object.`);
      continue;
    }

    if (
      value.source === null ||
      typeof value.source !== 'object' ||
      !/^[a-f0-9]{64}$/u.test(value.source.sha256)
    ) {
      failures.push(`${relative(process.cwd(), file)} must contain a verified source SHA-256.`);
    }

    if (!Array.isArray(value.entries) || value.entries.length === 0) {
      failures.push(`${relative(process.cwd(), file)} must contain at least one rule entry.`);
      continue;
    }

    const identifiers = new Set();

    for (const [index, entry] of value.entries.entries()) {
      if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
        failures.push(`${relative(process.cwd(), file)} entry ${index} must be an object.`);
        continue;
      }

      for (const field of requiredEntryFields) {
        if (!(field in entry)) {
          failures.push(`${relative(process.cwd(), file)} entry ${index} is missing ${field}.`);
        }
      }

      if (typeof entry.id === 'string') {
        if (identifiers.has(entry.id)) {
          failures.push(`${relative(process.cwd(), file)} contains duplicate id ${entry.id}.`);
        }

        identifiers.add(entry.id);
      }

      if (entry.unit === 'count' && entry.tolerance !== null) {
        failures.push(
          `${relative(process.cwd(), file)} entry ${entry.id ?? index} gives a tolerance to an exact count.`,
        );
      }
    }
  } catch (error) {
    failures.push(
      `${relative(process.cwd(), file)}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

if (failures.length > 0) {
  console.error(
    ['Ruleset validation failed:', ...failures.map((failure) => `- ${failure}`)].join('\n'),
  );
  process.exitCode = 1;
} else {
  console.log(`Validated ${files.length} JSON ruleset file(s).`);
}
