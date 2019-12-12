import { Buildable } from './build.model';

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

}

export enum PullRequestState {
  Open = 'Open',
  Merged = 'Merged',
  Superseded = 'Superseded',
  Declined = 'Declined'
}

export enum PullRequestType {
  Release = 'Release',
  Feature = 'Feature',
  Bugfix = 'Bugfix',
  Hotfix = 'Hotfix',
  Other = 'Other'
}

export interface PullRequestAuthor {
  userId: string;
  name: string;
  email: string;
}

export interface PullRequestReviewer extends PullRequestAuthor {
  status: PullRequestReviewerStatus;
}

export enum PullRequestReviewerStatus {
  Approved = 'Approved',
  Unapproved = 'Unapproved',
  NeedsWork = 'NeedsWork'
}
