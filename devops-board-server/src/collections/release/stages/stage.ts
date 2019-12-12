import { App } from "@webscale/core";
import { ReleaseCollectionManager } from "../release.collection-manager";
import { Release, ReleaseStages } from "../release.model";

export abstract class Stage {

  public abstract readonly stageId: ReleaseStages;

  public init(app: App): void {
    // empty implementation
  }

  public abstract loop(releaseManager: ReleaseCollectionManager, release: Release): Promise<void>;

}
