
export interface BitbucketLinks {

  [name: string]: BitbucketLink[];

}
export interface BitbucketLink {

  href: string;
  name?: string;

}