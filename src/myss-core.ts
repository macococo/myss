/// <reference path="../typings/tsd.d.ts" />

import _ = require("underscore");
import util = require("util");
import fs = require("fs-extra");
import child_process = require('child_process');
import Promise = require('promise');
import moment = require('moment');

// Constants
export var ENV_MYSS_HOME:string = "MYSS_HOME";
export var DEFAULT_SNAPSHOT_NAME:string = "default";

// Utilities
export function fmterror(...message:any[]):void {
    util.error(util.format.apply(this, message));
}

export function println(message:string):void {
    util.print(message + "\n");
}

export class Runner {

    home:string;

    globalConfig:GlobalConfig;

    constructor(home:string) {
        this.home = home;
        this.globalConfig = new GlobalConfig(home);
    }

    public exec(mod:string, targets:string[]):void {
        if (_.isFunction(this[mod])) {
            this[mod].call(this, targets);
            this.globalConfig.write();
        }
    }

    public config(targets:string[]):void {
        if (_.isEmpty(targets)) {
            var config = this.globalConfig.config;
            for (var prop in config) {
                println(prop + ": " + config[prop]);
            }
        } else if (targets.length == 1) {
            var value = this.globalConfig.config[targets[0]];
            if (value == undefined) {
                fmterror("invalid arguments.");
            } else {
                println(this.globalConfig.config[targets[0]]);
            }
        } else if (targets.length == 2) {
            var value = this.globalConfig.config[targets[0]];
            if (value == undefined) {
                fmterror("invalid arguments.");
            } else {
                this.globalConfig.config[targets[0]] = targets[1];
                this.globalConfig.write();
            }
        } else {
            fmterror("invalid arguments.");
        }

    }

    public add(targets:string[]):void {
        if (_.isEmpty(targets)) {
            return fmterror("invalid arguments.");
        }

        this.addSnapshot(this.createOptions(targets), false);
    }

    public replace(targets:string[]):Promise {
        if (_.isEmpty(targets)) {
            return new Promise(function(resolve, reject):void {
                fmterror("invalid arguments.");
                resolve();
            }.bind(this));
        }

        return this.addSnapshot(this.createOptions(targets), true);
    }

    private addSnapshot(options:any, replace:boolean):Promise {
        return new Promise(function(resolve, reject):void {
            var dumpPath = options.dbDir + "/" + options.snapName + ".sql";

            this.existDatabase(options).then(function(exists:boolean):void {
                if (!exists) {
                    fmterror("database '%s' not found.", options.db);
                    resolve();
                } else {
                    this.mkdirIfNotExist(options.dbDir).then(function(exists:boolean):void {
                        if (!replace && fs.existsSync(dumpPath)) {
                            fmterror("database snapshot '%s:%s' already exists.", options.db, options.snapName);
                            resolve();
                        } else {
                            var dumpOptions = options.options || this.globalConfig.config["mysql_dump_options"] || "-u root";
                            this.execCommand("mysqldump " + dumpOptions + " " + options.db + " > " + dumpPath).then(function() {
                                new Config(options.dbDir).write(options.snapName);

                                resolve();
                            });
                        }
                    }.bind(this));
                }
            }.bind(this));
        }.bind(this));
    }

    public use(targets:string[]):void {
        if (_.isEmpty(targets)) {
            return fmterror("arguments invalid.");
        }

        var options = this.createOptions(targets),
            dumpPath = options.dbDir + "/" + options.snapName + ".sql";

        if (!fs.existsSync(options.dbDir)) {
            fmterror("database '%s' not found.", options.db);
        } else {
            if (!fs.existsSync(dumpPath)) {
                fmterror("database snapshot '%s:%s' already exists.", options.db, options.snapName);
            } else {
                var config = new Config(options.dbDir);
                var exec = function() {
                    var impOptions = options.options || this.globalConfig.config["mysql_options"] || "-u root";
                    this.execCommand("mysql " + impOptions + " " + options.db + " < " + dumpPath);

                    config.write(options.snapName);
                }.bind(this);

                if (this.globalConfig.config["auto_replace"] == "true" && config.lastSnapshotName) {
                    println("[auto replace]");
                    targets[1] = config.lastSnapshotName;
                    this.replace(targets).then(exec);
                } else {
                    exec.call(this);
                }
            }
        }
    }

