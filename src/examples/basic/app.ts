import createApp from '../../create-app';

// Put this in some file somewhere
const thisReplacesExpress = () => createApp();

// Then declare your `app` like `const app = require('./path/to/that/file;)();
const app = thisReplacesExpress();

const asyncGreeting = (s: string) => new Promise<string>(
  resolve => setTimeout(() => resolve(`Async Hi ${s}!`), 50),
);

app.get(
  '/sync/:name',
  // Note that the last middleware's return value is the endpoint's return value
  // (and always a JSON). Also note that the middleware must take only `req`,
  // otherwise it will be treated as a regular middleware.
  req => `Hi ${req.params.name}`,
);
app.get(
  '/async/:name',
  // You can call an async function straight away and that works too:
  req => asyncGreeting(req.params.name),
);
app.get(
  '/async-with-stuff/:name',
  // And, of course, you can inline an async middleware:
  async (req) => {
    const greeting = await asyncGreeting(req.params.name);
    return `${greeting} (with stuff!)`;
  },
);
app.get(
  '/not-json/:name',
  // If you need to return something other than JSON, just write a regular
  // middleware:
  async (req, res) => {
    const greeting = await asyncGreeting(req.params.name);
    res.setHeader('content-type', 'text/plain');
    res.send(greeting);
  },
);

export default app;
