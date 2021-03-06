/// <reference path="../typings/tsd.d.ts" />

import program = require('commander');
import myss = require('./myss-core');

var cmd:program.Command = program.version(require('../package.json').version)
    .option("config", "list config.")
    .option("config <name>", "show config.")
    .option("config <name> <value>", "set config.")
    .option("add <database name> <snapshot name>", "add database snapshot.")
    .option("replace <database name> <snapshot name>", "add or replace database snapshot.")
    .option("use <database name> <snapshot name>", "use database snapshot.")
    .option("delete <database name>", "delete database.")
    .option("delete <database name> <snapshot name>", "delete database snapshot.")
    .option("list", "list databases.")
    .option("list <database name>", "list database snapshots.")
    .parse(process.argv);

if (cmd.rawArgs.length >= 3) {
    var command = cmd.rawArgs[2],
        args = cmd.rawArgs.slice(3, cmd.rawArgs.length);

    new myss.Runner(
        (process.env[myss.ENV_MYSS_HOME] || process.env["HOME"] + "/.myss")
    ).exec(command, args);
} else {
    cmd.help();
}

