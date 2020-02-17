export class Test<T> {
  constructor(public value: T) {}
}

export namespace Test {
  type Hello = string;
}

Test.Hello;
