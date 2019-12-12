export interface Release {

  releaseId: string;
  name: string;
  repos: {
    [projectId: string]: string[];
  };
  excludeRepos?: {
    [projectId: string]: string[];
  };
  status?: {
    currentStage?: ReleaseStages;
    events?: ReleaseEvent[];
    stages?: ReleaseStage[];
  };
}

// tslint:disable-next-line
export const ReleaseStageNames = {

  0: "Init",
  10: "Create Release",
  20: "Deploy to Acceptance",
  30: "Schedule Production Release",
  40: "Pre Release Checks",
  50: "Deploy to Production",
  60: "Post Release",
  100: "Succeed",
  101: "Failed"
};

export interface ReleaseStage {
  stageId: ReleaseStages;
  name: string;
  status: ReleaseStageStatus;
  retries?: number;
  attributes?: { [key: string]: any };
  repos?: ReleaseRepoStatus[];
}

export enum ReleaseStageStatus {
  Pending = "Pending",
  Running = "Running",
  Failed = "Failed",
  Succeed = "Succeed"
}

export enum ReleaseStages {

  Init = 0,
  CreateRelease = 10,
  DeployAcceptance = 20,
  ScheduleProduction = 30,
  PrepareRelease = 40,
  DeployProduction = 50,
  PostReleaseChecks = 60,

  Succeed = 100,
  Failed = 101
}

export interface ReleaseRepoStatus {
  projectId: string;
  repoId: string;
  subStage: number;
  retries: number;
  buildRestarted: number;
}

export interface ReleaseEvent {

  level: "Info" | "Warning" | "Fatal";
  msg: string;
  time: string;
  projectId?: string;
  repoId?: string;
}
