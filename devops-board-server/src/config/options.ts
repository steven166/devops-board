import { PropertySource } from "@webscale/core";

declare module "@webscale/core/config/config" {
  interface Config {
    readonly app: AppProperties;
  }
}

export function defaultSource(): any {
  return {
    app: {
      bitbucket: {},
      jenkins: {},
      server: {}
    }
  };
}

export interface AppProperties {

  bitbucket: BitbucketOptions;
  jenkins: JenkinsOptions;
  server: ServerOptions;

}

export interface ClientOptions {

  url: string;
  username: string;
  password: string;

}

export interface BitbucketOptions extends ClientOptions {

  refreshInterval: number;
  projects: string[];

}

export interface JenkinsOptions {

  servers: { [project: string]: JenkinsServerOptions };
  refreshInterval: number;
  fullRefreshInterval: number;
}

export interface JenkinsServerOptions extends ClientOptions {

}

export interface ServerOptions {
  port: number;
}
