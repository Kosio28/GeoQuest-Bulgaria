import { loadEnv } from 'vite';
import { candidates, scanCoverage } from '../src/locations.ts';
import { describeError } from '../src/mapillary-api.ts';

const token = loadEnv('development', process.cwd(), 'VITE_MAPILLARY_').VITE_MAPILLARY_ACCESS_TOKEN?.trim();

async function main() {
  if (!token) {
    console.error('Set VITE_MAPILLARY_ACCESS_TOKEN in .env.local before running the coverage probe.');
    process.exitCode = 1;
    return;
  }
  try {
    const results = await scanCoverage(token, result => {
      const { name, kind } = result.site;
      if ('error' in result) {
        console.log(`${name} (${kind}) — ${describeError(result.error)}`);
        process.exitCode = 1;
        return;
      }
      const { returned, panoramas } = result.sample;
      console.log(`${name} (${kind}) — ${returned} returned, ${panoramas.length} in-country panoramas`);
    });
    console.table(candidates(results).map(({ site, image, sequenceHint }) => ({
      site: site.name, id: image.id, lng: image.geometry?.coordinates[0],
      lat: image.geometry?.coordinates[1], width: image.width, height: image.height,
      sequenceHint,
    })));
  } catch (error) {
    console.error(describeError(error));
    process.exitCode = 1;
  }
}

void main();
