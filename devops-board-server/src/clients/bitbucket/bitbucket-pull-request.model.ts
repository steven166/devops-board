import { BitbucketUser } from "./bitbucket-author.model";
import { BitbucketBranch } from "./bitbucket-branch.model";
import { BitbucketLinks } from "./bitbucket-links.model";
import { BitbucketRepo } from "./bitbucket-repo.model";

export interface BitbucketPullRequest {

  id: number;
  version: number;
  title: string;
  description: string;
  state: BitbucketPullRequestState;
  open: true;
  closed: false;
  createdDate: number;
  updatedDate: number;
  fromRef: BitbucketBranch & { repository: BitbucketRepo };
  toRef: BitbucketBranch & { repository: BitbucketRepo };
  locked: boolean;
  author: BitbucketAuthor;
  reviewers: BitbucketAuthor[];
  participants: BitbucketAuthor[];
  properties: {
    mergeResult: {
      outcome: BitbucketMergeOutcome;
      current: boolean;
    }
    resolvedTaskCount: number;
    commentCount: 14;
    openTaskCount: number;
  };
  links: BitbucketLinks;
}

export interface BitbucketAuthor {

  user: BitbucketUser;
  role: BitbucketAuthorRole;
  approved: false;
  status: BitbucketAuthorStatus;
  lastReviewedCommit: string;
}

export enum BitbucketMergeOutcome {
  CLEAN = "CLEAN",
  CONFLICTED = "CONFLICTED"
}

export enum BitbucketAuthorStatus {
  APPROVED = "APPROVED",
  UNAPPROVED = "UNAPPROVED",
  NEEDS_WORK = "NEEDS_WORK"
}

export enum BitbucketAuthorRole {
  AUTHOR = "AUTHOR",
  REVIEWER = "REVIEWER",
  PARTICIPANT = "PARTICIPANT"
}

export enum BitbucketPullRequestState {
  OPEN = "OPEN",
  MERGED = "MERGED",
  SUPERSEDED = "SUPERSEDED",
  DECLINED = "DECLINED"
}
