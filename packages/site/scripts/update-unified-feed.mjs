import { pathy } from '@bscotch/pathy';
import { computeReleasesSummaryWithNotes } from '../../releases/dist/index.js';

// UPDATE GAMEMAKER RELEASES SUMMARY
const artifactsDir = pathy('static/artifacts/gamemaker');
await artifactsDir.ensureDirectory();

const notesCache = artifactsDir.join('release-notes-cache.json');
const summaryPath = artifactsDir.join('releases-summary.json');

const releases = await computeReleasesSummaryWithNotes(undefined, notesCache);
await summaryPath.write(releases);
console.log('Latest GameMaker IDE:', releases[0].ide.version);
