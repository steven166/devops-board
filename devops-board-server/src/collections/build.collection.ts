import { Collection, CollectionEventType } from "@webscale/collection";
import { App, BadRequestError, Logger, LogLevel, NotFoundError } from "@webscale/core";
import { delay, filter } from "rxjs/operators";
import { BitbucketClient } from "../clients/bitbucket/bitbucket.client";
import { JenkinsResult } from "../clients/jenkins/jenkins-result.model";
import { JenkinsState } from "../clients/jenkins/jenkins-state.model";
import { JenkinsClient } from "../clients/jenkins/jenkins.client";
import { Branch, branchCollectionOptions } from "./branch.collection";
import { Project, projectCollectionOptions } from "./project.collection";
import { PullRequest, pullRequestCollectionOptions } from "./pull-request.collection";
import { Repo, repoCollectionOptions } from "./repo.collection";

const logger = Logger.create("@devops/build.collection");

export interface Buildable {

  buildId?: number;
  buildStatus?: BuildStatus;
  buildLinks?: {
    open?: string;
    retry?: string;
  };

}

export enum BuildStatus {

  Unknown = "Unknown",
  Pending = "Pending",
  Progress = "Progress",
  Succeed = "Succeed",
  Failed = "Failed"

}

export class BuildCollectionManager {

  private bitbucketClient: BitbucketClient;
  private branchCollection: Collection<Branch>;
  private pullRequestCollection: Collection<PullRequest>;
  private repoCollection: Collection<Repo>;
  private projectCollection: Collection<Project>;
  private jenkinsClients: { [projectId: string]: JenkinsClient };
  private buildSheduler: any;
  private runAllSheduler: any;
  private runNonDoneSheduler: any;

