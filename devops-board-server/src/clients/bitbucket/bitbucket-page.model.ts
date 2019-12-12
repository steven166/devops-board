
export interface BitbucketPage<T> {

  start: number;
  nextPageStart: number;
  size: number;
  limit: number;
  isLastPage: boolean;
  values: T[];

}