/// <reference path="../typings/tsd.d.ts" />

var pjson = require('../package.json'),
    _:UnderscoreStatic = require("underscore"),
    program = require('commander'),
    util = require("util"),
    fs = require("fs-extra"),
    exec = require('child_process').exec,
    mkdirp:any = require('mkdirp'),
    Promise = require('promise');

// Constants
var ENV_MYSS_HOME:string = "MYSS_HOME",
    ENV_MYSS_MYSQLDUMP_OPTIONS:string = "MYSS_MYSQLDUMP_OPTIONS",
    DEFAULT_SNAPSHOT_NAME:string = "default";

// Utilities
util.println = function(message:string):void {
    util.print(message + "\n");
}
util.fmterror = function(...message:any[]):void {
    util.error(util.format.apply(this, message));
}

class Myss {

    home:string;

    constructor(home:string) {
        this.home = home;
    }

    public exec(mod:string, targets:string[]):void {
        if (_.isFunction(this[mod])) {
            this[mod].call(this, targets);
        }
    }

    public add(targets:string[]):void {
        if (_.isEmpty(targets)) {
            return util.fmterror("invalid arguments.");
        }

        var options = this.createOptions(targets),
            dumpPath = options.dbDir + "/" + options.snapName + ".sql";

        this.existDatabase(options.db).then(function(exists:boolean):void {
            if (!exists) {
                util.fmterror("database '%s' not found.", options.db);
            } else {
                this.mkdirIfNotExist(options.dbDir).then(function(exists:boolean):void {
                    fs.exists(dumpPath, function(exists:boolean):void {
                        if (exists) {
                            util.fmterror("database snapshot '%s:%s' already exists.", options.db, options.snapName);
                        } else {
                            var dumpOptions = options.options || process.env[ENV_MYSS_MYSQLDUMP_OPTIONS] || "-u root";
                            this.execCommand("mysqldump " + dumpOptions + " " + options.db + " > " + dumpPath);
                        }
                    }.bind(this));
                }.bind(this));
            }
        }.bind(this));
    }

    public use(targets:string[]):void {
        if (_.isEmpty(targets)) {
            return util.fmterror("arguments invalid.");
        }

        var options = this.createOptions(targets),
            dumpPath = options.dbDir + "/" + options.snapName + ".sql";

        fs.exists(options.dbDir, function(exists:boolean):void {
            if (!exists) {
                util.fmterror("database '%s' not found.", options.db);
            } else {
                fs.exists(dumpPath, function(exists:boolean):void {
                    if (!exists) {
                        util.fmterror("database snapshot '%s:%s' already exists.", options.db, options.snapName);
                    } else {
                        this.execCommand("mysql -uroot " + options.db + " < " + dumpPath);
                    }
                }.bind(this));
            }
        }.bind(this));
    }

    public list(targets:string[]):void {
        var options = this.createOptions(targets);

        this.mkdirIfNotExist(options.dbDir).then(function(exists:boolean):void {
            if (options.db) {
                fs.readdir(options.dbDir, function(err:NodeJS.ErrnoException, files:string[]):void {
                    if (err) throw err;

                    files
                        .filter(function(file){
                            return fs.statSync(options.dbDir + "/" + file).isFile();
                        }).forEach(function (file) {
                            util.println(file.substring(0, file.lastIndexOf(".")));
                        });
                });
            } else {
                fs.readdir(this.home, function(err:NodeJS.ErrnoException, files:string[]):void {
                    if (err) throw err;

                    files
                        .filter(function(file){
                            return fs.statSync(options.dbDir + "/" + file).isDirectory();
                        }).forEach(function (file) {
                            util.println(file);
                        });
                });
            }
        }.bind(this));
    }

    public delete(targets:string[]):void {
        if (_.isEmpty(targets)) {
            return util.fmterror("arguments invalid.");
        }

        var options = this.createOptions(targets);
        if (targets.length == 1) {
            var path:string = options.dbDir;
            fs.exists(path, function(exists:boolean):void {
                if (!exists) {
                    util.fmterror("database '%s' not found.", options.db);
                } else {
                    util.println("delete: " + path);
                    fs.remove(path);
                }
            }.bind(this));

        } else {
            var path:string = options.dbDir + "/" + options.snapName + ".sql";
            fs.exists(path, function(exists:boolean):void {
                if (!exists) {
                    util.fmterror("database snapshot '%s:%s' already exists.", options.db, options.snapName);
                } else {
                    fs.readdir(options.dbDir, function(err:NodeJS.ErrnoException, files:string[]):void {
                        if (err) throw err;

                        if (files.length == 1) {
                            util.fmterror("database snapshot is not possible to delete all.");
                        } else {
                            util.println("delete: " + path);
                            fs.remove(path);
                        }
                    }.bind(this));
                }
            }.bind(this));

        }
    }

    private createOptions(targets:string[]):any {
        targets = targets || [];

        var db = this.extract(targets, 0) || "";
        return {
            db: db,
            dbDir: this.home + "/" + db,
            snapName: this.escapePathDelimiter(this.extract(targets, 1) || DEFAULT_SNAPSHOT_NAME),
            options: this.extract(targets, 2)
        }
    }

    private extract(array, index):any {
        return !_.isEmpty(array) && array.length > index ? array[index] : null;
    }

    private escapePathDelimiter(path):string {
        return path.replace(/[\\\/]/g, '_');
    }

    private existDatabase(db:string):PromiseTs.Promise {
        return new Promise(function(resolve, reject):void {
            this.execCommand("mysql -uroot -e \"SELECT * FROM information_schema.schemata WHERE schema_name = '" + db + "'\"")
                .then(function(stdout:string):void {
                    resolve(!!stdout);
                });
        }.bind(this));
    }

    private execCommand(cmd:string):PromiseTs.Promise {
        util.println(cmd);
        return new Promise(function(resolve, reject):void {
            exec(cmd, function(err, stdout, stderr):void {
                if (err) reject(err);
                resolve(stdout);
            });
        });
    }

    private mkdirIfNotExist(dir:string):PromiseTs.Promise {
        return new Promise(function(resolve, reject):void {
            fs.exists(dir, function(exists:boolean):void {
                if (!exists) {
                    mkdirp(dir, function(err?:NodeJS.ErrnoException):void {
                        if (err) reject(err);
                        resolve(false);
                    });
                } else {
                    resolve(true);
                }
            });
        });
    }

}

program
    .version(pjson.version)
    .option("add <database name> <snapshot name>", "add database snapshot.")
    .option("use <database name> <snapshot name>", "use database snapshot.")
    .option("delete <database name>", "delete database.")
    .option("delete <database name> <snapshot name>", "delete database snapshot.")
    .option("list", "list databases.")
    .option("list <database name>", "list database snapshots.")
    .parse(process.argv);

if (program.rawArgs.length >= 3) {
    var command = program.rawArgs[2],
        args = program.rawArgs.slice(3, program.rawArgs.length);

    new Myss(
        (process.env[ENV_MYSS_HOME] || process.env["HOME"] + "/.myss")
    ).exec(command, args);
} else {
    program.help();
}
