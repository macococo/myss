/// <reference path="../typings/tsd.d.ts" />

import fs = require("fs-extra");
import assert = require("assert");
import sinon = require("sinon");
import child_process = require('child_process');

var myss = require('../bin/myss-core');
var execStub = child_process.exec = sinon.stub();

describe("myss", function():void {

    var dir = "./testdata",
        runner = new myss.Runner(dir);

    describe("add", function():void {

        beforeEach(function():void {
            fs.removeSync(dir);
            fs.mkdirsSync(dir);
        });

        afterEach(function():void {
            execStub.reset();
            fs.removeSync(dir);
        });

        it("add database without snapshot name", function(done:MochaDone):void {
            var firstCall:SinonSpy = execStub.withArgs("mysql -u root -e \"SELECT * FROM information_schema.schemata WHERE schema_name = 'test'\"").callsArgWith(1, "", "success", "");
            var secondCall:SinonSpy = execStub.withArgs("mysqldump -u root test > ./testdata/test/default.sql").callsArgWith(1, "", "success", "");
            runner.add(["test"]);

            setTimeout(function():void {
                assert.equal(firstCall.calledOnce, true);
                assert.equal(secondCall.calledOnce, true);

                done();
            }, 100);
        });

        it("add database with snapshot name", function(done:MochaDone):void {
            var firstCall:SinonSpy = execStub.withArgs("mysql -u root -e \"SELECT * FROM information_schema.schemata WHERE schema_name = 'test'\"").callsArgWith(1, "", "success", "");
            var secondCall:SinonSpy = execStub.withArgs("mysqldump -u root test > ./testdata/test/master.sql").callsArgWith(1, "", "success", "");
            runner.add(["test", "master"]);

            setTimeout(function():void {
                assert.equal(firstCall.calledOnce, true);
                assert.equal(secondCall.calledOnce, true);

                done();
            }, 100);
        });

        it("add not exist database", function(done:MochaDone):void {
            var firstCall:SinonSpy = execStub.withArgs("mysql -u root -e \"SELECT * FROM information_schema.schemata WHERE schema_name = 'test'\"").callsArgWith(1, "", "", "");
            var secondCall:SinonSpy = execStub.withArgs("mysqldump -u root test > ./testdata/test/master.sql").callsArgWith(1, "", "success", "");
            runner.add(["test"]);

            setTimeout(function():void {
                assert.equal(firstCall.calledOnce, true);
                assert.equal(secondCall.calledOnce, false);

                done();
            }, 100);
        });

    });

    describe("replace", function():void {

        beforeEach(function():void {
            fs.removeSync(dir);
            fs.mkdirsSync(dir);
        });

        afterEach(function():void {
            execStub.reset();
            fs.removeSync(dir);
        });

        it("replace exist database", function(done:MochaDone):void {
            fs.mkdirsSync(dir + "/test");
            fs.outputFileSync(dir + "/test/default.sql", "hello!");

            var firstCall:SinonSpy = execStub.withArgs("mysql -u root -e \"SELECT * FROM information_schema.schemata WHERE schema_name = 'test'\"").callsArgWith(1, "", "success", "");
            var secondCall:SinonSpy = execStub.withArgs("mysqldump -u root test > ./testdata/test/default.sql").callsArgWith(1, "", "success", "");
            runner.replace(["test"]);

            setTimeout(function():void {
                assert.equal(firstCall.calledOnce, true);
                assert.equal(secondCall.calledOnce, true);

                done();
            }, 100);
        });

    });

    describe("delete", function():void {

        beforeEach(function():void {
            fs.removeSync(dir);
            fs.mkdirsSync(dir);
        });

        afterEach(function():void {
            fs.removeSync(dir);
        });

        it("delete database", function(done:MochaDone):void {
            fs.mkdirsSync(dir + "/test");

            runner.delete(["test"]);

            setTimeout(function():void {
                assert.equal(fs.existsSync(dir + "/test"), false);

                done();
            }, 100);
        });

        it("delete not exist database", function(done:MochaDone):void {
            runner.delete(["test"]);

            setTimeout(function():void {
                assert.equal(fs.existsSync(dir + "/test"), false);

                done();
            }, 100);
        });

        it("delete last database snapshot", function(done:MochaDone):void {
            fs.mkdirsSync(dir + "/test");
            fs.outputFileSync(dir + "/test/default.sql", "hello!");

            runner.delete(["test", "default"]);

            setTimeout(function():void {
                assert.equal(fs.existsSync(dir + "/test"), true);
                assert.equal(fs.existsSync(dir + "/test/default.sql"), true);

                done();
            }, 100);
        });

        it("delete database snapshot", function(done:MochaDone):void {
            fs.mkdirsSync(dir + "/test");
            fs.outputFileSync(dir + "/test/default.sql", "hello!");
            fs.outputFileSync(dir + "/test/default_2.sql", "hello!");

            runner.delete(["test", "default"]);

            setTimeout(function():void {
                assert.equal(fs.existsSync(dir + "/test"), true);
                assert.equal(fs.existsSync(dir + "/test/default.sql"), false);
                assert.equal(fs.existsSync(dir + "/test/default_2.sql"), true);

                done();
            }, 100);
        });

    });

    describe("list", function():void {
        var printlnSpy = null;

        beforeEach(function():void {
            printlnSpy = sinon.spy(myss, "println");

            fs.removeSync(dir);
            fs.mkdirsSync(dir);
        });

        afterEach(function():void {
            printlnSpy.restore();
            fs.removeSync(dir);
        });

        it("list empty database", function(done:MochaDone):void {
            runner.list([]);

            setTimeout(function():void {
                assert.equal(printlnSpy.called, false);

                done();
            }, 100);
        });

        it("list databases", function(done:MochaDone):void {
            fs.mkdirsSync(dir + "/test");

            runner.list([]);

            setTimeout(function():void {
                assert.equal(printlnSpy.called, true);
                assert.equal(printlnSpy.getCall(0).args, "test");

                done();
            }, 100);
        });

        it("list empty snapshot", function(done:MochaDone):void {
            fs.mkdirsSync(dir + "/test");

            runner.list(["test"]);

            setTimeout(function():void {
                assert.equal(printlnSpy.called, false);

                done();
            }, 100);
        });

        it("list snapshot", function(done:MochaDone):void {
            fs.mkdirsSync(dir + "/test");
            fs.outputFileSync(dir + "/test/foo.sql", "hello!");

            runner.list(["test"]);

            setTimeout(function():void {
                assert.equal(printlnSpy.called, true);
                assert.equal(printlnSpy.getCall(0).args, "foo");

                done();
            }, 100);
        });
    });

    describe("use", function():void {

        beforeEach(function():void {
            fs.removeSync(dir);
            fs.mkdirsSync(dir);
        });

        afterEach(function():void {
            execStub.reset();
            fs.removeSync(dir);
        });

        it("use database", function(done:MochaDone):void {
            fs.mkdirsSync(dir + "/test");
            fs.outputFileSync(dir + "/test/default.sql", "hello!");

            var firstCall:SinonSpy = execStub.withArgs("mysql -u root test < ./testdata/test/default.sql").callsArgWith(1, "", "success", "");
            runner.use(["test"]);

            setTimeout(function():void {
                assert.equal(firstCall.calledOnce, true);

                done();
            }, 100);
        });

        it("use not exist database", function(done:MochaDone):void {
            var firstCall:SinonSpy = execStub.withArgs("mysql -u root test < ./testdata/test/default.sql").callsArgWith(1, "", "success", "");
            runner.use(["test"]);

            setTimeout(function():void {
                assert.equal(firstCall.calledOnce, false);

                done();
            }, 100);
        });

        it("use not exist database snapshot", function(done:MochaDone):void {
            fs.mkdirsSync(dir + "/test");

            var firstCall:SinonSpy = execStub.withArgs("mysql -u root test < ./testdata/test/default.sql").callsArgWith(1, "", "success", "");
            runner.use(["test"]);

            setTimeout(function():void {
                assert.equal(firstCall.calledOnce, false);

                done();
            }, 100);
        });

    });

});