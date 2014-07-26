var pjson = require('../package.json'), _ = require("underscore"), program = require('commander'), util = require("util"), fs = require("fs-extra"), exec = require('child_process').exec, mkdirp = require('mkdirp'), Promise = require('promise');

var ENV_MYSS_HOME = "MYSS_HOME", ENV_MYSS_MYSQLDUMP_OPTIONS = "MYSS_MYSQLDUMP_OPTIONS", DEFAULT_SNAPSHOT_NAME = "default";

util.println = function (message) {
    util.print(message + "\n");
};
util.fmterror = function () {
    var message = [];
    for (var _i = 0; _i < (arguments.length - 0); _i++) {
        message[_i] = arguments[_i + 0];
    }
    util.error(util.format.apply(this, message));
};

var Myss = (function () {
    function Myss(home) {
        this.home = home;
    }
    Myss.prototype.exec = function (mod, targets) {
        if (_.isFunction(this[mod])) {
            this[mod].call(this, targets);
        }
    };

    Myss.prototype.add = function (targets) {
        if (_.isEmpty(targets)) {
            return util.fmterror("invalid arguments.");
        }

        var options = this.createOptions(targets), dumpPath = options.dbDir + "/" + options.snapName + ".sql";

        this.existDatabase(options.db).then(function (exists) {
            if (!exists) {
                util.fmterror("database '%s' not found.", options.db);
            } else {
                this.mkdirIfNotExist(options.dbDir).then(function (exists) {
                    fs.exists(dumpPath, function (exists) {
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
    };

    Myss.prototype.use = function (targets) {
        if (_.isEmpty(targets)) {
            return util.fmterror("arguments invalid.");
        }

        var options = this.createOptions(targets), dumpPath = options.dbDir + "/" + options.snapName + ".sql";

        fs.exists(options.dbDir, function (exists) {
            if (!exists) {
                util.fmterror("database '%s' not found.", options.db);
            } else {
                fs.exists(dumpPath, function (exists) {
                    if (!exists) {
                        util.fmterror("database snapshot '%s:%s' already exists.", options.db, options.snapName);
                    } else {
                        this.execCommand("mysql -uroot " + options.db + " < " + dumpPath);
                    }
                }.bind(this));
            }
        }.bind(this));
    };

    Myss.prototype.list = function (targets) {
        var options = this.createOptions(targets);

        this.mkdirIfNotExist(options.dbDir).then(function (exists) {
            if (options.db) {
                fs.readdir(options.dbDir, function (err, files) {
                    if (err)
                        throw err;

                    files.filter(function (file) {
                        return fs.statSync(options.dbDir + "/" + file).isFile();
                    }).forEach(function (file) {
                        util.println(file.substring(0, file.lastIndexOf(".")));
                    });
                });
            } else {
                fs.readdir(this.home, function (err, files) {
                    if (err)
                        throw err;

                    files.filter(function (file) {
                        return fs.statSync(options.dbDir + "/" + file).isDirectory();
                    }).forEach(function (file) {
                        util.println(file);
                    });
                });
            }
        }.bind(this));
    };

    Myss.prototype.delete = function (targets) {
        if (_.isEmpty(targets)) {
            return util.fmterror("arguments invalid.");
        }

        var options = this.createOptions(targets);
        if (targets.length == 1) {
            var path = options.dbDir;
            fs.exists(path, function (exists) {
                if (!exists) {
                    util.fmterror("database '%s' not found.", options.db);
                } else {
                    util.println("delete: " + path);
                    fs.remove(path);
                }
            }.bind(this));
        } else {
            var path = options.dbDir + "/" + options.snapName + ".sql";
            fs.exists(path, function (exists) {
                if (!exists) {
                    util.fmterror("database snapshot '%s:%s' already exists.", options.db, options.snapName);
                } else {
                    fs.readdir(options.dbDir, function (err, files) {
                        if (err)
                            throw err;

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
    };

    Myss.prototype.createOptions = function (targets) {
        targets = targets || [];

        var db = this.extract(targets, 0) || "";
        return {
            db: db,
            dbDir: this.home + "/" + db,
            snapName: this.escapePathDelimiter(this.extract(targets, 1) || DEFAULT_SNAPSHOT_NAME),
            options: this.extract(targets, 2)
        };
    };

    Myss.prototype.extract = function (array, index) {
        return !_.isEmpty(array) && array.length > index ? array[index] : null;
    };

    Myss.prototype.escapePathDelimiter = function (path) {
        return path.replace(/[\\\/]/g, '_');
    };

    Myss.prototype.existDatabase = function (db) {
        return new Promise(function (resolve, reject) {
            this.execCommand("mysql -uroot -e \"SELECT * FROM information_schema.schemata WHERE schema_name = '" + db + "'\"").then(function (stdout) {
                resolve(!!stdout);
            });
        }.bind(this));
    };

    Myss.prototype.execCommand = function (cmd) {
        util.println(cmd);
        return new Promise(function (resolve, reject) {
            exec(cmd, function (err, stdout, stderr) {
                if (err)
                    reject(err);
                resolve(stdout);
            });
        });
    };

    Myss.prototype.mkdirIfNotExist = function (dir) {
        return new Promise(function (resolve, reject) {
            fs.exists(dir, function (exists) {
                if (!exists) {
                    mkdirp(dir, function (err) {
                        if (err)
                            reject(err);
                        resolve(false);
                    });
                } else {
                    resolve(true);
                }
            });
        });
    };
    return Myss;
})();

program.version(pjson.version).option("add <database name> <snapshot name>", "add database snapshot.").option("use <database name> <snapshot name>", "use database snapshot.").option("delete <database name>", "delete database.").option("delete <database name> <snapshot name>", "delete database snapshot.").option("list", "list databases.").option("list <database name>", "list database snapshots.").parse(process.argv);

if (program.rawArgs.length >= 3) {
    var command = program.rawArgs[2], args = program.rawArgs.slice(3, program.rawArgs.length);

    new Myss((process.env[ENV_MYSS_HOME] || process.env["HOME"] + "/.myss")).exec(command, args);
} else {
    program.help();
}
