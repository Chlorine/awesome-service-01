import { MinimalVisitorInfo } from './common-front';

declare type NoParams = {};
declare type OnlySuccess = {};

export type ApiActions = {
  doSomething: {
    params: NoParams;
    results: {
      code: number;
    };
  };
  doSomethingElse: {
    params: {
      incomingToken: string;
    };
    results: OnlySuccess;
  };
  registerVisitor: {
    params: {
      visitor: MinimalVisitorInfo;
      phone: string;
      email: string;
    };
    results: {
      visitorId: string;
    };
  };
};

export type Results<AN extends keyof ApiActions> = ApiActions[AN]['results'];
export type ResultsPromise<AN extends keyof ApiActions> = Promise<Results<AN>>;
export type Params<AN extends keyof ApiActions> = ApiActions[AN]['params'];
