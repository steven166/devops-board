import { Collection } from "@webscale/collection";
import { App } from "@webscale/core";
import { Branch } from "../../branch.collection";
import { Project } from "../../project.collection";
import { Repo } from "../../repo.collection";
import { ReleaseCollectionManager } from "../release.collection-manager";
import { Release, ReleaseStages } from "../release.model";
import { Stage } from "./stage";

/**
 * Initialize a release
 */
export class InitStage extends Stage {

  public readonly stageId = ReleaseStages.Init;

  private projectCollection: Collection<Project>;
  private repoCollection: Collection<Repo>;
  private branchCollection: Collection<Branch>;

  public init(app: App): void {
    this.projectCollection = app.attributes.api.collection("projects");
    this.repoCollection = app.attributes.api.collection("repos");
    this.branchCollection = app.attributes.api.collection("branches");
  }

  public async loop(releaseManager: ReleaseCollectionManager, release: Release): Promise<void> {
    if (!release.name) {
      release.name = release.releaseId;
    }

    // Validate repositories
    let repoCount = 0;
    if (release.repos) {
      for (let projectId in release.repos) {
        if (release.repos[projectId]) {
          // Check if project exists
          let project = await this.projectCollection.getItem({ query: { projectId } });
          if (!project) {
            throw new Error(`Unknown project: ${projectId}`);
          }

          let repos = release.repos[projectId];
          repoCount += repos.length;
          for (let repoId in repos) {
            if (repos[repoId]) {
              // Check if repo exists
              let repo = await this.repoCollection.getItem({ query: { projectId, repoId } });
              if (!repo) {
                throw new Error(`Unknown repository: ${projectId}/${repoId}`);
              }
              // Check if develop branch exists
              let branch = await this.branchCollection.getItem(
                { query: { projectId, repoId, branch: "develop" } });
              if (!branch) {
                throw new Error(`Repository ${projectId}/${repoId} doesn't have a develop branch`);
              }
            }
          }
        }
      }
    }
    if (repoCount === 0) {
      throw new Error(`No repositories selected`);
    }

    return releaseManager.nextStage(release, ReleaseStages.CreateRelease);
  }

}
