import { BitbucketLinks } from "./bitbucket-links.model";
import { BitbucketProject } from "./bitbucket-project.model";

export interface BitbucketRepo {

  slug: string;
  id: number;
  name: string;
  scmId: boolean;
  state: string;
  statusMessage: string;
  forkable: boolean;
  project: BitbucketProject;
  public: boolean;
  links: BitbucketLinks;

}