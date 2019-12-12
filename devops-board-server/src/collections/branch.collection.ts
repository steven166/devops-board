import { Collection, CollectionEventType, CollectionOptions } from "@webscale/collection";
import { App, Logger } from "@webscale/core";
import { JSONSchema7 } from "json-schema";
import { filter, flatMap } from "rxjs/operators";
import { BitbucketBranch } from "../clients/bitbucket/bitbucket-branch.model";
import { BitbucketClient } from "../clients/bitbucket/bitbucket.client";
import { Buildable } from "./build.collection";
import { Project, projectCollectionOptions } from "./project.collection";
import { Repo, repoCollectionOptions } from "./repo.collection";

const logger = Logger.create("@devops/repo.collection");

export interface Branch extends Buildable {

  projectId: string;
  repoId: string;
  branchId: string;
  commit: string;
  isDefault: boolean;
  type: BranchType;
  links?: {
    project: string,
    repo: string
  };

}

export enum BranchType {
  Develop = "Develop",
  Master = "Master",
  Release = "Release",
  OldRelease = "OldRelease",
  Feature = "Feature",
  Bugfix = "Bugfix",
  Hotfix = "Hotfix",
  Other = "Other"
}

export const branches = "branches";

export const branchCollectionOptions: CollectionOptions = {
  singularName: "branch",
  parent: "repos",
  readonly: true
};

export interface BranchCollection extends Collection<Branch> {

  build(params: { projectId: string, repoId: string, branchId: string }): Promise<Branch>;

  createBranch(params: { projectId: string, repoId: string, branchId: string, ref: string }): Promise<Branch>;

}

export class BranchCollectionManager {

  private bitbucketClient: BitbucketClient;
  private branchCollection: Collection<Branch>;
  private repoCollection: Collection<Repo>;
  private projectCollection: Collection<Project>;
  private scheduler: any;

  public init(app: App): BranchCollectionManager {
    this.bitbucketClient = app.attributes.bitbucketClient;
    this.branchCollection = app.attributes.api.collection("branches", branchCollectionOptions);
    this.repoCollection = app.attributes.api.collection("repos", repoCollectionOptions);
    this.projectCollection = app.attributes.api.collection("projects", projectCollectionOptions);

    // Scan new repos directly
    this.repoCollection.watch(CollectionEventType.CREATED).subscribe(event => {
      logger.debug(`Refresh Branches for ${event.ids.projectId}/${event.ids.repoId}...`);
      let startTime = Date.now();
      this.refreshBranches(event.ids.projectId, event.ids.repoId).then(() => {
        logger.debug(
          `Refresh Branches for ${event.ids.projectId}/${event.ids.repoId} done (${Date.now() - startTime}ms)`);
      }).catch(e => {
        logger.error(`Refresh Branches failed for ${event.ids.projectId}/${event.ids.repoId}!`, e);
      });
    });

    this.scheduler = setInterval(() => {
      this.projectCollection.getAll().forEach(project => {
        this.repoCollection.getAll({ query: { projectId: project.projectId } }).forEach(repo => {
          logger.debug(`Refresh Branches for ${project.projectId}/${repo.repoId}...`);
          let startTime = Date.now();
          this.refreshBranches(project.projectId, repo.repoId).then(() => {
            logger.debug(`Refresh Branches for ${project.projectId}/${repo.repoId} done (${Date.now() - startTime}ms)`);
          }).catch(e => {
            logger.error(`Refresh Branches failed for ${project.projectId}/${repo.repoId}!`, e);
          });
        }).catch(e => logger.error(e));
      }).catch(e => logger.error(e));
    }, app.config.app.bitbucket.refreshInterval || 60000);

    this.branchCollection.action({ name: "createBranch" },
      async (params: { projectId: string, repoId: string, branchId: string, ref: string }) => {
        let newBitbucketBranch = await this.bitbucketClient.createBranch(params.projectId, params.repoId,
          params.branchId, params.ref);
        let latestReleaseBranch = await this.getLatestReleaseBranch(params.projectId, params.repoId);
        let newBranch = await this.branchCollection.saveItem({
          projectId: params.projectId,
          repoId: params.repoId,
          branchId: params.branchId,
          isDefault: false,
          commit: params.ref,
          type: this.getBranchType(params.branchId, latestReleaseBranch)
        });
        if (newBranch.type === BranchType.Release) {
          this.branchCollection.getAll().subscribe(branch => {
            if (branch.type === BranchType.Release) {
              if (branch.branchId !== params.branchId) {
                branch.type = BranchType.OldRelease;
                this.branchCollection.saveItem(branch).catch(e => {
                  logger.error(
                    `Failed to update branch type of ${branch.branchId} of ${branch.projectId}/${branch.repoId}`);
                });
              }
            }
          });
        }
        return newBranch;
      });
    return this;
  }

