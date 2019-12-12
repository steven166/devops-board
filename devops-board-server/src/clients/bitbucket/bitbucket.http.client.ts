import * as request from "request-promise";
import { BitbucketOptions } from "../../config/options";
import { BitbucketBranch } from "./bitbucket-branch.model";
import { BitbucketPageOptions } from "./bitbucket-page-options.model";
import { BitbucketPage } from "./bitbucket-page.model";
import { BitbucketProject } from "./bitbucket-project.model";
import { BitbucketPullRequestMerge } from "./bitbucket-pull-request-merge.model";
import { BitbucketPullRequest } from "./bitbucket-pull-request.model";
import { BitbucketRepo } from "./bitbucket-repo.model";
import { BitbucketClient } from "./bitbucket.client";

export class BitbucketHttpClient implements BitbucketClient {

  constructor(private options: BitbucketOptions) {
  }

  public async getProjects(pageOptions?: BitbucketPageOptions): Promise<BitbucketPage<BitbucketProject>> {
    return request(this.options.url + "/rest/api/latest/projects", {
      auth: {
        user: this.options.username,
        pass: this.options.password
      },
      qs: {
        limit: pageOptions && pageOptions.limit || 25,
        start: (pageOptions && pageOptions.limit || 25) * (pageOptions && pageOptions.page || 0)
      },
      json: true,
      simple: false
    });
  }

  public async getRepositories(projectId: string, pageOptions?: BitbucketPageOptions): Promise<BitbucketPage<BitbucketRepo>> {
    return request(this.options.url + `/rest/api/latest/projects/${encodeURIComponent(projectId)}/repos`, {
      auth: {
        user: this.options.username,
        pass: this.options.password
      },
      qs: {
        limit: pageOptions && pageOptions.limit || 25,
        start: (pageOptions && pageOptions.limit || 25) * (pageOptions && pageOptions.page || 0)
      },
      json: true,
      simple: false
    });
  }

  public async getBranches(projectId: string, repoId: string, pageOptions?: BitbucketPageOptions): Promise<BitbucketPage<BitbucketBranch>> {
    return request(this.options.url + `/rest/api/latest/projects/${encodeURIComponent(projectId)}/repos/${encodeURIComponent(repoId)}/branches`, {
      auth: {
        user: this.options.username,
        pass: this.options.password
      },
      qs: {
        limit: pageOptions && pageOptions.limit || 25,
        start: (pageOptions && pageOptions.limit || 25) * (pageOptions && pageOptions.page || 0)
      },
      json: true,
      simple: false
    });
  }

  public async getPullRequests(projectId: string, repoId: string, pageOptions?: BitbucketPageOptions): Promise<BitbucketPage<BitbucketPullRequest>> {
    return request(this.options.url + `/rest/api/latest/projects/${encodeURIComponent(projectId)}/repos/${encodeURIComponent(repoId)}/pull-requests`, {
      auth: {
        user: this.options.username,
        pass: this.options.password
      },
      qs: {
        limit: pageOptions && pageOptions.limit || 25,
        start: (pageOptions && pageOptions.limit || 25) * (pageOptions && pageOptions.page || 0)
      },
      json: true,
      simple: false
    });
  }

  public async getPullRequestMerge(projectId: string, repoId: string, pullRequestId): Promise<BitbucketPullRequestMerge> {
    return request(this.options.url + `/rest/api/latest/projects/${encodeURIComponent(projectId)}/repos/${encodeURIComponent(repoId)}/pull-requests/${encodeURIComponent(pullRequestId)}/merge`, {
      auth: {
        user: this.options.username,
        pass: this.options.password
      },
      json: true,
      simple: false
    });
  }

  public async createBranch(projectId: string, repoId: string, branchId: string, ref: string): Promise<BitbucketBranch> {
    return request(this.options.url + `/rest/api/latest/projects/${encodeURIComponent(projectId)}/repos/${encodeURIComponent(repoId)}/branches`, {
      auth: {
        user: this.options.username,
        pass: this.options.password
      },
      json: true,
      simple: false,
      body: {
        name: branchId,
        startPoint: ref
      }
    });
  }

}
