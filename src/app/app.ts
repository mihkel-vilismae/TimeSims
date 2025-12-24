import './style.css';

import { createRuntime } from './runtime/createRuntime';
import { stepRuntime } from './runtime/stepRuntime';

async function start(): Promise<void> {
  const rt = await createRuntime();

  const frame = (t: number): void => {
    stepRuntime(rt, t);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

start();
