import { BitbucketLinks } from "./bitbucket-links.model";

export interface BitbucketProject {

  key: string;
  id: number;
  name: string;
  description: string;
  public: boolean;
  type: string;
  links: BitbucketLinks;

}