  public destory() {
    clearInterval(this.scheduler);
  }

  public async refreshBranches(projectId: string, repoId: string): Promise<void> {
    let done = false;
    let branchIds: string[] = [];
    let latestReleaseBranch = await this.getLatestReleaseBranch(projectId, repoId);
    for (let i = 0; i < 20; i++) {
      let branchPage = await this.bitbucketClient.getBranches(projectId, repoId, { page: i });
      if (branchPage && branchPage.values) {
        for (let bitbucketBranch of branchPage.values) {
          let branchType = this.getBranchType(bitbucketBranch.displayId, latestReleaseBranch);
          let branchId = bitbucketBranch.displayId;
          let repo = await this.repoCollection.getItem({ query: { projectId, repoId } });
          branchIds.push(branchId);
          let branch = await this.branchCollection.getItem(
            { query: { projectId, repoId, branchId } });
          if (branch) {
            if (this.isBranchDiff(bitbucketBranch, branch, branchType)) {
              // Save updated item
              await this.branchCollection.saveItem(
                this.convertBranch(projectId, repoId, bitbucketBranch, branchType, repo));
            }
          } else {
            // Save new item
            await this.branchCollection.saveItem(
              this.convertBranch(projectId, repoId, bitbucketBranch, branchType, repo));
          }
        }
      }
      if (!branchPage || branchPage.isLastPage) {
        done = true;
        break;
      }
    }

    // Delete remove items
    await (this.branchCollection.getAll({ query: { projectId, repoId } }) as any).pipe(filter((branch: any) => {
      return branchIds.indexOf(branch.branchId) === -1;
    })).pipe(flatMap((branch: any) => {
      return this.branchCollection.deleteItem(
        { query: { projectId, repoId, branchId: branch.branchId } });
    })).toPromise();

  }

  private getBranchType(branchId: string, releaseBranchName: string | undefined): BranchType {
    if (branchId === releaseBranchName) {
      return BranchType.Release;
    } else if (branchId === "master") {
      return BranchType.Master;
    } else if (branchId === "develop") {
      return BranchType.Develop;
    }
    if (branchId.indexOf("/") > -1) {
      let branchKey = branchId.split("/")[0].toLowerCase();
      if (branchKey === "release") {
        return BranchType.OldRelease;
      } else if (branchKey === "feature") {
        return BranchType.Feature;
      } else if (branchKey === "bugfix") {
        return BranchType.Bugfix;
      } else if (branchKey === "hotfix") {
        return BranchType.Hotfix;
      }
    }
    return BranchType.Other;
  }

  private async getLatestReleaseBranch(projectId: string, repoId: string): Promise<string | undefined> {
    let done = false;
    let versionSegments = [];
    for (let i = 0; i < 20; i++) {
      let branchPage = await this.bitbucketClient.getBranches(projectId, repoId, { page: i });
      if (branchPage && branchPage.values) {
        for (let bitbucketBranch of branchPage.values) {
          if (bitbucketBranch.displayId.indexOf("release/v") === 0) {
            let branchVersion = bitbucketBranch.displayId.split("release/v")[1];
            let segments = branchVersion.split(".").map(segment => {
              try {
                return parseInt(segment);
              } catch (e) {
                return segment;
              }
            });
            for (let i = 0; i < segments.length; i++) {
              if (versionSegments.length <= i || versionSegments[i] < segments[i]) {
                versionSegments = segments;
                break;
              } else if (versionSegments[i] === segments[i]) {
                continue;
              } else {
                break;
              }
            }
          }
        }
        if (!branchPage || branchPage.isLastPage) {
          done = true;
          break;
        }
      }
    }
    if (versionSegments.length > 0) {
      return "release/v" + versionSegments.join(".");
    }
    return undefined;
  }

  private isBranchDiff(bitbucketBranch: BitbucketBranch, branch: Branch, branchType: BranchType): boolean {
    return !(bitbucketBranch.displayId.toLowerCase() === branch.branchId &&
      bitbucketBranch.latestCommit === branch.commit &&
      bitbucketBranch.isDefault === branch.isDefault &&
      branchType === branch.type);
  }

  private convertBranch(projectId: string, repoId: string, bitbucketBranch: BitbucketBranch, type: BranchType, repo: Repo): Branch {
    return {
      projectId,
      repoId,
      branchId: bitbucketBranch.displayId.toLowerCase(),
      commit: bitbucketBranch.latestCommit,
      isDefault: bitbucketBranch.isDefault,
      type,
      links: repo.links,
      buildId: undefined,
      buildStatus: undefined,
      buildLinks: undefined
    };
  }

}
