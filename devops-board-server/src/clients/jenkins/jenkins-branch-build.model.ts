import { JenkinsLinks } from "./jenkins-links.model";
import { JenkinsRun } from "./jenkins-run.model";
import { JenkinsBranch } from "./jenkins-branch.model";

export interface JenkinsBranchBuild {

  _class: string;
  _links: JenkinsLinks;
  actions: any[];
  displayName: string;
  estimatedDurationInMillis: number;
  fullDisplayName: string;
  fullName: string;
  latestRun: JenkinsRun;
  name: string;
  organization: string;
  parameters: any[];
  permissions: {[name: string]: boolean};
  weatherScore: number;
  branch: JenkinsBranch;
}