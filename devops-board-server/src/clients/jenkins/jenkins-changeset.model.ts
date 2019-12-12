import { JenkinsLinks } from "./jenkins-links.model";
import { JenkinsAuthor } from "./jenkins-author.model";

export interface JenkinsChangeset {

  _class: string;
  _links: JenkinsLinks;
  affectedPaths: string[];
  author: JenkinsAuthor;
  commitId: string;
  issues: any[];
  msg: string;
  timestamp: string;
  url: string;

}