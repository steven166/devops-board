import { Collection, CollectionEventType, CollectionOptions } from "@webscale/collection";
import { App, Logger, LogLevel } from "@webscale/core";
import { filter, flatMap } from "rxjs/operators";
import { BitbucketPullRequestMerge } from "../clients/bitbucket/bitbucket-pull-request-merge.model";
import {
  BitbucketAuthor,
  BitbucketAuthorStatus,
  BitbucketMergeOutcome,
  BitbucketPullRequest,
  BitbucketPullRequestState
} from "../clients/bitbucket/bitbucket-pull-request.model";
import { BitbucketClient } from "../clients/bitbucket/bitbucket.client";
import { Buildable } from "./build.collection";
import { Project, projectCollectionOptions } from "./project.collection";
import { Repo, repoCollectionOptions } from "./repo.collection";

const logger = Logger.create("@devops/pull-request.collection");

export interface PullRequest extends Buildable {

  projectId: string;
  repoId: string;
  pullRequestId: string;
  title: string;
  state: PullRequestState;
  type: PullRequestType;
  commit: string;
  fromBranch: string;
  toBranch: string;
  version: number;
  openTasks: number;
  conflict: boolean;
  author: PullRequestAuthor;
  reviewers: PullRequestReviewer[];
  problems: string[];
  mergable: boolean;
  links: {
    project: string;
    repo: string;
    pullRequest: string;
  };

}

export enum PullRequestState {
  Open = "Open",
  Merged = "Merged",
  Superseded = "Superseded",
  Declined = "Declined"
}

export enum PullRequestType {
  Release = "Release",
  Feature = "Feature",
  Bugfix = "Bugfix",
  Hotfix = "Hotfix",
  Other = "Other"
}

export interface PullRequestAuthor {
  userId: string;
  name: string;
  email: string;
  picture: string;
}

export interface PullRequestReviewer extends PullRequestAuthor {
  status: PullRequestReviewerStatus;
}

export enum PullRequestReviewerStatus {
  Approved = "Approved",
  Unapproved = "Unapproved",
  NeedsWork = "NeedsWork"
}

export const pullRequest = "pullRequest";

export const pullRequestCollectionOptions: CollectionOptions = {
  singularName: "pullRequest",
  parent: "repos",
  readonly: true
};

export class PullRequestCollectionManager {

  private bitbucketClient: BitbucketClient;
  private pullRequestCollection: Collection<PullRequest>;
  private repoCollection: Collection<Repo>;
  private projectCollection: Collection<Project>;
  private scheduler: any;

  public init(app: App): PullRequestCollectionManager {
    this.bitbucketClient = app.attributes.bitbucketClient;
    this.pullRequestCollection = app.attributes.api.collection("pull-requests", pullRequestCollectionOptions);
    this.repoCollection = app.attributes.api.collection("repos", repoCollectionOptions);
    this.projectCollection = app.attributes.api.collection("projects", projectCollectionOptions);

    // Scan new repos directly
    this.repoCollection.watch(CollectionEventType.CREATED).subscribe(event => {
      logger.debug(`Refresh Pull-Requests for ${event.ids.projectId}/${event.ids.repoId}...`);
      let startTime = Date.now();
      this.refreshPullRequests(event.ids.projectId, event.ids.repoId).then(() => {
        logger.debug(
          `Refresh Pull-Requests for ${event.ids.projectId}/${event.ids.repoId} done (${Date.now() - startTime}ms)`);
      }).catch(e => {
        logger.error(`Refresh Pull-Requests failed for ${event.ids.projectId}/${event.ids.repoId}!`, e);
      });
    });

    this.scheduler = setInterval(() => {
      this.projectCollection.getAll().forEach(project => {
        this.repoCollection.getAll({ query: { projectId: project.projectId } }).forEach(repo => {
          logger.debug(`Refresh Pull-Requests for ${project.projectId}/${repo.repoId}...`);
          let startTime = Date.now();
          this.refreshPullRequests(project.projectId, repo.repoId).then(() => {
            logger.debug(
              `Refresh Pull-Requests for ${project.projectId}/${repo.repoId} done (${Date.now() - startTime}ms)`);
          }).catch(e => {
            logger.error(`Refresh Pull-Requests failed for ${project.projectId}/${repo.repoId}!`, e);
          });
        }).catch(e => logger.error(e));
      }).catch(e => logger.error(e));
    }, app.config.app.bitbucket.refreshInterval || 60000);
    return this;
  }

  public destory() {
    clearInterval(this.scheduler);
  }

