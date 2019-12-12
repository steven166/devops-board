import { JenkinsLinks } from "./jenkins-links.model";
import { JenkinsResult } from "./jenkins-result.model";
import { JenkinsState } from "./jenkins-state.model";
import { JenkinsChangeset } from "./jenkins-changeset.model";
import { JenkinsBranch } from "./jenkins-branch.model";

export interface JenkinsRun {

  _class: string;
  links: JenkinsLinks;
  actions: any[];
  artifactsZipFile: any;
  causeOfBlockage: any;
  causes: {
    _class: string;
    shortDescription: string;
    userId: string;
    userName: string;
  }[];
  changeSet: JenkinsChangeset[];
  description: string;
  durationInMillis: number;
  enQueueTime: string;
  endTime: string;
  estimatedDurationInMillis: string;
  id: string;
  name: string;
  organization: string;
  pipeline: string;
  replayable: boolean;
  result: JenkinsResult;
  runSummary: string;
  startTime: string;
  state: JenkinsState;
  type: string;
  branch: JenkinsBranch;
  commitId: string;
  commitUrl: string;
  pullRequest: any;

}