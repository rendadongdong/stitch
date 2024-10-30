# @bscotch/sprite-source Changelog

## 1.3.0 (2024-05-14)

### Features

- Added 'collaboratorSources' concept to make art pipeline collaboration easier

## 1.2.4 (2024-03-08)

### Fixes

- No longer writing the stitch config file if it has nothing in it

## 1.2.0 (2024-02-26)

### Features

- Sprite Source imports now respect the allowedNames config option for new sprites.

## 1.1.0 (2024-02-20)

### Features

- Now exporting elements to allow for creation of individual sprites

## 1.0.0 (2024-01-29)

### Features

- Added support for the new GameMaker project format

## 0.6.0 (2024-01-17)

### Features

- Sprite caches now have a version, so that they can be autocleared when the cache-generating mechanism changes.

## 0.5.3 (2024-01-17)

### Fixes

- Hashes for non-PNG files are now computed after normalizing newlines.
- For Spine sprites, PNG images are now only included if they are referenced in the atlas file.

## 0.5.2 (2024-01-15)

### Fixes

- Actually fixed the prior issue...
- Spine sprites no longer have their IDs recreated on update, thus preventing lots of Git chaos

## 0.5.0 (2023-12-07)

### Features

- New assets are now inserted into random locations in the yyp file to avoid creating git conflicts.

## 0.4.12 (2023-11-14)

### Fixes

- Now only saving the source config if it has changed.

## 0.4.11 (2023-11-14)

### Fixes

- Resolved queueing issue causing some methods to fail

## 0.4.10 (2023-11-14)

### Fixes

- Added additional retry logic to file i/o
- Resolved an issue where sequential i/o were not actually being forced to be sequential

## 0.4.9 (2023-11-13)

### Fixes

- Increased retry delay and number of retries for file i/o, to try to resolve Dropbox-induced errors

## 0.4.8 (2023-11-13)

### Fixes

- Resolved infinite loop in file i/o
- Added more redundancy to file i/o

## 0.4.7 (2023-11-02)

### Fixes

- Re-using FrameIds causes Stitch to be unable to update sprite icons due to VSCode caching. Resolve by creating new FrameIds for changed sprites.
- Resolved issue where non-watcher functionality was lot from the Sprite Source tree

## 0.4.6 (2023-11-02)

### Fixes

- On import, GameMaker-generated Spine thumbnails are deleted

## 0.4.5 (2023-11-01)

### Fixes

- Added traces and extra safety mechanisms to sprite-actions

## 0.4.1 (2023-09-20)

### Fixes

- Now ensuring that SpriteDest import calls are sequential to prevent race conditions

## 0.4.0 (2023-09-20)

### Features

- Bumped all deps

### Fixes

- Resolved issues caused by dependency updates

## 0.3.0 (2023-09-13)

### Features

- Exposed more of the API

## 0.2.5 (2023-09-13)

### Fixes

- Resolved issue where cumulative checksums were incorrect, causing all images to appear to be "changed"

## 0.2.4 (2023-09-13)

### Fixes

- Improved error logs and resolved an issue when importing sprites

## 0.2.3 (2023-09-12)

### Fixes

- Resolved issue with absolute sprite-source paths being treated as relative
- Improved a progress message

## 0.2.2 (2023-09-12)

### Fixes

- Resolved issues with loading/saving sprite yy files
- Resolved issue where re-importing sprites would cause an error message
- Moved PNG checksum calculation into a Rust package

## 0.2.1 (2023-09-11)

### Fixes

- Removed sharp for now until I can figure out how to get it bundled with the vscode extension

## 0.2.0 (2023-09-08)

### Features

- Completed implementation of the sprite-source module
- Added a VSCode-compatible reporter option to imports
- Completed draft of the sprite-source module
- Implemented 'ignore' options for SpriteSources.
- SpriteSource images now have their info updated
- Staged images are now fully processed and added to SpriteSource folders

### Fixes

- Resolved some issues with reading/writing yyp files
- Resolved issue with config-loading being too stringent