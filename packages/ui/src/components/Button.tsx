import React from 'react';
import { Button as AntButton } from 'antd';
import type { ButtonProps as AntButtonProps } from 'antd';
import { colors } from '../tokens/colors';

export type ButtonIntent = 'primary' | 'export' | 'import' | 'finance' | 'danger' | 'default';

export interface ButtonProps extends Omit<AntButtonProps, 'type'> {
  intent?: ButtonIntent;
  type?: AntButtonProps['type'];
}

const intentStyles: Record<ButtonIntent, React.CSSProperties> = {
  primary: {},
  default: {},
  export: {
    backgroundColor: colors.module.export[600],
    borderColor: colors.module.export[600],
    color: colors.white,
  },
  import: {
    backgroundColor: colors.module.import[600],
    borderColor: colors.module.import[600],
    color: colors.white,
  },
  finance: {
    backgroundColor: colors.module.finance[600],
    borderColor: colors.module.finance[600],
    color: colors.white,
  },
  danger: {
    backgroundColor: colors.danger[600],
    borderColor: colors.danger[600],
    color: colors.white,
  },
};

export function Button({ intent = 'primary', type, style, ...props }: ButtonProps) {
  const intentStyle = intentStyles[intent];
  const buttonType = intent === 'primary' ? 'primary' : intent === 'default' ? 'default' : 'primary';

  return (
    <AntButton
      type={type ?? buttonType}
      style={{ ...intentStyle, ...style }}
      {...props}
    />
  );
}
