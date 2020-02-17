import { StoreSettings, DeriveFlowContext } from "./happen";
import { Store } from "./react-happen";

type Actions = {
  INCREMENT: void;
  DECREMENT: void;
};

type State = {
  count: number;
};

const storeSettings: Partial<StoreSettings> = {
  debug: {
    flow: false
  }
};

const store = new Store<State, Actions>({ count: 0 }, storeSettings);

export type FlowContext = DeriveFlowContext<typeof store>;

store.subscribe("INCREMENT", state => {
  state.count++;
});

store.subscribe("DECREMENT", state => {
  state.count--;
});

export const useSelector = store.useSelector;
export const publish = store.publish;
export default store;
