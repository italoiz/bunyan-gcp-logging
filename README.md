<p align="center">
  <img alt="npm" src="https://img.shields.io/npm/v/bunyan-gcp-logging">
</p>

## Bunyan GCP Cloud Logging Transport

Simple [Bunyan](https://npmjs.com/package/bunyan) transport to leverage Google Cloud Platform configuration for [Cloud Logging](https://cloud.google.com/run/docs/logging)

### Usage

Just configure this transport for the logger:

```js
const Bunyan = require('bunyan');
const {createStream} = require('bunyan-gcp-logging');

const logger = Bunyan.createLogger({
  name: 'MyLogName',
  streams: [createStream()],
});
```

Optionally, you can configure the log level for the transport and the final output stream
(`stdout` by default).

```js
const Bunyan = require('bunyan');
const {createStream} = require('bunyan-gcp-logging');

const logger = Bunyan.createLogger({
  name: 'warnings',
  streams: [createStream(Bunyan.WARN, process.stderr)],
});
```

### The Problem

If your node application is deployed on GCP (Google Cloud Platform), and you've enabled logging for it (the default); all
your logs will end up in Cloud Logging Viewer but won't be very readable, and won't be using most
of Cloud Logging features.

Bunyan uses structured logging, but with a different schema than Cloud Logging expect to make take
advantange of it's features.

Some of the features enabled by using this module:

- Show the correct severity (level) in Cloud Logging
- Show the `msg` in the summary. (Cloud Logging expects a `message` key instead of `msg`)
- Render information about the request.
- Track errors in Cloud Logging Error Reporting

### How does this work?

When using bunyan you can configure transports (`streams` in reality). If no one is configured, logs
go to `stdout`. In our case, we want them to go to `stdout` but with a different format. A format
that is compatible with what Cloud Logging has understading.

So, in essence all you need to do is configure this module as the stream.

```js
const Bunyan = require('bunyan');
const {createStream} = require('bunyan-gcp-logging');

const logger = Bunyan.createLogger({
  name: 'MyLogName',
  streams: [createStream()],
});
```

#### The lifecycle of a log entry in GKE

So, what happens when you do `logger.info('hello world')`?

First, bunyan creates a log record something like `{v: 1, level: 30, msg: 'hello world', ...}`.
Then, is passed to the configured stream, which if none was configured, is simply sending all to
`stdout`

Second, since you are running on a docker container within a node in GCP; docker will wrap that log
entry into something like

```json
{
  "stream": "stdout",
  "time": "2018-08-24T12:41:50.987184687Z",
  "log": "{\"level\":30,\"time\":1535114510986,\"msg\":\"hello world\"}"
}
```



Lastly, since you have logging configured for GCP, there a fluentd daemon on each node. fluentd
aggregates logs from all your containers, transform them based on it's configuration, and finally
exports them. On GCP, fluentd is configured to export log entries to Cloud Logging. Also, it's
configured to unwrap the docker log entry and parse your original entry. It will recognize some fields
as part of the Cloud Logging schema and use them. But mostly it will pass all of them to Cloud Logging.

#### The expected log entry

So, to be a good citizen with Cloud Logging and the fluentd configuration in GCP, we need to make a
few changes to the original entry.

1. Use `message` instead of `msg`
2. When logging an error, use `err.stack` as the value for `message`
3. When logging an http request, use `httpRequest` to log the details about it
4. Map `level` to `severity`

For more information about the stackdriver log entry schema check:

- General: https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry
- For errrors: https://cloud.google.com/error-reporting/docs/formatting-error-messages

### Log Trasformation

When in bunyan you log like:

```js
logger.info({data: {from: 'me', to: 'you'}}, 'data transfer');
```

Bunyan will generate

```json
{
  "name": "src-example",
  "level": 30,
  "msg": "data transfer",
  "data": {"from": "me", "to": "you"},
  "time": "2012-02-06T04:19:35.605Z",
  "src": {
    "file": "/Users/trentm/tm/node-bunyan/examples/src.js",
    "line": 20,
    "func": "Wuzzle.woos"
  },
  "hostname": "banana.local",
  "pid": 123,
  "v": 0
}
```

To make Cloud Logging compatible it will be transformed into:

```json
{
  "name": "src-example",
  "severity": "INFO",
  "message": "data transfer",
  "data": {"from": "me", "to": "you"},
  "time": "2012-02-06T04:19:35.605Z",
  "src": {
    "file": "/Users/trentm/tm/node-bunyan/examples/src.js",
    "line": 20,
    "func": "Wuzzle.woos"
  }
}
```

#### For Errors

when logging an error with bunyan:

```js
log.info(err); // Special case to log an `Error` instance to the record.
// This adds an "err" field with exception details
// (including the stack) and sets "msg" to the exception
// message.
log.info(err, 'more on this: %s', more);
// ... or you can specify the "msg".
```

Bunyan by default, will keep your error in `err` key. We will use the `err.stack` and set it
as the `message`, since that what's required by Cloud Logging.

Also, the error log entry for Cloud Logging requires us to set:

```ts
  "serviceContext": {
    "service": string,     // Required.
    "version": string
  },
```

We will use the `name` configured as `serviceContext.name`.

Thanks to this, you can track your error ocurrences in https://cloud.google.com/error-reporting/

### Other options

You can bypass fluentd & docker all together and log directly by calling the Cloud Logging API. I'm
not pro using a http transport for log within the applicaton, since every application will be
doing it's own buffering and sending, plus you will be loosing context information like the
node & pod id.

But, if that's not a proble, simply use https://github.com/googleapis/nodejs-logging-bunyan.

### Thanks!

Special thanks to [Mariano Cortesi](https://github.com/mcortesi) for initial efforts. This repository it's based on the [bunyan-gke-stackdriver](https://github.com/mcortesi/bunyan-gke-stackdriver).