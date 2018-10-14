import { Server } from 'http';
import { App } from '../types';

const port = 6543;

export const runExample = (
  app: App<any, any>,
  fn?: (prefix: string) => void,
) => {
  if (process.env.NO_EXAMPLES === '1') return;

  const httpServer = new Server(app);

  httpServer.listen(port, (err: any) => {
    if (err) {
      throw new Error(`Unable to start server: ${err}`);
    }
    console.log(`Server listening at port ${port}\n`);
    if (fn) fn(`http://localhost:${port}`);
  });
};
