import { BitbucketMergeOutcome } from "./bitbucket-pull-request.model";

export interface BitbucketPullRequestMerge {

  canMerge: boolean;
  conflicted: boolean;
  outcome: BitbucketMergeOutcome;
  vetoes: {
    summaryMessage: string;
    detailedMessage: string
  }[];
}
