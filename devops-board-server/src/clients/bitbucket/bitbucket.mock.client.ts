import { BitbucketBranch } from "./bitbucket-branch.model";
import { BitbucketPageOptions } from "./bitbucket-page-options.model";
import { BitbucketPage } from "./bitbucket-page.model";
import { BitbucketClient } from "./bitbucket.client";
import { BitbucketProject } from "./bitbucket-project.model";
import { BitbucketPullRequestMerge } from "./bitbucket-pull-request-merge.model";
import { BitbucketPullRequest } from "./bitbucket-pull-request.model";
import { BitbucketRepo } from "./bitbucket-repo.model";

export class BitbucketMockClient implements BitbucketClient {

  public async getProjects(pageOptions?: BitbucketPageOptions): Promise<BitbucketPage<BitbucketProject>> {
    return {
      start: 0,
      nextPageStart: 0,
      size: 0,
      limit: 1,
      isLastPage: true,
      values: []
    };
  }

  public async getBranches(projectId: string, repoId: string, pageOptions?: BitbucketPageOptions): Promise<BitbucketPage<BitbucketBranch>> {
    return {
      start: 0,
      nextPageStart: 0,
      size: 0,
      limit: 1,
      isLastPage: true,
      values: []
    };
  }

  public async getRepositories(projectId: string, pageOptions?: BitbucketPageOptions): Promise<BitbucketPage<BitbucketRepo>> {
    return {
      start: 0,
      nextPageStart: 0,
      size: 0,
      limit: 1,
      isLastPage: true,
      values: []
    };
  }

  public async getPullRequestMerge(projectId: string, repoId: string, pullRequestId): Promise<BitbucketPullRequestMerge> {
    return null;
  }

  public async getPullRequests(projectId: string, repoId: string, pageOptions?: BitbucketPageOptions): Promise<BitbucketPage<BitbucketPullRequest>> {
    return null;
  }

  public createBranch(projectId: string, repoId: string, branchId: string, ref: string): Promise<BitbucketBranch> {
    return undefined;
  }

}
