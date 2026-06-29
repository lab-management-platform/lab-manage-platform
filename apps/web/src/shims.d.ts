declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type ReactNode = any;
  export type PropsWithChildren<T = object> = T & { children?: ReactNode };
  export type SyntheticEvent<T = Element> = {
    preventDefault(): void;
    stopPropagation(): void;
    currentTarget: T;
    target: EventTarget & T;
  };

  export function useState<T>(
    initialState: T | (() => T)
  ): [T, (value: T | ((prevState: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useDeferredValue<T>(value: T): T;
}

declare module "react/jsx-runtime" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Fragment: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function jsx(type: any, props: any, key?: any): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function jsxs(type: any, props: any, key?: any): any;
}

declare module "react-dom/client" {
  export function createRoot(container: Element | DocumentFragment): {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(node: any): void;
  };
}

declare namespace JSX {
  interface IntrinsicElements {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [elemName: string]: any;
  }
}