  public async refreshPullRequests(projectId: string, repoId: string): Promise<void> {
    let done = false;
    let pullRequestIds: string[] = [];
    for (let i = 0; i < 20; i++) {
      let pullRequestPage = await this.bitbucketClient.getPullRequests(projectId, repoId, { page: i });
      if (pullRequestPage && pullRequestPage.values) {
        for (let bitbucketPullRequest of pullRequestPage.values) {
          let pullRequestType = this.getPullRequestType(bitbucketPullRequest);
          let pullRequestId = bitbucketPullRequest.id + "";
          let pullRequestMergeStatus = await this.bitbucketClient.getPullRequestMerge(projectId, repoId, pullRequestId);
          pullRequestIds.push(pullRequestId);
          let pullRequest = await this.pullRequestCollection.getItem(
            { query: { projectId, repoId, pullRequestId } });
          if (pullRequest) {
            if (this.isPullRequestDiff(bitbucketPullRequest, pullRequest, pullRequestType, pullRequestMergeStatus)) {
              // Save updated item
              await this.pullRequestCollection.saveItem(
                this.convertPullRequest(projectId, repoId, bitbucketPullRequest, pullRequestType,
                  pullRequestMergeStatus, pullRequest));
            }
          } else {
            // Save new item
            await this.pullRequestCollection.saveItem(
              this.convertPullRequest(projectId, repoId, bitbucketPullRequest, pullRequestType, pullRequestMergeStatus,
                pullRequest));
          }
        }
      }
      if (!pullRequestPage || pullRequestPage.isLastPage) {
        done = true;
        break;
      }
    }

    // Delete remove items
    await (this.pullRequestCollection.getAll({ query: { projectId, repoId } }) as any).pipe(
      filter((pullRequest: any) => {
        return pullRequestIds.indexOf(pullRequest.pullRequestId) === -1;
      })).pipe(flatMap((pullRequest: any) => {
      return this.pullRequestCollection.deleteItem(
        { query: { projectId, repoId, pullRequestId: pullRequest.pullRequestId } });
    })).toPromise();

  }

  private getPullRequestType(pullRequest: BitbucketPullRequest): PullRequestType {
    if (pullRequest.toRef && pullRequest.toRef.displayId) {
      let branchId = pullRequest.toRef.displayId;
      if (branchId.startsWith("release/")) {
        return PullRequestType.Bugfix;
      } else if (branchId === "master") {
        if (pullRequest.fromRef && pullRequest.fromRef.displayId && pullRequest.fromRef.displayId.startsWith(
          "release/")) {
          return PullRequestType.Release;
        }
        return PullRequestType.Hotfix;
      } else if (branchId === "develop") {
        return PullRequestType.Feature;
      }
    }
    return PullRequestType.Other;
  }

  private isPullRequestDiff(bitbucketPullRequest: BitbucketPullRequest, pullRequest: PullRequest, pullRequestType: PullRequestType, pullRequestMerge: BitbucketPullRequestMerge): boolean {
    return !(bitbucketPullRequest.id + "" === pullRequest.pullRequestId &&
      (bitbucketPullRequest.toRef && bitbucketPullRequest.toRef.displayId) === pullRequest.toBranch &&
      (bitbucketPullRequest.fromRef && bitbucketPullRequest.fromRef.displayId) === pullRequest.fromBranch &&
      (bitbucketPullRequest.fromRef && bitbucketPullRequest.fromRef.latestCommit) === pullRequest.commit &&
      bitbucketPullRequest.title === pullRequest.title &&
      this.convertBitbucketPullRequestState(bitbucketPullRequest.state) === pullRequest.state &&
      bitbucketPullRequest.version === pullRequest.version &&
      (bitbucketPullRequest.properties && bitbucketPullRequest.properties.openTaskCount) === pullRequest.openTasks &&
      this.hasConflict(bitbucketPullRequest) === pullRequest.conflict &&
      pullRequestType === pullRequest.type &&
      !this.areUsersDiff([bitbucketPullRequest.author], [pullRequest.author]) &&
      !this.areUsersDiff(bitbucketPullRequest.reviewers, pullRequest.reviewers) &&
      pullRequestMerge.canMerge === pullRequest.mergable &&
      !this.areProblemsDiff(pullRequestMerge, pullRequest));
  }

  private areProblemsDiff(merge: BitbucketPullRequestMerge, pullRequest: PullRequest): boolean {
    let vetoes = merge.vetoes || [];
    if (vetoes.length !== pullRequest.problems.length) {
      return true;
    }
    for (let vetoe of vetoes) {
      if (pullRequest.problems.indexOf(vetoe.summaryMessage) === -1) {
        return true;
      }
    }
    return false;
  }

  private areUsersDiff(bitbucketUsers: BitbucketAuthor[], users: PullRequestAuthor[]): boolean {
    if (bitbucketUsers.length !== users.length) {
      return true;
    }
    for (let bitbucketUser of bitbucketUsers) {
      let user = users.find(u => u.userId === bitbucketUser.user.slug);
      if (!user) {
        return true;
      }
      if (user.name !== bitbucketUser.user.displayName && user.email !== bitbucketUser.user.emailAddress) {
        return true;
      }
      let userLink = bitbucketUser.user.links && bitbucketUser.user.links.self && bitbucketUser.user.links.self[0] && bitbucketUser.user.links.self[0].href;
      if (userLink) {
        userLink += "/avatar.png";
      }
      if (userLink !== user.picture) {
        return true;
      }
      let status = (user as PullRequestReviewer).status;
      if (status) {
        if (status !== this.convertBitbucketPullRequestReviewerStatus(bitbucketUser.status)) {
          return true;
        }
      }
    }
    return false;
  }

