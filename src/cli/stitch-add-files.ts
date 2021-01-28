#!/usr/bin/env node
import commander, { CommanderStatic } from "commander";
import { oneline, undent } from "@bscotch/utility";
import { ImportBaseOptions } from "./lib/add-base-options";
import importFiles from "./lib/add-files";
import options from "./lib/cli-options";

const cli = commander;

cli.description(undent`
  Create/update included file assets from a file or a path.
  If the asset does not already exists in the target project, it will be placed in the "NEW" folder.
  Otherwise, the asset will be replaced by the source asset.`)
  .requiredOption("--source <path>", oneline`
    Path to the file or the folder containing the files to import.
  `)
  .option("--extensions <extensions...>", oneline`
    Only allow certain extensions to be imported. 
    If not set, Will attempt to import all files.
  `)
  .option(...options.targetProject)
  .option(...options.force)
  .parse(process.argv);

importFiles(cli.opts() as ImportBaseOptions);