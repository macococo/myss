var assert = require("assert"), sinon = require("sinon"), fs = require("fs-extra"), MyssCore = require("../bin/myss-core");

describe("myss", function () {
    var dir = "./testdata", myss = new MyssCore(dir);

    describe("list", function () {
        var printlnSpy = null;

        beforeEach(function (done) {
            printlnSpy = sinon.spy(MyssCore, "println");

            fs.remove(dir, function () {
                fs.mkdirs(dir);

                done();
            });
        });

        afterEach(function () {
            printlnSpy.restore();
            fs.remove(dir);
        });

        it("list empty database", function (done) {
            myss.list([]);

            setTimeout(function () {
                assert.equal(printlnSpy.called, false);

                done();
            }, 1000);
        });

        it("list databases", function (done) {
            fs.mkdirs(dir + "/test", function () {
                myss.list([]);

                setTimeout(function () {
                    assert.equal(printlnSpy.called, true);
                    assert.equal(printlnSpy.getCall(0).args, "test");

                    done();
                }, 1000);
            });
        });

        it("list empty snapshot", function (done) {
            fs.mkdirs(dir + "/test", function () {
                myss.list(["test"]);

                setTimeout(function () {
                    assert.equal(printlnSpy.called, false);

                    done();
                }, 1000);
            });
        });

        it("list snapshot", function (done) {
            fs.mkdirs(dir + "/test", function () {
                fs.outputFile(dir + "/test/foo.sql", "hello!", function () {
                    myss.list(["test"]);

                    setTimeout(function () {
                        assert.equal(printlnSpy.called, true);
                        assert.equal(printlnSpy.getCall(0).args, "foo");

                        done();
                    }, 1000);
                });
            });
        });
    });
});
