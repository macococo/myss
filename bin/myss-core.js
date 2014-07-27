var pjson = require('../package.json'), _ = require("underscore"), program = require('commander'), util = require("util"), fs = require("fs-extra"), exec = require('child_process').exec, mkdirp = require('mkdirp'), Promise = require('promise');

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
            return Myss.fmterror("invalid arguments.");
        }

        var options = this.createOptions(targets), dumpPath = options.dbDir + "/" + options.snapName + ".sql";

        this.existDatabase(options.db).then(function (exists) {
            if (!exists) {
                Myss.fmterror("database '%s' not found.", options.db);
            } else {
                this.mkdirIfNotExist(options.dbDir).then(function (exists) {
                    if (fs.existsSync(dumpPath)) {
                        Myss.fmterror("database snapshot '%s:%s' already exists.", options.db, options.snapName);
                    } else {
                        var dumpOptions = options.options || process.env[Myss.ENV_MYSS_MYSQLDUMP_OPTIONS] || "-u root";
                        this.execCommand("mysqldump " + dumpOptions + " " + options.db + " > " + dumpPath);
                    }
                }.bind(this));
            }
        }.bind(this));
    };

    Myss.prototype.use = function (targets) {
        if (_.isEmpty(targets)) {
            return Myss.fmterror("arguments invalid.");
        }

        var options = this.createOptions(targets), dumpPath = options.dbDir + "/" + options.snapName + ".sql";

        if (!fs.existsSync(options.dbDir)) {
            Myss.fmterror("database '%s' not found.", options.db);
        } else {
            if (!fs.existsSync(dumpPath)) {
                Myss.fmterror("database snapshot '%s:%s' already exists.", options.db, options.snapName);
            } else {
                this.execCommand("mysql -uroot " + options.db + " < " + dumpPath);
            }
        }
    };

    Myss.prototype.list = function (targets) {
        var options = this.createOptions(targets);

        this.mkdirIfNotExist(options.dbDir).then(function (exists) {
            if (options.db) {
                fs.readdirSync(options.dbDir).filter(function (file) {
                    return fs.statSync(options.dbDir + "/" + file).isFile();
                }).forEach(function (file) {
                    Myss.println(file.substring(0, file.lastIndexOf(".")));
                });
            } else {
                fs.readdirSync(this.home).filter(function (file) {
                    return fs.statSync(options.dbDir + "/" + file).isDirectory();
                }).forEach(function (file) {
                    Myss.println(file);
                });
            }
        }.bind(this));
    };

    Myss.prototype.delete = function (targets) {
        if (_.isEmpty(targets)) {
            return Myss.fmterror("arguments invalid.");
        }

        var options = this.createOptions(targets);
        if (targets.length == 1) {
            var path = options.dbDir;
            if (!fs.existsSync(path)) {
                Myss.fmterror("database '%s' not found.", options.db);
            } else {
                Myss.println("delete: " + path);
                fs.removeSync(path);
            }
        } else {
            var path = options.dbDir + "/" + options.snapName + ".sql";
            if (!fs.existsSync(path)) {
                Myss.fmterror("database snapshot '%s:%s' already exists.", options.db, options.snapName);
            } else {
                var files = fs.readdirSync(options.dbDir);
                if (files.length == 1) {
                    Myss.fmterror("database snapshot is not possible to delete all.");
                } else {
                    Myss.println("delete: " + path);
                    fs.removeSync(path);
                }
            }
        }
    };

    Myss.prototype.createOptions = function (targets) {
        targets = targets || [];

        var db = this.extract(targets, 0) || "";
        return {
            db: db,
            dbDir: this.home + "/" + db,
            snapName: this.escapePathDelimiter(this.extract(targets, 1) || Myss.DEFAULT_SNAPSHOT_NAME),
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
        Myss.println(cmd);
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
            if (fs.existsSync(dir)) {
                fs.mkdirsSync(dir);
                resolve(false);
            } else {
                resolve(true);
            }
        });
    };

    Myss.fmterror = function () {
        var message = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            message[_i] = arguments[_i + 0];
        }
        util.error(util.format.apply(this, message));
    };

    Myss.println = function (message) {
        util.print(message + "\n");
    };
    Myss.ENV_MYSS_HOME = "MYSS_HOME";

    Myss.ENV_MYSS_MYSQLDUMP_OPTIONS = "MYSS_MYSQLDUMP_OPTIONS";

    Myss.DEFAULT_SNAPSHOT_NAME = "default";
    return Myss;
})();

module.exports = Myss;
