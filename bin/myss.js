var pjson = require('../package.json'), program = require('commander'), MyssCore = require('./myss-core');

program.version(pjson.version).option("add <database name> <snapshot name>", "add database snapshot.").option("use <database name> <snapshot name>", "use database snapshot.").option("delete <database name>", "delete database.").option("delete <database name> <snapshot name>", "delete database snapshot.").option("list", "list databases.").option("list <database name>", "list database snapshots.").parse(process.argv);

if (program.rawArgs.length >= 3) {
    var command = program.rawArgs[2], args = program.rawArgs.slice(3, program.rawArgs.length);

    new MyssCore((process.env[MyssCore.ENV_MYSS_HOME] || process.env["HOME"] + "/.myss")).exec(command, args);
} else {
    program.help();
}
