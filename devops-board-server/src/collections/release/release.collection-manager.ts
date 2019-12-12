import { Collection } from "@webscale/collection";
import { App, Logger } from "@webscale/core";
import { filter } from "rxjs/operators";
import { Branch, branchCollectionOptions } from "../branch.collection";
import { BuildStatus } from "../build.collection";
import { Project, projectCollectionOptions } from "../project.collection";
import { Repo, repoCollectionOptions } from "../repo.collection";
import { releaseCollectionOptions } from "./release.collection";
import { Release, ReleaseStage, ReleaseStageNames, ReleaseStages, ReleaseStageStatus } from "./release.model";
import { CreateReleaseStage } from "./stages/create-release.stage";
import { DeployAcceptanceStage } from "./stages/deploy-acceptance.stage";
import { InitStage } from "./stages/init.stage";
import { Stage } from "./stages/stage";

const logger = Logger.create("@devops/release.collection");

export class ReleaseCollectionManager {

  private releaseCollection: Collection<Release>;
  private projectCollection: Collection<Project>;
  private repoCollection: Collection<Repo>;
  private branchCollection: Collection<Branch>;
  private releaseLoop: any;
  private releaseStages: Stage[];

  public init(app: App): ReleaseCollectionManager {
    this.releaseCollection = app.attributes.api.collection("releases", releaseCollectionOptions);
    this.projectCollection = app.attributes.api.collection("projects", projectCollectionOptions);
    this.repoCollection = app.attributes.api.collection("repos", repoCollectionOptions);
    this.branchCollection = app.attributes.api.collection("branches", branchCollectionOptions);

    this.releaseStages = [
      new InitStage(),
      new CreateReleaseStage(),
      new DeployAcceptanceStage()
    ];

    this.releaseStages.forEach(stage => stage.init(app));

    this.releaseLoop = setInterval(() => {
      (this.releaseCollection.getAll() as any).pipe(
        filter<Release>(
          release => (!release.status || !release.status.currentStage || (release.status && release.status.currentStage < ReleaseStages.Succeed))))
        .forEach(release => {
          this.loop(release).catch(e => {
            logger.error(`Release Loop failed for ${release.releaseId}!`, e);
          });
        }).catch(e => logger.error(e));
    }, 5000);
    return this;
  }

  public destroy() {
    clearInterval(this.releaseLoop);
  }

  /**
   * Go to a next stage of the release
   * @param release
   * @param nextStage
   */
  public async nextStage(release: Release, nextStage: ReleaseStages): Promise<void> {
    if (!release.status) {
      release.status = {};
    }
    release.status.currentStage = nextStage;
    if (!release.status.stages) {
      release.status.stages = [];
    }
    // Close all stages
    release.status.stages.forEach(stage => stage.status = ReleaseStageStatus.Succeed);

    // Open new stage
    release.status.stages.push({
      stageId: nextStage,
      name: ReleaseStageNames[release.status.currentStage] || release.status.currentStage + "",
      status: ReleaseStageStatus.Running,
      retries: 0
    });

    await this.releaseCollection.saveItem(release);
    await this.log(release, `Stage: ${ReleaseStageNames[release.status.currentStage] || release.status.currentStage}`);
  }

  /**
   * Log message regarding the release
   * @param release
   * @param message
   * @param projectId
   * @param repoId
   */
  public async log(release: Release, message: string, projectId?: string, repoId?: string): Promise<void> {
    if (!release.status) {
      release.status = {};
    }
    if (!release.status.events) {
      release.status.events = [];
    }
    release.status.events.push({
      level: "Info",
      msg: message,
      time: new Date().toISOString(),
      projectId,
      repoId
    });
    this.releaseCollection.saveItem(release);
  }

  /**
   * Log warning regarding the release
   * @param release
   * @param message
   * @param projectId
   * @param repoId
   */
  public async warn(release: Release, message: string, projectId?: string, repoId?: string): Promise<void> {
    if (!release.status) {
      release.status = {};
    }
    if (!release.status.events) {
      release.status.events = [];
    }
    release.status.events.push({
      level: "Warning",
      msg: message,
      time: new Date().toISOString(),
      projectId,
      repoId
    });
    this.releaseCollection.saveItem(release);
  }

  /**
   * Fatel error during the release
   * @param release
   * @param message
   * @param projectId
   * @param repoId
   */
  public async fatal(release: Release, message: string, projectId?: string, repoId?: string): Promise<void> {
    if (!release.status) {
      release.status = {};
    }
    if (!release.status.events) {
      release.status.events = [];
    }
    release.status.events.push({
      level: "Fatal",
      msg: message,
      time: new Date().toISOString(),
      projectId,
      repoId
    });
    release.status.currentStage = ReleaseStages.Failed;
    release.status.stages
      .filter(stage => stage.status === ReleaseStageStatus.Running)
      .forEach(stage => stage.status = ReleaseStageStatus.Failed);
    this.releaseCollection.saveItem(release);
  }

  /**
   * Loop every 5 seconds through every release
   * @param release
   */
  private async loop(release: Release): Promise<void> {
    try {
      if (!release.status) {
        release.status = {};
      }
      if (!release.status.currentStage) {
        release.status.currentStage = ReleaseStages.Init;
      }
      let stage = this.releaseStages.find(stage => stage.stageId === release.status.currentStage);
      if (stage) {
        return stage.loop(this, release);
      } else {
        throw new Error(`Unknown stage: '${release.status.currentStage}'`);
      }
    } catch (e) {
      let stage = release.status.stages && release.status.stages.find(
        stage => stage.stageId === release.status.currentStage);
      if (stage) {
        stage.retries++;
        await this.releaseCollection.saveItem(release);
      }
      if (!stage || stage.retries >= 5) {
        await this.fatal(release, e.message);
        logger.error(e);
      }
    }
  }



  /**
   * Wait for the scheduleProduction time is set
   * @param release
   */
  private async scheduleProduction(release: Release): Promise<void> {
    // if (release.scheduleProduction) {
    //   // Parse date
    //   Date.parse(release.scheduleProduction);
    //   await this.nextStage(release, ReleaseStage.PrepareRelease);
    // }
  }

}
