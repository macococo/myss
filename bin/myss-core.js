var _ = require("underscore");
var util = require("util");
var fs = require("fs-extra");
var child_process = require('child_process');
var Promise = require('promise');

exports.ENV_MYSS_HOME = "MYSS_HOME";
exports.DEFAULT_SNAPSHOT_NAME = "default";

function fmterror() {
    var message = [];
    for (var _i = 0; _i < (arguments.length - 0); _i++) {
        message[_i] = arguments[_i + 0];
    }
    util.error(util.format.apply(this, message));
}
exports.fmterror = fmterror;

function println(message) {
    util.print(message + "\n");
}
exports.println = println;

var Runner = (function () {
    function Runner(home) {
        this.home = home;
        this.globalConfig = new GlobalConfig(home);
    }
    Runner.prototype.exec = function (mod, targets) {
        if (_.isFunction(this[mod])) {
            this[mod].call(this, targets);
            this.globalConfig.write();
        }
    };

    Runner.prototype.config = function (targets) {
        if (_.isEmpty(targets)) {
            var config = this.globalConfig.config;
            for (var prop in config) {
                exports.println(prop + ": " + config[prop]);
            }
        } else if (targets.length == 1) {
            var value = this.globalConfig.config[targets[0]];
            if (value == undefined) {
                exports.fmterror("invalid arguments.");
            } else {
                exports.println(this.globalConfig.config[targets[0]]);
            }
        } else if (targets.length == 2) {
            var value = this.globalConfig.config[targets[0]];
            if (value == undefined) {
                exports.fmterror("invalid arguments.");
            } else {
                this.globalConfig.config[targets[0]] = targets[1];
                this.globalConfig.write();
            }
        } else {
            exports.fmterror("invalid arguments.");
        }
    };

    Runner.prototype.add = function (targets) {
        if (_.isEmpty(targets)) {
            return exports.fmterror("invalid arguments.");
        }

        this.addSnapshot(this.createOptions(targets), false);
    };

    Runner.prototype.replace = function (targets) {
        if (_.isEmpty(targets)) {
            return new Promise(function (resolve, reject) {
                exports.fmterror("invalid arguments.");
                resolve();
            }.bind(this));
        }

        return this.addSnapshot(this.createOptions(targets), true);
    };

    Runner.prototype.addSnapshot = function (options, replace) {
        return new Promise(function (resolve, reject) {
            var dumpPath = options.dbDir + "/" + options.snapName + ".sql";

            this.existDatabase(options).then(function (exists) {
                if (!exists) {
                    exports.fmterror("database '%s' not found.", options.db);
                    resolve();
                } else {
                    this.mkdirIfNotExist(options.dbDir).then(function (exists) {
                        if (!replace && fs.existsSync(dumpPath)) {
                            exports.fmterror("database snapshot '%s:%s' already exists.", options.db, options.snapName);
                            resolve();
                        } else {
                            var dumpOptions = options.options || this.globalConfig.config["mysql_dump_options"] || "-u root";
                            this.execCommand("mysqldump " + dumpOptions + " " + options.db + " > " + dumpPath).then(function () {
                                new Config(options.dbDir).write(options.snapName);

                                resolve();
                            });
                        }
                    }.bind(this));
                }
            }.bind(this));
        }.bind(this));
    };

    Runner.prototype.use = function (targets) {
        if (_.isEmpty(targets)) {
            return exports.fmterror("arguments invalid.");
        }

        var options = this.createOptions(targets), dumpPath = options.dbDir + "/" + options.snapName + ".sql";

        if (!fs.existsSync(options.dbDir)) {
            exports.fmterror("database '%s' not found.", options.db);
        } else {
            if (!fs.existsSync(dumpPath)) {
                exports.fmterror("database snapshot '%s:%s' already exists.", options.db, options.snapName);
            } else {
                var config = new Config(options.dbDir);
                var exec = function () {
                    var impOptions = options.options || this.globalConfig.config["mysql_options"] || "-u root";
                    this.execCommand("mysql " + impOptions + " " + options.db + " < " + dumpPath);

                    config.write(options.snapName);
                }.bind(this);

                if (this.globalConfig.config["auto_replace"] == "true" && config.lastSnapshotName) {
                    exports.println("[auto replace]");
                    targets[1] = config.lastSnapshotName;
                    this.replace(targets).then(exec);
                } else {
                    exec.call(this);
                }
            }
        }
    };

    Runner.prototype.list = function (targets) {
        var options = this.createOptions(targets);

        this.mkdirIfNotExist(options.dbDir).then(function (exists) {
            if (options.db) {
                var config = new Config(options.dbDir);

                fs.readdirSync(options.dbDir).filter(function (file) {
                    return fs.statSync(options.dbDir + "/" + file).isFile();
                }).forEach(function (file) {
                    var snapName = file.substring(0, file.lastIndexOf(".")), suffix = config.lastSnapshotName == snapName ? " (last)" : "";
                    exports.println(snapName + suffix);
                });
            } else {
                fs.readdirSync(this.home).filter(function (file) {
                    return fs.statSync(options.dbDir + "/" + file).isDirectory();
                }).forEach(function (file) {
                    exports.println(file);
                });
            }
        }.bind(this));
    };

    Runner.prototype.delete = function (targets) {
        if (_.isEmpty(targets)) {
            return exports.fmterror("arguments invalid.");
        }

        var options = this.createOptions(targets);
        if (targets.length == 1) {
            var path = options.dbDir;
            if (!fs.existsSync(path)) {
                exports.fmterror("database '%s' not found.", options.db);
            } else {
                exports.println("delete: " + path);
                fs.removeSync(path);
            }
        } else {
            var path = options.dbDir + "/" + options.snapName + ".sql";
            if (!fs.existsSync(path)) {
                exports.fmterror("database snapshot '%s:%s' already exists.", options.db, options.snapName);
            } else {
                var files = fs.readdirSync(options.dbDir);
                if (files.length == 1) {
                    exports.fmterror("database snapshot is not possible to delete all.");
                } else {
                    exports.println("delete: " + path);
                    fs.removeSync(path);
                }
            }
        }
    };

    Runner.prototype.createOptions = function (targets) {
        targets = targets || [];

        var db = this.extract(targets, 0) || "";
        return {
            db: db,
            dbDir: this.home + "/" + db,
            snapName: this.escapePathDelimiter(this.extract(targets, 1) || exports.DEFAULT_SNAPSHOT_NAME),
            options: this.extract(targets, 2)
        };
    };

    Runner.prototype.extract = function (array, index) {
        return !_.isEmpty(array) && array.length > index ? array[index] : null;
    };

    Runner.prototype.escapePathDelimiter = function (path) {
        return path.replace(/[\\\/]/g, '_');
    };

    Runner.prototype.existDatabase = function (options) {
        return new Promise(function (resolve, reject) {
            var impOptions = options.options || this.globalConfig.config["mysql_options"] || "-u root";
            this.execCommand("mysql " + impOptions + " -e \"SELECT * FROM information_schema.schemata WHERE schema_name = '" + options.db + "'\"").then(function (stdout) {
                resolve(!!stdout);
            });
        }.bind(this));
    };

    Runner.prototype.execCommand = function (cmd) {
        exports.println(cmd);
        return new Promise(function (resolve, reject) {
            child_process.exec(cmd, function (err, stdout, stderr) {
                if (err)
                    reject(err);
                resolve(stdout);
            });
        });
    };

    Runner.prototype.mkdirIfNotExist = function (dir) {
        return new Promise(function (resolve, reject) {
            if (!fs.existsSync(dir)) {
                fs.mkdirsSync(dir);
                resolve(false);
            } else {
                resolve(true);
            }
        });
    };
    return Runner;
})();
exports.Runner = Runner;

var GlobalConfig = (function () {
    function GlobalConfig(path) {
        this.config = {
            mysql_dump_options: "-u root",
            mysql_options: "-u root",
            auto_replace: "false"
        };
        this.path = path;

        var jsonPath = this.path + "/config.json";
        if (fs.existsSync(jsonPath)) {
            this.config = fs.readJsonSync(jsonPath);
        }
    }
    GlobalConfig.read = function (path) {
        var config = new GlobalConfig(path);
    };

    GlobalConfig.prototype.write = function () {
        fs.outputFileSync(this.path + "/config.json", JSON.stringify(this.config));
    };
    return GlobalConfig;
})();
exports.GlobalConfig = GlobalConfig;

var Config = (function () {
    function Config(path) {
        this.path = path;

        var jsonPath = this.path + "/config.json";
        if (fs.existsSync(jsonPath)) {
            var json = fs.readJsonSync(jsonPath);
            _.extend(this, json);
        }
    }
    Config.read = function (path) {
        var config = new Config(path);
    };

    Config.prototype.write = function (lastSnapshotName) {
        this.lastSnapshotName = lastSnapshotName;
        fs.outputFileSync(this.path + "/config.json", JSON.stringify(this));
    };
    return Config;
})();
exports.Config = Config;
