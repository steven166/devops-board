import { BitbucketBranch } from "./bitbucket-branch.model";
import { BitbucketPageOptions } from "./bitbucket-page-options.model";
import { BitbucketPage } from "./bitbucket-page.model";
import { BitbucketProject } from "./bitbucket-project.model";
import { BitbucketPullRequestMerge } from "./bitbucket-pull-request-merge.model";
import { BitbucketPullRequest } from "./bitbucket-pull-request.model";
import { BitbucketRepo } from "./bitbucket-repo.model";

export interface BitbucketClient {

  getProjects(pageOptions?: BitbucketPageOptions): Promise<BitbucketPage<BitbucketProject>>;

  getRepositories(projectId: string, pageOptions?: BitbucketPageOptions): Promise<BitbucketPage<BitbucketRepo>>;

  getBranches(projectId: string, repoId: string, pageOptions?: BitbucketPageOptions): Promise<BitbucketPage<BitbucketBranch>>;

  getPullRequests(projectId: string, repoId: string, pageOptions?: BitbucketPageOptions): Promise<BitbucketPage<BitbucketPullRequest>>;

  getPullRequestMerge(projectId: string, repoId: string, pullRequestId): Promise<BitbucketPullRequestMerge>;

  createBranch(projectId: string, repoId: string, branchId: string, ref: string): Promise<BitbucketBranch>;

}
