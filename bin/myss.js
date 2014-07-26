var _ = require("underscore"), fs = require("fs-extra"), exec = require('child_process').exec, mkdirp = require('mkdirp'), Promise = require('promise');

var ENV_MYSS_HOME = "MYSS_HOME", ENV_MYSS_MYSQLDUMP_OPTIONS = "MYSS_MYSQLDUMP_OPTIONS", DEFAULT_SNAPSHOT_NAME = "default";

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
            return this.error("invalid arguments.");
        }

        var options = this.createOptions(targets), dumpPath = options.dbDir + "/" + options.snapName + ".sql";

        this.mkdirIfNotExist(options.dbDir).then(function (exists) {
            this.existDatabase(options.db).then(function (exists) {
                if (!exists) {
                    this.error("database not found.");
                } else {
                    fs.exists(dumpPath, function (exists) {
                        if (exists) {
                            this.error("database snapshot already exists.");
                        } else {
                            var dumpOptions = options.options || process.env[ENV_MYSS_MYSQLDUMP_OPTIONS] || "-u root";
                            this.execCommand("mysqldump " + dumpOptions + " " + options.db + " > " + dumpPath);
                        }
                    }.bind(this));
                }
            }.bind(this));
        }.bind(this));
    };

    Myss.prototype.snap = function (targets) {
        if (_.isEmpty(targets)) {
            return this.error("arguments invalid.");
        }

        var options = this.createOptions(targets), dumpPath = options.dbDir + "/" + options.snapName + ".sql";

        fs.exists(options.dbDir, function (exists) {
            if (!exists) {
                this.error("database not found.");
            } else {
            }
        }.bind(this));
    };

    Myss.prototype.use = function (targets) {
        if (_.isEmpty(targets)) {
            return this.error("arguments invalid.");
        }

        var options = this.createOptions(targets), dumpPath = options.dbDir + "/" + options.snapName + ".sql";

        fs.exists(options.dbDir, function (exists) {
            if (!exists) {
                this.error("database not found.");
            } else {
                fs.exists(dumpPath, function (exists) {
                    if (!exists) {
                        this.error("database snapshot not found.");
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
                        console.log(file.substring(0, file.lastIndexOf(".")));
                    });
                });
            } else {
                fs.readdir(this.home, function (err, files) {
                    if (err)
                        throw err;

                    files.filter(function (file) {
                        return fs.statSync(options.dbDir + "/" + file).isDirectory();
                    }).forEach(function (file) {
                        console.log(file);
                    });
                });
            }
        }.bind(this));
    };

    Myss.prototype.delete = function (targets) {
        if (_.isEmpty(targets)) {
            return this.error("arguments invalid.");
        }

        var options = this.createOptions(targets);
        if (targets.length == 1) {
            var path = options.dbDir;
            fs.exists(path, function (exists) {
                if (!exists) {
                    this.error("database not found.");
                } else {
                    console.log("delete: " + path);
                    fs.remove(path);
                }
            }.bind(this));
        } else {
            var path = options.dbDir + "/" + options.snapName + ".sql";
            fs.exists(path, function (exists) {
                if (!exists) {
                    this.error("database snapshot not found.");
                } else {
                    fs.readdir(options.dbDir, function (err, files) {
                        if (err)
                            throw err;

                        if (files.length == 1) {
                            this.error("last database snapshot can't be deleted.");
                        } else {
                            console.log("delete: " + path);
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
            snapName: this.extract(targets, 1) || DEFAULT_SNAPSHOT_NAME,
            options: this.extract(targets, 2)
        };
    };

    Myss.prototype.extract = function (array, index) {
        return !_.isEmpty(array) && array.length > index ? array[index] : null;
    };

    Myss.prototype.existDatabase = function (db) {
        return new Promise(function (resolve, reject) {
            this.execCommand("mysql -uroot -e \"SELECT * FROM information_schema.schemata WHERE schema_name = '" + db + "'\"").then(function (stdout) {
                resolve(!!stdout);
            });
        }.bind(this));
    };

    Myss.prototype.execCommand = function (cmd) {
        console.log(cmd);
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

    Myss.prototype.error = function (message) {
        console.error(message);
    };
    return Myss;
})();

var argv = require("argv");

argv.mod({
    mod: "add",
    description: "add database.",
    options: []
});
argv.mod({
    mod: "snap",
    description: "create database snapshot.",
    options: []
});
argv.mod({
    mod: "use",
    description: "use database snapshot.",
    options: []
});
argv.mod({
    mod: "delete",
    description: "delete database, or snapshot.",
    options: []
});
argv.mod({
    mod: "list",
    description: "list database, or snapshot.",
    options: []
});

var arg = argv.run();
if (arg.mod) {
    new Myss((process.env[ENV_MYSS_HOME] || process.env["HOME"] + "/.myss")).exec(arg.mod, arg.targets);
}