  public init(app: App): BuildCollectionManager {
    this.bitbucketClient = app.attributes.bitbucketClient;
    this.branchCollection = app.attributes.api.collection("branches", branchCollectionOptions);
    this.pullRequestCollection = app.attributes.api.collection("pull-requests", pullRequestCollectionOptions);
    this.repoCollection = app.attributes.api.collection("repos", repoCollectionOptions);
    this.projectCollection = app.attributes.api.collection("projects", projectCollectionOptions);
    this.jenkinsClients = app.attributes.jenkinsClients;

    // Watch for changes in branches
    this.branchCollection.watch(CollectionEventType.UPDATED).subscribe(event => {
      logger.debug(`Refresh Build Status for ${event.ids.projectId}/${event.ids.repoId}/${event.ids.branchId}...`);
      let startTime = Date.now();
      this.refreshBranchRun(event.after).then(() => {
        logger.debug(
          `Refresh Build Status for ${event.ids.projectId}/${event.ids.repoId}/${event.ids.branchId} done (${Date.now() - startTime}ms)`);
      }).catch(e => {
        logger.error(
          `Refresh Build Status failed for ${event.ids.projectId}/${event.ids.repoId}/${event.ids.branchId}!`, e);
      });
    });

    // Watch for changes in Pull Requests
    this.pullRequestCollection.watch(CollectionEventType.UPDATED).subscribe(event => {
      logger.debug(
        `Refresh Pull Request Status for ${event.ids.projectId}/${event.ids.repoId}/${event.ids.pullRequestId}...`);
      let startTime = Date.now();
      this.refreshPullRequestRun(event.after).then(() => {
        logger.debug(
          `Refresh Pull Request for ${event.ids.projectId}/${event.ids.repoId}/${event.ids.pullRequestId} done (${Date.now() - startTime}ms)`);
      }).catch(e => {
        logger.error(
          `Refresh Pull Request failed for ${event.ids.projectId}/${event.ids.repoId}/${event.ids.pullRequestId}!`,
          e);
      });
    });

    (this.repoCollection.watch(CollectionEventType.CREATED) as any).pipe(delay(1000)).subscribe(event => {
      logger.debug(`Refresh Build for ${event.ids.projectId}/${event.ids.repoId}...`);
      let startTime = Date.now();
      this.refreshBuilds(event.ids.projectId, event.ids.repoId).then(() => {
        logger.debug(`Refresh Build for ${event.ids.projectId}/${event.ids.repoId} done (${Date.now() - startTime}ms)`);
      }).catch(e => {
        logger.error(`Refresh Build failed for ${event.ids.projectId}/${event.ids.repoId}!`, e);
      });
    });

    this.buildSheduler = setInterval(() => {
      this.projectCollection.getAll().forEach(project => {
        this.repoCollection.getAll({ query: { projectId: project.projectId } }).forEach(repo => {
          logger.debug(`Refresh Builds for ${project.projectId}/${repo.repoId}...`);
          let startTime = Date.now();
          this.refreshBuilds(project.projectId, repo.repoId).then(() => {
            logger.debug(
              `Refresh Builds for ${project.projectId}/${repo.repoId} done (${Date.now() - startTime}ms)`);
          }).catch(e => {
            logger.error(`Refresh Builds failed for ${project.projectId}/${repo.repoId}!`, e);
          });
        }).catch(e => logger.error(e));
      }).catch(e => logger.error(e));
    }, app.config.app.jenkins.refreshInterval || 60000);

    this.runNonDoneSheduler = setInterval(() => {
      this.projectCollection.getAll().forEach(project => {
        this.repoCollection.getAll({ query: { projectId: project.projectId } }).forEach(repo => {
          (this.branchCollection.getAll({ query: { projectId: project.projectId, repoId: repo.repoId } }) as any)
            .pipe(filter((branch: Branch) => branch.buildStatus !== BuildStatus.Succeed)).forEach(branch => {
            logger.debug(`Refresh Build status for ${project.projectId}/${repo.repoId}/${branch.branchId}...`);
            let startTime = Date.now();
            this.refreshBranchRun(branch).then(() => {
              logger.debug(
                `Refresh Build status for ${project.projectId}/${repo.repoId}/${branch.branchId} done (${Date.now() - startTime}ms)`);
            }).catch(e => {
              logger.error(`Refresh Build status failed for ${project.projectId}/${repo.repoId}/${branch.branchId}!`,
                e);
            });
          }).catch(e => logger.error(e));
          (this.pullRequestCollection.getAll({ query: { projectId: project.projectId, repoId: repo.repoId } }) as any)
            .pipe(filter((pullRequest: PullRequest) => pullRequest.buildStatus !== BuildStatus.Succeed))
            .forEach(pullRequest => {
              logger.debug(
                `Refresh Pull Request status for ${project.projectId}/${repo.repoId}/${pullRequest.pullRequestId}...`);
              let startTime = Date.now();
              this.refreshPullRequestRun(pullRequest).then(() => {
                logger.debug(
                  `Refresh Pull Request status for ${project.projectId}/${repo.repoId}/${pullRequest.pullRequestId} done (${Date.now() - startTime}ms)`);
              }).catch(e => {
                logger.error(
                  `Refresh Pull Request status failed for ${project.projectId}/${repo.repoId}/${pullRequest.pullRequestId}!`,
                  e);
              });
            }).catch(e => logger.error(e));
        }).catch(e => logger.error(e));
      }).catch(e => logger.error(e));
    }, app.config.app.jenkins.refreshInterval || 60000);

    this.runAllSheduler = setInterval(() => {
      this.projectCollection.getAll().forEach(project => {
        this.repoCollection.getAll({ query: { projectId: project.projectId } }).forEach(repo => {
          this.branchCollection.getAll({ query: { projectId: project.projectId, repoId: repo.repoId } })
            .forEach(branch => {
              logger.debug(`Refresh Full Build status for ${project.projectId}/${repo.repoId}/${branch.branchId}...`);
              let startTime = Date.now();
              this.refreshBranchRun(branch).then(() => {
                logger.debug(
                  `Refresh Full Build status for ${project.projectId}/${repo.repoId}/${branch.branchId} done (${Date.now() - startTime}ms)`);
              }).catch(e => {
                logger.error(
                  `Refresh Full Build status failed for ${project.projectId}/${repo.repoId}/${branch.branchId}!`, e);
              });
            }).catch(e => logger.error(e));
          this.pullRequestCollection.getAll({ query: { projectId: project.projectId, repoId: repo.repoId } })
            .forEach(pullRequest => {
              logger.debug(
                `Refresh Full Build status for ${project.projectId}/${repo.repoId}/${pullRequest.pullRequestId}...`);
              let startTime = Date.now();
              this.refreshPullRequestRun(pullRequest).then(() => {
                logger.debug(
                  `Refresh Full Build status for ${project.projectId}/${repo.repoId}/${pullRequest.pullRequestId} done (${Date.now() - startTime}ms)`);
              }).catch(e => {
                logger.error(
                  `Refresh Full Build status failed for ${project.projectId}/${repo.repoId}/${pullRequest.pullRequestId}!`,
                  e);
              });
            }).catch(e => logger.error(e));
        }).catch(e => logger.error(e));
      }).catch(e => logger.error(e));
    }, app.config.app.jenkins.fullRefreshInterval || 5 * 60000);
    this.routes(app);
    return this;
  }

