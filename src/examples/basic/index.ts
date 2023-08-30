import { runExample } from '../common';
import app from './app';

// And just to make this example runnable...
runExample(app, prefix => console.log(`Try:
  curl ${prefix}/sync/john
  curl ${prefix}/async/john
  curl ${prefix}/async-with-stuff/john
  curl -v ${prefix}/not-json/john
`));
