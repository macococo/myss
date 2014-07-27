var assert = require("assert"), sinon = require("sinon"), fs = require("fs-extra");

var execStub = require("child_process").exec = sinon.stub();
var MyssCore = require("../bin/myss-core");

describe("myss", function () {
    var dir = "./testdata", myss = new MyssCore(dir);

    describe("add", function () {
        beforeEach(function () {
            fs.removeSync(dir);
            fs.mkdirsSync(dir);
        });

        afterEach(function () {
            execStub.reset();
            fs.removeSync(dir);
        });

        it("add database without snapshot name", function (done) {
            var firstCall = execStub.withArgs("mysql -uroot -e \"SELECT * FROM information_schema.schemata WHERE schema_name = 'test'\"").callsArgWith(1, "", "success", "");
            var secondCall = execStub.withArgs("mysqldump -u root test > ./testdata/test/default.sql").callsArgWith(1, "", "success", "");
            myss.add(["test"]);

            setTimeout(function () {
                assert.equal(firstCall.calledOnce, true);
                assert.equal(secondCall.calledOnce, true);

                done();
            }, 100);
        });

        it("add database with snapshot name", function (done) {
            var firstCall = execStub.withArgs("mysql -uroot -e \"SELECT * FROM information_schema.schemata WHERE schema_name = 'test'\"").callsArgWith(1, "", "success", "");
            var secondCall = execStub.withArgs("mysqldump -u root test > ./testdata/test/master.sql").callsArgWith(1, "", "success", "");
            myss.add(["test", "master"]);

            setTimeout(function () {
                assert.equal(firstCall.calledOnce, true);
                assert.equal(secondCall.calledOnce, true);

                done();
            }, 100);
        });

        it("add not exist database", function (done) {
            var firstCall = execStub.withArgs("mysql -uroot -e \"SELECT * FROM information_schema.schemata WHERE schema_name = 'test'\"").callsArgWith(1, "", "", "");
            var secondCall = execStub.withArgs("mysqldump -u root test > ./testdata/test/master.sql").callsArgWith(1, "", "success", "");
            myss.add(["test"]);

            setTimeout(function () {
                assert.equal(firstCall.calledOnce, true);
                assert.equal(secondCall.calledOnce, false);

                done();
            }, 100);
        });
    });

    describe("delete", function () {
        beforeEach(function () {
            fs.removeSync(dir);
            fs.mkdirsSync(dir);
        });

        afterEach(function () {
            fs.removeSync(dir);
        });

        it("delete database", function (done) {
            fs.mkdirsSync(dir + "/test");

            myss.delete(["test"]);

            setTimeout(function () {
                assert.equal(fs.existsSync(dir + "/test"), false);

                done();
            }, 100);
        });

        it("delete not exist database", function (done) {
            myss.delete(["test"]);

            setTimeout(function () {
                assert.equal(fs.existsSync(dir + "/test"), false);

                done();
            }, 100);
        });

        it("delete last database snapshot", function (done) {
            fs.mkdirsSync(dir + "/test");
            fs.outputFileSync(dir + "/test/default.sql", "hello!");

            myss.delete(["test", "default"]);

            setTimeout(function () {
                assert.equal(fs.existsSync(dir + "/test"), true);
                assert.equal(fs.existsSync(dir + "/test/default.sql"), true);

                done();
            }, 100);
        });

        it("delete database snapshot", function (done) {
            fs.mkdirsSync(dir + "/test");
            fs.outputFileSync(dir + "/test/default.sql", "hello!");
            fs.outputFileSync(dir + "/test/default_2.sql", "hello!");

            myss.delete(["test", "default"]);

            setTimeout(function () {
                assert.equal(fs.existsSync(dir + "/test"), true);
                assert.equal(fs.existsSync(dir + "/test/default.sql"), false);
                assert.equal(fs.existsSync(dir + "/test/default_2.sql"), true);

                done();
            }, 100);
        });
    });

    describe("list", function () {
        var printlnSpy = null;

        beforeEach(function () {
            printlnSpy = sinon.spy(MyssCore, "println");

            fs.removeSync(dir);
            fs.mkdirsSync(dir);
        });

        afterEach(function () {
            printlnSpy.restore();
            fs.removeSync(dir);
        });

        it("list empty database", function (done) {
            myss.list([]);

            setTimeout(function () {
                assert.equal(printlnSpy.called, false);

                done();
            }, 100);
        });

        it("list databases", function (done) {
            fs.mkdirsSync(dir + "/test");

            myss.list([]);

            setTimeout(function () {
                assert.equal(printlnSpy.called, true);
                assert.equal(printlnSpy.getCall(0).args, "test");

                done();
            }, 100);
        });

        it("list empty snapshot", function (done) {
            fs.mkdirsSync(dir + "/test");

            myss.list(["test"]);

            setTimeout(function () {
                assert.equal(printlnSpy.called, false);

                done();
            }, 100);
        });

        it("list snapshot", function (done) {
            fs.mkdirsSync(dir + "/test");
            fs.outputFileSync(dir + "/test/foo.sql", "hello!");

            myss.list(["test"]);

            setTimeout(function () {
                assert.equal(printlnSpy.called, true);
                assert.equal(printlnSpy.getCall(0).args, "foo");

                done();
            }, 100);
        });
    });

    describe("use", function () {
        beforeEach(function () {
            fs.removeSync(dir);
            fs.mkdirsSync(dir);
        });

        afterEach(function () {
            execStub.reset();
            fs.removeSync(dir);
        });

        it("use database", function (done) {
            fs.mkdirsSync(dir + "/test");
            fs.outputFileSync(dir + "/test/default.sql", "hello!");

            var firstCall = execStub.withArgs("mysql -uroot test < ./testdata/test/default.sql").callsArgWith(1, "", "success", "");
            myss.use(["test"]);

            setTimeout(function () {
                assert.equal(firstCall.calledOnce, true);

                done();
            }, 100);
        });

        it("use not exist database", function (done) {
            var firstCall = execStub.withArgs("mysql -uroot test < ./testdata/test/default.sql").callsArgWith(1, "", "success", "");
            myss.use(["test"]);

            setTimeout(function () {
                assert.equal(firstCall.calledOnce, false);

                done();
            }, 100);
        });

        it("use not exist database snapshot", function (done) {
            fs.mkdirsSync(dir + "/test");

            var firstCall = execStub.withArgs("mysql -uroot test < ./testdata/test/default.sql").callsArgWith(1, "", "success", "");
            myss.use(["test"]);

            setTimeout(function () {
                assert.equal(firstCall.calledOnce, false);

                done();
            }, 100);
        });
    });
});
