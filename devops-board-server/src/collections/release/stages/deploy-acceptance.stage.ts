import { Collection } from "@webscale/collection";
import { App } from "@webscale/core";
import { BranchCollection } from "../../branch.collection";
import { BuildStatus } from "../../build.collection";
import { Project } from "../../project.collection";
import { Repo } from "../../repo.collection";
import { ReleaseCollectionManager } from "../release.collection-manager";
import { Release, ReleaseStages } from "../release.model";
import { Stage } from "./stage";

/**
 * Deploy to Acceptance stage
 * 1. check if the build of the develop branch is Success and restart Failed builds
 * 2. create release branch
 * 3. check if the build of the release branch is Success and restart Failed builds
 * @param release
 */
export class DeployAcceptanceStage extends Stage {

  public readonly stageId = ReleaseStages.DeployAcceptance;

  private projectCollection: Collection<Project>;
  private repoCollection: Collection<Repo>;
  private branchCollection: BranchCollection;
  private releaseCollection: Collection<Release>;

  public init(app: App): DeployAcceptanceStage {
    this.projectCollection = app.attributes.api.collection("projects");
    this.repoCollection = app.attributes.api.collection("repos");
    this.branchCollection = app.attributes.api.collection("branches");
    this.releaseCollection = app.attributes.api.collection("releases");
    return this;
  }

  public async loop(releaseManager: ReleaseCollectionManager, release: Release): Promise<void> {
    let releaseBranchName = `release/${release.releaseId}`;
    let developBranchName = "develop";
    if (!release.status) {
      release.status = {};
    }
    let stage = release.status.stages.find(stage => stage.stageId === this.stageId);
    if (!stage.repos) {
      stage.repos = [];
    }

    for (let projectId in release.repos) {
      if (release.repos[projectId]) {
        for (let repoId of release.repos[projectId]) {
          let releaseRepoStatus = stage.repos.find(s => s.projectId === projectId && s.repoId === repoId);
          if (!releaseRepoStatus) {
            releaseRepoStatus = {
              projectId,
              repoId,
              subStage: 0,
              retries: 0,
              buildRestarted: 0
            };
            stage.repos.push(releaseRepoStatus);
            await this.releaseCollection.saveItem(release);
          }
          try {
            // Ignore repo's that are marked as excluded
            if (release.excludeRepos && release.excludeRepos[projectId] && release.excludeRepos[projectId].indexOf(
              repoId) > -1) {
              continue;
            }

            let releaseBranch = await this.branchCollection.getItem(
              { query: { projectId, repoId, branchId: releaseBranchName } });
            if (!releaseBranch) {
              // Check build status of the develop branch
              let developBranch = await this.branchCollection.getItem(
                { query: { projectId, repoId, branchId: developBranchName } });
              if (!developBranch) {
                await releaseManager.warn(release,
                  `Repository ${projectId}/${repoId} doesn't have a ${developBranchName} branch`,
                  projectId, repoId);
              } else if (!developBranch.buildId) {
                await releaseManager.warn(release,
                  `No build found for the ${developBranch.branchId} branch of ${projectId}/${repoId}`, projectId,
                  repoId);
              } else {

                if (developBranch.buildStatus === BuildStatus.Succeed) {
                  // Loop for Develop Build Succeed
                  if (releaseRepoStatus.subStage !== 1) {
                    releaseRepoStatus.subStage = 1;
                    await this.releaseCollection.saveItem(release);
                  }
                  // Create release branch
                  try {
                    await releaseManager.log(release, `Create branch ${releaseBranchName}`, projectId, repoId);
                    await this.branchCollection.createBranch({
                      projectId,
                      repoId,
                      branchId: releaseBranchName,
                      ref: developBranch.commit
                    });
                  } catch (e) {
                    await releaseManager.warn(release, `Failed to create branch ${releaseBranchName}: ${e.message}`,
                      projectId,
                      repoId);
                  }

                } else if (developBranch.buildStatus === BuildStatus.Failed) {
                  // Loop for Develop Build Failed
                  if (releaseRepoStatus.subStage !== 0) {
                    releaseRepoStatus.subStage = 0;
                  }
                  if (releaseRepoStatus.buildRestarted < 5) {
                    releaseRepoStatus.buildRestarted++;
                    // Retry build
                    await this.branchCollection.build(developBranch);
                    await this.releaseCollection.saveItem(release);
                    if (releaseRepoStatus.buildRestarted > 2) {
                      await releaseManager.warn(release,
                        `Restart failed build for the ${developBranch} branch of ${projectId}/${repoId}`, projectId,
                        repoId);
                    }
                  }
                }
              }
            } else {
              if (releaseRepoStatus.subStage < 2) {
                releaseRepoStatus.subStage = 2;
                releaseRepoStatus.buildRestarted = 0;
                await this.releaseCollection.saveItem(release);
              }

              if (releaseBranch.buildStatus === BuildStatus.Succeed) {
                // Loop for Release Build Succeed
                if (releaseRepoStatus.subStage !== 3) {
                  releaseRepoStatus.subStage = 3;
                  await this.releaseCollection.saveItem(release);
                }

              } else if (releaseBranch.buildStatus === BuildStatus.Failed) {
                // Loop for Release Build Failed
                if (releaseRepoStatus.subStage !== 0) {
                  releaseRepoStatus.subStage = 0;
                }
                if (releaseRepoStatus.buildRestarted < 5) {
                  releaseRepoStatus.buildRestarted++;
                  // Retry build
                  await this.branchCollection.build(releaseBranch);
                  await this.releaseCollection.saveItem(release);
                  if (releaseRepoStatus.buildRestarted > 2) {
                    await releaseManager.warn(release,
                      `Restart failed build for the ${releaseBranchName} branch of ${projectId}/${repoId}`, projectId,
                      repoId);
                  }
                }

              }
            }
          } catch (e) {
            await releaseManager.warn(release, e.message, projectId, repoId);
            releaseRepoStatus.retries++;
            await this.releaseCollection.saveItem(release);
          }
        }
      }
    }

    let reposLeft = stage.repos.filter(repoStatus => repoStatus.subStage !== 3).length;
    if (reposLeft === 0) {
      await releaseManager.nextStage(release, ReleaseStages.ScheduleProduction);
    }
  }

}
