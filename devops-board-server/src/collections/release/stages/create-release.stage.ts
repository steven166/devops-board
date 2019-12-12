import { ReleaseCollectionManager } from "../release.collection-manager";
import { Release, ReleaseStages } from "../release.model";
import { Stage } from "./stage";

/**
 * Create a Jira Release
 * @param release
 */
export class CreateReleaseStage extends Stage {

  public readonly stageId = ReleaseStages.CreateRelease;

  public async loop(releaseManager: ReleaseCollectionManager, release: Release): Promise<void> {

    // todo: create jira release
    return releaseManager.nextStage(release, ReleaseStages.DeployAcceptance);
  }

}