  public destory() {
    clearInterval(this.buildSheduler);
    clearInterval(this.runNonDoneSheduler);
    clearInterval(this.runAllSheduler);
  }

  public routes(app: App) {
    this.branchCollection.action({ name: "build", method: "POST" },
      async (params: { projectId: string, repoId: string, branchId: string }) => {
        let branch = await this.branchCollection.getItem(
          { query: { projectId: params.projectId, repoId: params.repoId, branchId: params.branchId } });
        if (!branch) {
          throw new NotFoundError(`Branch not found`);
        }
        if (branch.buildId) {
          let jenkinsClient = this.jenkinsClients[branch.projectId];
          if (!jenkinsClient) {
            throw new BadRequestError("No build server configured for this project");
          }
          let jenkinsRun = await jenkinsClient.buildBranch(branch.projectId, branch.repoId, branch.branchId);
          branch.buildId = parseInt(jenkinsRun.id);
          branch.buildLinks = {
            open: jenkinsClient.getConsoleUrl(branch.projectId, branch.repoId, branch.branchId, branch.buildId),
            retry: branch.buildLinks && branch.buildLinks.retry
          };
          branch.buildStatus = this.convertBuildStatus(jenkinsRun.state, jenkinsRun.result);
          await this.branchCollection.saveItem(branch);

          return branch;
        } else {
          throw new BadRequestError("No Build exists for this branch");
        }
      });

    this.pullRequestCollection.action({ name: "build", method: "POST" },
      async (params: { projectId: string, repoId: string, pullRequestId: string }) => {
        let pullRequest = await this.pullRequestCollection.getItem(
          { query: { projectId: params.projectId, repoId: params.repoId, pullRequestId: params.pullRequestId } });
        if (!pullRequest) {
          throw new NotFoundError(`Pull Request not found`);
        }
        if (pullRequest.buildId) {
          let jenkinsClient = this.jenkinsClients[pullRequest.projectId];
          if (!jenkinsClient) {
            throw new BadRequestError("No build server configured for this project");
          }
          let jenkinsRun = await jenkinsClient.buildPullRequest(pullRequest.projectId, pullRequest.repoId,
            pullRequest.pullRequestId);
          pullRequest.buildId = parseInt(jenkinsRun.id);
          pullRequest.buildLinks = {
            open: jenkinsClient.getConsoleUrl(pullRequest.projectId, pullRequest.repoId, jenkinsRun.pipeline,
              pullRequest.buildId),
            retry: pullRequest.buildLinks && pullRequest.buildLinks.retry
          };
          pullRequest.buildStatus = this.convertBuildStatus(jenkinsRun.state, jenkinsRun.result);
          await this.pullRequestCollection.saveItem(pullRequest);

          return pullRequest;
        } else {
          throw new BadRequestError("No Build exists for this pull-request");
        }
      });
  }

