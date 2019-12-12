import { BitbucketLinks } from "./bitbucket-links.model";

export interface BitbucketUser {

  name: string;
  emailAddress: string;
  id: number;
  displayName: string;
  active: boolean;
  slug: string;
  type: string;
  links: BitbucketLinks;
}