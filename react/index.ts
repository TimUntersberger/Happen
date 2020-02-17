import { Store as BaseStore } from "../happen";
import * as React from "react";

export class Store<T, R> extends BaseStore<T, R, keyof R> {
  public useSelector = <U>(
    selector: (state: T) => U,
    equals = (x: U, y: U) => x === y
  ): U => {
    const [value, setValue] = React.useState(selector(this.state));
    this.listen(state => {
      const selectedValue = selector(state);
      if (!equals(selectedValue, value)) {
        setValue(selectedValue);
      }
    });
    return value;
  };
}
