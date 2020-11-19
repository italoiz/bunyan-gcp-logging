import {format} from 'util';
import Bunyan from 'bunyan';
import {Transform, TransformCallback, Writable} from 'stream';
import {LogEntry, Level, BunyanLogRecord, BunyanHttpRequestRecord, HttpRequest} from './types';

// Map of Cloud Logging levels.
const BUNYAN_TO_GCP_CLOUD_LOGGING: Map<number, string> = new Map([
  [60, 'CRITICAL'],
  [50, 'ERROR'],
  [40, 'WARNING'],
  [30, 'INFO'],
  [20, 'DEBUG'],
  [10, 'DEBUG'],
]);

/**
 * TAKEN from bunyan source code. (but modified)
 *
 * A fast JSON.stringify that handles cycles and getter exceptions (when
 * safeJsonStringify is installed).
 *
 * This function attempts to use the regular JSON.stringify for speed, but on
 * error (e.g. JSON cycle detection exception) it falls back to safe stringify
 * handlers that can deal with cycles and/or getter exceptions.
 */
function fastAndSafeJsonStringify(rec: any): string {
  try {
    return JSON.stringify(rec);
  } catch (ex) {
    try {
      return JSON.stringify(rec, Bunyan.safeCycles());
    } catch (e) {
      return format('(Exception in JSON.stringify(rec): %j. ', e.message);
    }
  }
}

export class GCPCloudLoggingTransformer extends Transform {
  constructor() {
    super({
      writableObjectMode: true,
    });
  }

  _transform(chunk: any, encoding: string, callback: TransformCallback): void {
    if (typeof chunk === 'string') {
      callback(new Error('Bad configuration. Use raw stream type on bunyan'));
      return;
    }
    let entry;
    try {
      entry = this.formatEntry(chunk);
    } catch (err) {
      callback(err);
      return;
    }
    callback(undefined, fastAndSafeJsonStringify(entry) + '\n');
  }

  /**
   * Format a bunyan record into a Stackdriver log entry.
   */
  private formatEntry(record: BunyanLogRecord): LogEntry {
    // extract field we want to transform or discard
    const {name: logName, msg, level, err, v, hostname, pid, time: timestamp, ...others} = record;

    const entry: LogEntry = {
      logName,
      timestamp,
      message: record?.message ?? msg,
      severity: BUNYAN_TO_GCP_CLOUD_LOGGING.get(Number(level)) as string,
      ...others,
    };

    /**
     * If this is an error, report the full stack trace. This allows
     * Cloud Logging Error Reporting to pick up errors automatically (for
     * severity 'error' or higher). In this case we leave the 'msg' property
     * intact.
     * 
     * @see https://cloud.google.com/error-reporting/docs/formatting-error-messages
     */
    if (err && err?.stack) {
      entry.message = err.stack;
      entry.serviceContext = { service: logName };
    }

    /**
     * Try to get HTTP Request from log data to make an log on the GCP Cloud Logggin format.
     */
    const req = record?.httpRequest ?? record?.req;
    if (req) entry.httpRequest = this.formatHttpEntry(req);

    return entry;
  }

  private formatHttpEntry(request: BunyanHttpRequestRecord): HttpRequest {
    const httpRequest: HttpRequest = {
      requestMethod: request?.method ?? '',
      requestUrl: request?.url ?? '',
      remoteIp: request?.remoteAddress ?? '',
      ...request,
    }
    return httpRequest;
  }
}

export function createStream(level?: Level, out?: Writable): Bunyan.Stream {
  const transformer = new GCPCloudLoggingTransformer();

  transformer.pipe(out || process.stdout);

  return {
    level,
    type: 'raw',
    stream: transformer,
  };
}
