import { Collection, CollectionOptions } from "@webscale/collection";
import { App, Logger, LogLevel } from "@webscale/core";
import { JSONSchema7 } from "json-schema";
import { filter, flatMap } from "rxjs/operators";
import { BitbucketProject } from "../clients/bitbucket/bitbucket-project.model";
import { BitbucketClient } from "../clients/bitbucket/bitbucket.client";

const logger = Logger.create("@devops/projects.collection");

export interface Project {

  projectId: string;
  name?: string;
  description?: string;

}

export const projects = "projects";

export const projectCollectionOptions: CollectionOptions = {
  singularName: "project",
  readonly: true
};

export class ProjectCollectionManager {

  private bitbucketClient: BitbucketClient;
  private projectCollection: Collection<Project>;
  private scheduler: any;
  private projectWhitelist: string[] | undefined;

  public init(app: App): ProjectCollectionManager {
    this.bitbucketClient = app.attributes.bitbucketClient;
    this.projectCollection = app.attributes.api.collection("projects", projectCollectionOptions);
    this.projectWhitelist = app.config.app.bitbucket.projects || undefined;

    this.scheduler = setInterval(() => {
      logger.debug(`Refresh projects...`);
      let startTime = Date.now();
      this.refreshProjects().then(() => {
        logger.debug(`Refresh project done (${Date.now() - startTime}ms)`);
      }).catch(e => {
        logger.error(`Refresh Projects failed!`, e);
      });
    }, app.config.app.bitbucket.refreshInterval || 60000);

    setTimeout(() => {
      logger.debug(`Refresh Projects...`);
      let startTime = Date.now();
      this.refreshProjects().then(() => {
        logger.debug(`Refresh Projects done (${Date.now() - startTime}ms)`);
      }).catch(e => {
        logger.error(`Refresh Projects failed!`, e);
      });
    }, 1000);
    return this;
  }

  public destory() {
    clearInterval(this.scheduler);
  }

  public async refreshProjects(): Promise<void> {
    let done = false;
    let projectIds: string[] = [];
    for (let i = 0; i < 20; i++) {
      let projectPage = await this.bitbucketClient.getProjects({ page: i });
      if (projectPage.values) {
        for (let bitbucketProject of projectPage.values) {
          let projectId = bitbucketProject.key.toLowerCase();
          if (!this.projectWhitelist || this.projectWhitelist.indexOf(projectId) > -1) {
            projectIds.push(projectId);
            let project = await this.projectCollection.getItem({ query: { projectId } });
            if (project) {
              if (this.isProjectDiff(bitbucketProject, project)) {
                // Save updated item
                await this.projectCollection.saveItem(this.convertProject(bitbucketProject));
              }
            } else {
              // Save new item
              await this.projectCollection.saveItem(this.convertProject(bitbucketProject));
            }
          }
        }
      }
      if (!projectPage || projectPage.isLastPage) {
        done = true;
        break;
      }
    }

    // Delete remove items
    await (this.projectCollection.getAll() as any).pipe(filter((project: Project) => {
      return projectIds.indexOf(project.projectId) === -1;
    })).pipe(flatMap((project: Project) => {
      return this.projectCollection.deleteItem({ query: { projectId: project.projectId } });
    })).toPromise();

  }

  private isProjectDiff(bitbucketProject: BitbucketProject, project: Project): boolean {
    return !(bitbucketProject.key.toLowerCase() === project.projectId &&
      bitbucketProject.name === project.name &&
      bitbucketProject.description === project.description);
  }

  private convertProject(bitbucketProject: BitbucketProject): Project {
    return {
      projectId: bitbucketProject.key.toLowerCase(),
      name: bitbucketProject.name,
      description: bitbucketProject.description
    };
  }

}
