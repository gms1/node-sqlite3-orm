
export declare type PromiseFactory<T> = () => Promise<T>;
export declare type PromiseFactories<T> = PromiseFactory<T>[];

export function sequentialize<T>(factories: PromiseFactories<T>): Promise<T[]> {
  return factories.reduce(
      (promise, factory) => promise.then((results) => factory().then((result) => results.concat(result))),
      Promise.resolve<T[]>([]));
}
