import * as request from "request-promise";
import { JenkinsServerOptions } from "../../config/options";
import { JenkinsBranchBuild } from "./jenkins-branch-build.model";
import { JenkinsRun } from "./jenkins-run.model";
import { JenkinsClient } from "./jenkins.client";

export class JenkinsHttpClient implements JenkinsClient {

  constructor(private options: JenkinsServerOptions) {

  }

  public getRepoBuilds(projectId: string, repoId: string): Promise<JenkinsBranchBuild[]> {
    return request(this.options.url + `/blue/rest/organizations/jenkins/pipelines/${encodeURIComponent(projectId)}/${encodeURIComponent(repoId)}/branches/`, {
      auth: {
        user: this.options.username,
        pass: this.options.password
      },
      json: true,
      simple: false
    });
  }

  public getBranchRun(projectId: string, repoId: string, branchId: string, buildId: number): Promise<JenkinsRun> {
    return request(this.options.url + `/blue/rest/organizations/jenkins/pipelines/${encodeURIComponent(projectId)}/${encodeURIComponent(repoId)}/branches/${encodeURIComponent(branchId)}/runs/${encodeURIComponent(buildId + "")}/`, {
      auth: {
        user: this.options.username,
        pass: this.options.password
      },
      json: true,
      simple: false
    });
  }

  public getPullRequestRun(projectId: string, repoId: string, pullRequestId: string, buildId: number): Promise<JenkinsRun> {
    return request(this.options.url + `/blue/rest/organizations/jenkins/pipelines/${encodeURIComponent(projectId)}/${encodeURIComponent(repoId)}/branches/PR-${encodeURIComponent(pullRequestId)}/runs/${encodeURIComponent(buildId + "")}/`, {
      auth: {
        user: this.options.username,
        pass: this.options.password
      },
      json: true,
      simple: false
    });
  }

  public getConsoleUrl(projectId: string, repoId: string, branchId: string, buildId: number): string {
    return this.options.url + `/job/${encodeURIComponent(projectId)}/job/${encodeURIComponent(repoId)}/job/${encodeURIComponent(branchId)}/${encodeURIComponent(buildId + "")}/console`;
  }

  public buildBranch(projectId: string, repoId: string, branchId: string): Promise<JenkinsRun> {
    return request.post(this.options.url + `/blue/rest/organizations/jenkins/pipelines/${encodeURIComponent(projectId)}/${encodeURIComponent(repoId)}/branches/${encodeURIComponent(branchId)}/runs/`, {
      auth: {
        user: this.options.username,
        pass: this.options.password
      },
      simple: false,
      json: true,
      body: "{}",
      headers: [
        {
          name: "content-type",
          value: "application/json"
        }
      ]
    });
  }

  public buildPullRequest(projectId: string, repoId: string, pullRequestId: string): Promise<JenkinsRun> {
    return request.post(this.options.url + `/blue/rest/organizations/jenkins/pipelines/${encodeURIComponent(projectId)}/${encodeURIComponent(repoId)}/branches/PR-${encodeURIComponent(pullRequestId)}/runs/`, {
      auth: {
        user: this.options.username,
        pass: this.options.password
      },
      simple: false,
      json: true,
      body: "{}",
      headers: [
        {
          name: "content-type",
          value: "application/json"
        }
      ]
    });
  }
}