  private async refreshBuilds(projectId: string, repoId: string): Promise<void> {
    let jenkinsClient = this.jenkinsClients[projectId];
    if (!jenkinsClient) {
      logger.warn(`No Jenkins client for ${projectId}`);
      return;
    }
    let builds = await jenkinsClient.getRepoBuilds(projectId, repoId);

    for (let build of builds) {
      let branchId = build.displayName;
      if (build.latestRun && build.latestRun.id) {
        let buildId = parseInt(build.latestRun.id);
        let branch = await this.branchCollection.getItem(
          { query: { projectId, repoId, branchId } });
        if (branch && branch.buildId !== buildId) {
          branch.buildId = buildId;
          branch.buildLinks = {
            open: jenkinsClient.getConsoleUrl(branch.projectId, branch.repoId, build.displayName, branch.buildId),
            retry: build._links && build._links.runs && build._links.runs.href
          };
          await this.branchCollection.saveItem(branch);
        } else if (build.displayName.indexOf("PR-") === 0) {
          let pullRequestId = build.displayName.substr(3);
          let pullRequest = await this.pullRequestCollection.getItem({ query: { projectId, repoId, pullRequestId } });
          if (pullRequest && pullRequest.buildId !== buildId) {
            pullRequest.buildId = buildId;
            pullRequest.buildLinks = {
              open: jenkinsClient.getConsoleUrl(pullRequest.projectId, pullRequest.repoId, build.displayName,
                pullRequest.buildId),
              retry: build._links && build._links.runs && build._links.runs.href
            };
            await this.pullRequestCollection.saveItem(pullRequest);
          }
        }
      }
    }
  }

  private async refreshBranchRun(branch: Branch): Promise<void> {
    let jenkinsClient = this.jenkinsClients[branch.projectId];
    if (!jenkinsClient) {
      logger.warn(`No Jenkins client for ${branch.projectId}`);
      return;
    }

    if (branch.buildId) {
      let jenkinsRun = await jenkinsClient.getBranchRun(branch.projectId, branch.repoId, branch.branchId,
        branch.buildId);
      if (jenkinsRun.commitId === branch.commit) {
        let buildStatus = this.convertBuildStatus(jenkinsRun.state, jenkinsRun.result);
        if (branch.buildStatus !== buildStatus) {
          branch.buildStatus = buildStatus;
          await this.branchCollection.saveItem(branch);
        }
      }
    }
  }

  private async refreshPullRequestRun(pullRequest: PullRequest): Promise<void> {
    let jenkinsClient = this.jenkinsClients[pullRequest.projectId];
    if (!jenkinsClient) {
      logger.warn(`No Jenkins client for ${pullRequest.projectId}`);
      return;
    }

    if (pullRequest.buildId) {
      let jenkinsRun = await jenkinsClient.getPullRequestRun(pullRequest.projectId, pullRequest.repoId,
        pullRequest.pullRequestId, pullRequest.buildId);
      let jenkinsCommits = jenkinsRun.commitId && jenkinsRun.commitId.split("+").filter(commit => !!commit);
      if (jenkinsCommits && jenkinsCommits.indexOf(pullRequest.commit) > -1) {
        let buildStatus = this.convertBuildStatus(jenkinsRun.state, jenkinsRun.result);
        if (pullRequest.buildStatus !== buildStatus) {
          pullRequest.buildStatus = buildStatus;
          await this.pullRequestCollection.saveItem(pullRequest);
        }
      }
    }
  }

  private convertBuildStatus(state: JenkinsState, result: JenkinsResult): BuildStatus {
    logger.debug(`status: ${state}, result: ${result}`);
    let buildStatus = BuildStatus.Unknown;
    switch (state) {
      case JenkinsState.RUNNING:
        buildStatus = BuildStatus.Progress;
        break;
      case JenkinsState.QUEUED:
        buildStatus = BuildStatus.Pending;
        break;
      case JenkinsState.FINISHED:
        switch (result) {
          case JenkinsResult.SUCCESS:
            buildStatus = BuildStatus.Succeed;
            break;
          default:
            buildStatus = BuildStatus.Failed;
            break;
        }
    }
    return buildStatus;
  }

}
