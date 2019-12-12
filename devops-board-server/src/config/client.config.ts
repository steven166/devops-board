import { App, Module } from "@webscale/core";
import { BitbucketHttpClient } from "../clients/bitbucket/bitbucket.http.client";
import { JenkinsHttpClient } from "../clients/jenkins/jenkins.http.client";

export class ClientConfig implements Module {

  public readonly name: string = "client";

  public async load(app: App): Promise<void> {
    app.attributes.bitbucketClient = new BitbucketHttpClient(app.config.app.bitbucket);
    app.attributes.jenkinsClients = {};
    if (app.config.app.jenkins && app.config.app.jenkins.servers) {
      for (let projectId in app.config.app.jenkins.servers) {
        let jenkinsServerOptions = app.config.app.jenkins.servers[projectId];
        if (jenkinsServerOptions) {
          app.attributes.jenkinsClients[projectId] = new JenkinsHttpClient(jenkinsServerOptions);
        }
      }
    }
  }

}
