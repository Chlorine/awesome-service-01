export type ApiActions = {
  doSomething: {
    params: {
      // none
    };
    results: {
      code: number;
    };
  };
  doSomethingElse: {
    params: {
      incomingToken: string;
    };
    results: {
      // just 'success'
    };
  };
};

export type Results<AN extends keyof ApiActions> = ApiActions[AN]['results'];
export type ResultsPromise<AN extends keyof ApiActions> = Promise<Results<AN>>;
export type Params<AN extends keyof ApiActions> = ApiActions[AN]['params'];
