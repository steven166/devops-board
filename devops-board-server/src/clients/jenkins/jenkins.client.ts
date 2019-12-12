
import { JenkinsBranchBuild } from "./jenkins-branch-build.model";
import { JenkinsRun } from "./jenkins-run.model";

export interface JenkinsClient {

  getRepoBuilds(projectId: string, repoId: string): Promise<JenkinsBranchBuild[]>;

  getBranchRun(projectId: string, repoId: string, branchId: string, buildId: number): Promise<JenkinsRun>;

  getPullRequestRun(projectId: string, repoId: string, pullRequestId: string, buildId: number): Promise<JenkinsRun>;

  getConsoleUrl(projectId: string, repoId: string, branchId: string, buildId: number): string;

  buildBranch(projectId: string, repoId: string, branchId: string): Promise<JenkinsRun>;

  buildPullRequest(projectId: string, repoId: string, pullRequestId: string): Promise<JenkinsRun>;
}
