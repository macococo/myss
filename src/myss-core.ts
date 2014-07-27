/// <reference path="../typings/tsd.d.ts" />

var pjson = require('../package.json'),
    _:UnderscoreStatic = require("underscore"),
    program = require('commander'),
    util = require("util"),
    fs = require("fs-extra"),
    exec = require('child_process').exec,
    mkdirp:any = require('mkdirp'),
    Promise = require('promise');

class Myss {

    static ENV_MYSS_HOME:string = "MYSS_HOME";

    static ENV_MYSS_MYSQLDUMP_OPTIONS:string = "MYSS_MYSQLDUMP_OPTIONS";

    static DEFAULT_SNAPSHOT_NAME:string = "default";

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
            return Myss.fmterror("invalid arguments.");
        }

        var options = this.createOptions(targets),
            dumpPath = options.dbDir + "/" + options.snapName + ".sql";

        this.existDatabase(options.db).then(function(exists:boolean):void {
            if (!exists) {
                Myss.fmterror("database '%s' not found.", options.db);
            } else {
                this.mkdirIfNotExist(options.dbDir).then(function(exists:boolean):void {
                    if (fs.existsSync(dumpPath)) {
                        Myss.fmterror("database snapshot '%s:%s' already exists.", options.db, options.snapName);
                    } else {
                        var dumpOptions = options.options || process.env[Myss.ENV_MYSS_MYSQLDUMP_OPTIONS] || "-u root";
                        this.execCommand("mysqldump " + dumpOptions + " " + options.db + " > " + dumpPath);
                    }
                }.bind(this));
            }
        }.bind(this));
    }

    public use(targets:string[]):void {
        if (_.isEmpty(targets)) {
            return Myss.fmterror("arguments invalid.");
        }

        var options = this.createOptions(targets),
            dumpPath = options.dbDir + "/" + options.snapName + ".sql";

        if (!fs.existsSync(options.dbDir)) {
            Myss.fmterror("database '%s' not found.", options.db);
        } else {
            if (!fs.existsSync(dumpPath)) {
                Myss.fmterror("database snapshot '%s:%s' already exists.", options.db, options.snapName);
            } else {
                this.execCommand("mysql -uroot " + options.db + " < " + dumpPath);
            }
        }
    }

    public list(targets:string[]):void {
        var options = this.createOptions(targets);

        this.mkdirIfNotExist(options.dbDir).then(function(exists:boolean):void {
            if (options.db) {
                fs.readdirSync(options.dbDir)
                    .filter(function(file){
                        return fs.statSync(options.dbDir + "/" + file).isFile();
                    }).forEach(function (file) {
                        Myss.println(file.substring(0, file.lastIndexOf(".")));
                    });
            } else {
                fs.readdirSync(this.home)
                    .filter(function(file){
                        return fs.statSync(options.dbDir + "/" + file).isDirectory();
                    }).forEach(function (file) {
                        Myss.println(file);
                    });
            }
        }.bind(this));
    }

    public delete(targets:string[]):void {
        if (_.isEmpty(targets)) {
            return Myss.fmterror("arguments invalid.");
        }

        var options = this.createOptions(targets);
        if (targets.length == 1) {
            var path:string = options.dbDir;
            if (!fs.existsSync(path)) {
                Myss.fmterror("database '%s' not found.", options.db);
            } else {
                Myss.println("delete: " + path);
                fs.removeSync(path);
            }
        } else {
            var path:string = options.dbDir + "/" + options.snapName + ".sql";
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
    }

    private createOptions(targets:string[]):any {
        targets = targets || [];

        var db = this.extract(targets, 0) || "";
        return {
            db: db,
            dbDir: this.home + "/" + db,
            snapName: this.escapePathDelimiter(this.extract(targets, 1) || Myss.DEFAULT_SNAPSHOT_NAME),
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
        Myss.println(cmd);
        return new Promise(function(resolve, reject):void {
            exec(cmd, function(err, stdout, stderr):void {
                if (err) reject(err);
                resolve(stdout);
            });
        });
    }

    private mkdirIfNotExist(dir:string):PromiseTs.Promise {
        return new Promise(function(resolve, reject):void {
            if (!fs.existsSync(dir)) {
                fs.mkdirsSync(dir);
                resolve(false);
            } else {
                resolve(true);
            }
        });
    }

    private static fmterror(...message:any[]):void {
        util.error(util.format.apply(this, message));
    }

    private static println(message:string):void {
        util.print(message + "\n");
    }

}

module.exports = Myss;