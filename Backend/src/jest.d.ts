declare global {
  function describe(
    name: string,
    fn: () => void
  ): void;

  function beforeEach(
    fn: () => void | Promise<void>
  ): void;

  function it(
    name: string,
    fn: () => void | Promise<void>
  ): void;

  function expect<T>(value: T): {
    toBe(value: T): void;
    toEqual(value: T): void;
    toStrictEqual(value: T): void;
    not: any;
    rejects: any;
    resolves: any;
    [key: string]: any;
  };
}

export {};
