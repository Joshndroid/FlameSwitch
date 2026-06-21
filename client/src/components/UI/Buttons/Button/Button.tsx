import { ButtonHTMLAttributes, ReactNode } from 'react';
import classes from './Button.module.css';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  click?: any;
}

export const Button = (props: Props): JSX.Element => {
  const { children, click, ...buttonProps } = props;

  return (
    <button {...buttonProps} className={`${classes.Button} ${props.className || ''}`} onClick={click || props.onClick}>
      {children}
    </button>
  );
};
