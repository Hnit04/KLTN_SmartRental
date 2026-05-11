declare module 'react-simple-captcha' {
  import * as React from 'react';

  export function loadCaptchaEnginge(
    numberOfCharacters: number,
    backgroundColor?: string,
    fontColor?: string,
    charStyle?: 'upper' | 'lower' | 'numbers' | 'special_char' | 'all'
  ): void;

  export function validateCaptcha(
    userValue: string,
    reloadOnFail?: boolean
  ): boolean;

  export const LoadCanvasTemplate: React.FC<{
    reloadText?: string;
    reloadColor?: string;
  }>;

  export const LoadCanvasTemplateNoReload: React.FC;
}
