declare module PromiseTs {
    class Promise {
        constructor(callback: (resolve: Function, reject: Function) => void);
        then(doneFilter: Function, failFilter?: Function, progressFilter?: Function): Promise;
        done(...callbacks: Function[]): Promise;
        fail(...callbacks: Function[]): Promise;
        always(...callbacks: Function[]): Promise;
    }
}

declare module "promise" {
    export = PromiseTs;
}