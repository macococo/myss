/// <reference path="../typings/tsd.d.ts" />

var assert = require("assert"),
    sinon:SinonStatic = require("sinon"),
    fs = require("fs-extra"),
    MyssCore = require("../bin/myss-core");

describe("myss", function():void {

    var dir = "./testdata",
        myss = new MyssCore(dir);

    describe("list", function():void {
        var printlnSpy = null;

        beforeEach(function(done:MochaDone):void {
            printlnSpy = sinon.spy(MyssCore, "println");

            fs.remove(dir, function():void {
                fs.mkdirs(dir);

                done();
            });
        });

        afterEach(function():void {
            printlnSpy.restore();
            fs.remove(dir);
        });

        it("list empty database", function(done:MochaDone):void {
            myss.list([]);

            setTimeout(function():void {
                assert.equal(printlnSpy.called, false);

                done();
            }, 1000);
        });

        it("list databases", function(done:MochaDone):void {
            fs.mkdirs(dir + "/test", function():void {
                myss.list([]);

                setTimeout(function():void {
                    assert.equal(printlnSpy.called, true);
                    assert.equal(printlnSpy.getCall(0).args, "test");

                    done();
                }, 1000);
            });
        });

        it("list empty snapshot", function(done:MochaDone):void {
            fs.mkdirs(dir + "/test", function():void {
                myss.list(["test"]);

                setTimeout(function():void {
                    assert.equal(printlnSpy.called, false);

                    done();
                }, 1000);
            });
        });

        it("list snapshot", function(done:MochaDone):void {
            fs.mkdirs(dir + "/test", function():void {
                fs.outputFile(dir + "/test/foo.sql", "hello!", function():void {
                    myss.list(["test"]);

                    setTimeout(function():void {
                        assert.equal(printlnSpy.called, true);
                        assert.equal(printlnSpy.getCall(0).args, "foo");

                        done();
                    }, 1000);
                });
            });
        });
    });

});