import React from 'react';
import { TropicalVilaRunner, type TropicalVilaRunnerProps } from '../game/TropicalVilaRunner';

export type { TropicalVilaRunnerProps as Caramelo3DRunnerProps };

export const Caramelo3DRunner: React.FC<TropicalVilaRunnerProps> = (props) => {
  return <TropicalVilaRunner {...props} />;
};

export default Caramelo3DRunner;
