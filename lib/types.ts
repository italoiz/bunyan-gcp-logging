export interface ServiceContext {
  /**
   * An identifier of the service, such as the name of the executable, job, or
   * Google App Engine service name.
   */
  service?: string;
  /** Represents the version of the service. */
  version?: string;
}

export interface HttpRequest {
  requestMethod?: string;
  requestUrl?: string;
  requestSize?: number;
  status?: number;
  responseSize?: number;
  userAgent?: string;
  remoteIp?: string;
  serverIp?: string;
  referer?: string;
  latency?: string | {seconds: number; nanos: number};
  cacheLookup?: boolean;
  cacheHit?: boolean;
  cacheValidatedWithOriginServer?: boolean;
  cacheFillBytes?: number;
  protocol?: string;
}

export interface LogEntry {
  logName: string;
  severity: string;
  message?: string;
  httpRequest?: HttpRequest;
  serviceContext?: ServiceContext;
  timestamp?: string;
  /** Other Properties */
  [key: string]: any;
}

export const enum Level {
  FATAL = 60,
  ERROR = 50,
  WARN = 40,
  INFO = 30,
  DEBUG = 20,
  TRACE = 10,
}

export interface BunyanHttpHeaders {
  [key: string]: string;
}

export interface BunyanHttpRequestRecord {
  /**
   * The http method, like: GET, POST
   */
  method?: string;
  /**
   * The URL of request.
   */
  url?: string;
  /**
   * Object with headers of the request.
   */
  headers?: BunyanHttpHeaders;
  /**
   * The remote IP Address.
   */
  remoteAddress?: string;
  /**
   * The remote IP Port.
   */
  remotePort?: number;
  /** Other custom properties */
  [key: string]: any;
}

export interface BunyanLogRecord {
  /**
   * Added by Bunyan. Cannot be overridden. This is the Bunyan log format version (require('bunyan').LOG_VERSION). The log version is a single number. 0 is until I release a version "1.0.0" of node-bunyan. Thereafter, starting with 1, this will be incremented if there is any backward incompatible change to the log record format. Details will be in "CHANGES.md" (the change log).
   */
  v: number;
  /**
   * Added by Bunyan. Cannot be overridden.
   */
  level: Level;
  /**
   * Provided at Logger creation. You must specify a name for your logger when creating it. Typically this is the name of the service/app using Bunyan for logging.
   */
  name: string;
  /**
   * Provided or determined at Logger creation. You can specify your hostname at Logger creation or it will be retrieved vi os.hostname().
   */
  hostname: string;
  /**
   * Filled in automatically at Logger creation.
   */
  pid: number;
  /**
   * Added by Bunyan. Can be overridden. The date and time of the event in ISO 8601 Extended Format format and in UTC, as from Date.toISOstring().
   */
  time: string;
  /**
   * Every log.debug(...) et al call must provide a log message.
   */
  msg: string;
  /**
   * Object giving log call source info. This is added automatically by Bunyan if the "src: true" config option is given to the Logger. Never use in production as this is really slow.
   */
  src?: Object;
  /**
   * Object of http request.
   */
  req?: BunyanHttpRequestRecord;

  // And arbitrary other properties.
  [key: string]: any;
}
