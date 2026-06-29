declare module "react" {
  export type ReactNode = any;
  export type PropsWithChildren<T = {}> = T & { children?: ReactNode };
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
  export const Fragment: any;
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
}

declare module "react-dom/client" {
  export function createRoot(container: Element | DocumentFragment): {
    render(node: any): void;
  };
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
