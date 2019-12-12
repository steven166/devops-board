
export interface Buildable {

  buildId: number;
  buildStatus: BuildStatus;
  buildLinks: {
    open?: string;
    retry?: string;
  };

}

export enum BuildStatus {

  Unknown = 'Unknown',
  Pending = 'Pending',
  Progress = 'Progress',
  Succeed = 'Succeed',
  Failed = 'Failed'

}
