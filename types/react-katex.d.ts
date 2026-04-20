// Minimal shim for react-katex (library ships no TS types).
// Only the surface we use on /calc/docs/physics is declared.

declare module 'react-katex' {
  import type {ReactNode} from 'react';

  export interface KatexProps {
    math?: string;
    children?: string;
    block?: boolean;
    errorColor?: string;
    renderError?: (error: Error) => ReactNode;
    settings?: Record<string, unknown>;
  }

  export const InlineMath: (props: KatexProps) => JSX.Element;
  export const BlockMath: (props: KatexProps) => JSX.Element;
}