  private convertBitbucketPullRequestState(bitbucketState: BitbucketPullRequestState): PullRequestState {
    switch (bitbucketState) {
      case BitbucketPullRequestState.DECLINED:
        return PullRequestState.Declined;
      case BitbucketPullRequestState.MERGED:
        return PullRequestState.Merged;
      case BitbucketPullRequestState.OPEN:
        return PullRequestState.Open;
      case BitbucketPullRequestState.SUPERSEDED:
        return PullRequestState.Superseded;
    }
    return undefined;
  }

  private convertBitbucketPullRequestReviewerStatus(state: BitbucketAuthorStatus): PullRequestReviewerStatus {
    switch (state) {
      case BitbucketAuthorStatus.APPROVED:
        return PullRequestReviewerStatus.Approved;
      case BitbucketAuthorStatus.NEEDS_WORK:
        return PullRequestReviewerStatus.NeedsWork;
      case BitbucketAuthorStatus.UNAPPROVED:
        return PullRequestReviewerStatus.Unapproved;
    }
    return undefined;
  }

  private hasConflict(bitbucketPullRequest: BitbucketPullRequest): boolean {
    if (bitbucketPullRequest.properties && bitbucketPullRequest.properties.mergeResult) {
      return bitbucketPullRequest.properties.mergeResult.outcome !== BitbucketMergeOutcome.CLEAN;
    }
    return true;
  }

  private convertPullRequest(projectId: string, repoId: string, bitbucketPullRequest: BitbucketPullRequest, pullRequestType: PullRequestType, bitbucketPullRequestMerge: BitbucketPullRequestMerge, previousPullRequest: PullRequest): PullRequest {
    let pullRequest: PullRequest = {
      projectId,
      repoId,
      pullRequestId: bitbucketPullRequest.id + "",
      toBranch: bitbucketPullRequest.toRef && bitbucketPullRequest.toRef.displayId,
      fromBranch: bitbucketPullRequest.fromRef && bitbucketPullRequest.fromRef.displayId,
      commit: bitbucketPullRequest.fromRef && bitbucketPullRequest.fromRef.latestCommit,
      title: bitbucketPullRequest.title,
      state: this.convertBitbucketPullRequestState(bitbucketPullRequest.state),
      version: bitbucketPullRequest.version,
      openTasks: bitbucketPullRequest.properties && bitbucketPullRequest.properties.openTaskCount,
      conflict: !(bitbucketPullRequest.properties && bitbucketPullRequest.properties.mergeResult && bitbucketPullRequest.properties.mergeResult.outcome === BitbucketMergeOutcome.CLEAN),
      type: pullRequestType,
      author: this.convertUser(bitbucketPullRequest.author),
      reviewers: bitbucketPullRequest.reviewers.map(user => this.convertUser(user)).filter(user => !!user),
      mergable: bitbucketPullRequestMerge.canMerge,
      problems: bitbucketPullRequestMerge.vetoes && bitbucketPullRequestMerge.vetoes.map(vetoe => vetoe.summaryMessage),
      links: {
        project: bitbucketPullRequest.toRef && bitbucketPullRequest.toRef.repository && bitbucketPullRequest.toRef.repository.project && bitbucketPullRequest.toRef.repository.project.links && bitbucketPullRequest.toRef.repository.project.links.self && bitbucketPullRequest.toRef.repository.project.links.self[0] && bitbucketPullRequest.toRef.repository.project.links.self[0].href,
        repo: bitbucketPullRequest.toRef && bitbucketPullRequest.toRef.repository && bitbucketPullRequest.toRef.repository.links && bitbucketPullRequest.toRef.repository.links.self && bitbucketPullRequest.toRef.repository.links.self[0] && bitbucketPullRequest.toRef.repository.links.self[0].href,
        pullRequest: bitbucketPullRequest.links && bitbucketPullRequest.links.self && bitbucketPullRequest.links.self[0] && bitbucketPullRequest.links.self[0].href
      },
      buildId: undefined,
      buildStatus: undefined,
      buildLinks: undefined
    };
    if (previousPullRequest && previousPullRequest.commit === pullRequest.commit) {
      pullRequest.buildId = previousPullRequest.buildId;
      pullRequest.buildLinks = previousPullRequest.buildLinks;
      pullRequest.buildStatus = previousPullRequest.buildStatus;
    }

    return pullRequest;
  }

  private convertUser(user: BitbucketAuthor): PullRequestReviewer {
    if (user && user.user) {
      return {
        userId: user.user.slug,
        name: user.user.displayName,
        email: user.user.emailAddress,
        status: this.convertBitbucketPullRequestReviewerStatus(user.status),
        picture: user.user.links && user.user.links.self && user.user.links.self[0] && user.user.links.self[0].href && (user.user.links.self[0].href + "/avatar.png")
      };
    }
    return undefined;
  }

}
