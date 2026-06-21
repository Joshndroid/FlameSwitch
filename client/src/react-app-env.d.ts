/// <reference types="vite/client" />

import type { JSX as ReactJSX } from 'react';

declare global {
  namespace JSX {
    type Element = ReactJSX.Element;
    interface IntrinsicElements extends ReactJSX.IntrinsicElements {}
  }
}

declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