    public list(targets:string[]):void {
        var options = this.createOptions(targets);

        this.mkdirIfNotExist(options.dbDir).then(function(exists:boolean):void {
            if (options.db) {
                var config = new Config(options.dbDir);

                var matrix = new Matrix();
                fs.readdirSync(options.dbDir).forEach(function (file) {
                    var stat = fs.statSync(options.dbDir + "/" + file);
                    if (!stat.isFile()) {
                        return;
                    }

                    var snapName:string = file.substring(0, file.lastIndexOf("."));

                    matrix.set(0, config.lastSnapshotName == snapName ? "*" : "");
                    matrix.set(1, snapName);
                    matrix.set(2, moment(stat.mtime).format("YYYY-MM-DD HH:mm:ss"));
                    matrix.set(3, stat.size);
                    matrix.next();
                });

                matrix.print();
            } else {
                fs.readdirSync(this.home)
                    .filter(function(file){
                        return fs.statSync(options.dbDir + "/" + file).isDirectory();
                    }).forEach(function (file) {
                        println(file);
                    });
            }
        }.bind(this));
    }

    public delete(targets:string[]):void {
        if (_.isEmpty(targets)) {
            return fmterror("arguments invalid.");
        }

        var options = this.createOptions(targets);
        if (targets.length == 1) {
            var path:string = options.dbDir;
            if (!fs.existsSync(path)) {
                fmterror("database '%s' not found.", options.db);
            } else {
                println("delete: " + path);
                fs.removeSync(path);
            }
        } else {
            var path:string = options.dbDir + "/" + options.snapName + ".sql";
            if (!fs.existsSync(path)) {
                fmterror("database snapshot '%s:%s' already exists.", options.db, options.snapName);
            } else {
                var files = fs.readdirSync(options.dbDir);
                if (files.length == 1) {
                    fmterror("database snapshot is not possible to delete all.");
                } else {
                    println("delete: " + path);
                    fs.removeSync(path);
                }
            }
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

    private existDatabase(options:any):Promise {
        return new Promise(function(resolve, reject):void {
            var impOptions = options.options || this.globalConfig.config["mysql_options"] || "-u root";
            this.execCommand("mysql " + impOptions + " -e \"SELECT * FROM information_schema.schemata WHERE schema_name = '" + options.db + "'\"")
                .then(function(stdout:string):void {
                    resolve(!!stdout);
                });
        }.bind(this));
    }

    private execCommand(cmd:string):Promise {
        println(cmd);
        return new Promise(function(resolve, reject):void {
            child_process.exec(cmd, function(err, stdout, stderr):void {
                if (err) reject(err);
                resolve(stdout);
            });
        });
    }

    private mkdirIfNotExist(dir:string):Promise {
        return new Promise(function(resolve, reject):void {
            if (!fs.existsSync(dir)) {
                fs.mkdirsSync(dir);
                resolve(false);
            } else {
                resolve(true);
            }
        });
    }

}

export class Matrix {

    records:any = [];

    maxLength:number[] = [];

    row:number = 0;

    public set(col, value):void {
        var record = this.records[this.row] = this.records[this.row] || [];
        this.records[this.row][col] = value;

        if (value != null) {
            var max = this.maxLength[col];
            if (max == undefined || max < new String(value).length) {
                this.maxLength[col] = new String(value).length;
            }
        }
    }

    public next():void {
        this.row++;
    }

    public print():void {
        for (var row = 0; row < this.records.length; row++) {
            var record = this.records[row];
            for (var col = 0; col < record.length; col++) {
                var max:number = this.maxLength[col];
                util.print(record[col] + Array(max - new String(record[col]).length + 3).join(" "));
            }
            util.print("\n");
        }
    }

}

export class GlobalConfig {

    path:string;

    config:any = {
        mysql_dump_options: "-u root",
        mysql_options: "-u root",
        auto_replace: "false",
    };

    constructor(path:string) {
        this.path = path;

        var jsonPath:string = this.path + "/config.json";
        if (fs.existsSync(jsonPath)) {
            this.config = fs.readJsonSync(jsonPath);
        }
    }

    public static read(path:string) {
        var config = new GlobalConfig(path);

    }

    public write():void {
        fs.outputFileSync(this.path + "/config.json", JSON.stringify(this.config));
    }

}


export class Config {

    path:string;

    lastSnapshotName:string;

    constructor(path:string) {
        this.path = path;

        var jsonPath:string = this.path + "/config.json";
        if (fs.existsSync(jsonPath)) {
            var json = fs.readJsonSync(jsonPath);
            _.extend(this, json);
        }
    }

    public static read(path:string) {
        var config = new Config(path);

    }

    public write(lastSnapshotName:string):void {
        this.lastSnapshotName = lastSnapshotName;
        fs.outputFileSync(this.path + "/config.json", JSON.stringify(this));
    }

}
