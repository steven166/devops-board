import { JenkinsBranchBuild } from "./jenkins-branch-build.model";
import { JenkinsRun } from "./jenkins-run.model";
import { JenkinsClient } from "./jenkins.client";

export class JenkinsMockClient implements JenkinsClient {

  public async getRepoBuilds(projectId: string, repoId: string): Promise<JenkinsBranchBuild[]> {
    return [];
  }

  public async getBranchRun(projectId: string, repoId: string, branchId: string, buildId: number): Promise<JenkinsRun> {
    return null;
  }

  public async getPullRequestRun(projectId: string, repoId: string, pullRequestId: string, buildId: number): Promise<JenkinsRun> {
    return null;
  }

  public getConsoleUrl(projectId: string, repoId: string, branchId: string, buildId: number): string {
    return "";
  }

  public async buildBranch(projectId: string, repoId: string, branchId: string): Promise<JenkinsRun> {
    return null;
  }

  public async buildPullRequest(projectId: string, repoId: string, pullRequestId: string): Promise<JenkinsRun> {
    return null;
  }
}
