import { Collection, CollectionEventType, CollectionOptions } from "@webscale/collection";
import { App, Logger, LogLevel } from "@webscale/core";
import { JSONSchema7 } from "json-schema";
import { filter, flatMap } from "rxjs/operators";
import { BitbucketRepo } from "../clients/bitbucket/bitbucket-repo.model";
import { BitbucketClient } from "../clients/bitbucket/bitbucket.client";
import { Project, projectCollectionOptions } from "./project.collection";

const logger = Logger.create("@devops/repo.collection");

export interface Repo {

  projectId: string;
  repoId: string;
  name?: string;
  links?: {
    project: string;
    repo: string;
  };

}

export const repos = "repos";

export const repoCollectionOptions: CollectionOptions = {
  singularName: "repo",
  parent: "projects",
  readonly: true
};

export class RepoCollectionManager {

  private bitbucketClient: BitbucketClient;
  private repoCollection: Collection<Repo>;
  private projectCollection: Collection<Project>;
  private scheduler: any;

  public init(app: App): RepoCollectionManager {
    this.bitbucketClient = app.attributes.bitbucketClient;
    this.repoCollection = app.attributes.api.collection("repos", repoCollectionOptions);
    this.projectCollection = app.attributes.api.collection("projects", projectCollectionOptions);

    // Scan new projects directly
    this.projectCollection.watch(CollectionEventType.CREATED).subscribe(event => {
      logger.debug(`Refresh Repos for ${event.ids.projectId}...`);
      let startTime = Date.now();
      this.refreshRepositories(event.ids.projectId).then(() => {
        logger.debug(`Refresh Repos for ${event.ids.projectId} done (${Date.now() - startTime}ms)`);
      }).catch(e => {
        logger.error(`Refresh Repos failed for ${event.ids.projectId}!`, e);
      });
    });

    this.scheduler = setInterval(() => {
      this.projectCollection.getAll().forEach(project => {
        logger.debug(`Refresh Repos for ${project.projectId}...`);
        let startTime = Date.now();
        this.refreshRepositories(project.projectId).then(() => {
          logger.debug(`Refresh Repos for ${project.projectId} done (${Date.now() - startTime}ms)`);
        }).catch(e => {
          logger.error(`Refresh Repos failed for ${project.projectId}!`, e);
        });
      });
    }, app.config.app.bitbucket.refreshInterval || 60000);
    return this;
  }

  public destory() {
    clearInterval(this.scheduler);
  }

  public async refreshRepositories(projectId: string): Promise<void> {
    let done = false;
    let repoIds: string[] = [];
    for (let i = 0; i < 20; i++) {
      let repoPage = await this.bitbucketClient.getRepositories(projectId, { page: i });
      if (repoPage && repoPage.values) {
        for (let bitbucketRepo of repoPage.values) {
          let repoId = bitbucketRepo.slug;
          repoIds.push(repoId);
          let repo = await this.repoCollection.getItem({ query: { projectId, repoId } });
          if (repo) {
            if (this.isRepoDiff(bitbucketRepo, repo)) {
              // Save updated item
              await this.repoCollection.saveItem(this.converRepo(projectId, bitbucketRepo));
            }
          } else {
            // Save new item
            await this.repoCollection.saveItem(this.converRepo(projectId, bitbucketRepo));
          }
        }
      }
      if (!repoPage || repoPage.isLastPage) {
        done = true;
        break;
      }
    }

    // Delete remove items
    await (this.repoCollection.getAll({ query: { projectId } }) as any).pipe(filter((repo: any) => {
      return repoIds.indexOf(repo.repoId) === -1;
    })).pipe(flatMap((repo: any) => {
      return this.repoCollection.deleteItem({ query: { projectId, repoId: repo.repoId } });
    })).toPromise();

  }

  private isRepoDiff(bitbucketRepo: BitbucketRepo, repo: Repo): boolean {
    return !(bitbucketRepo.slug.toLowerCase() === repo.repoId &&
      bitbucketRepo.name === repo.name);
  }

  private converRepo(projectId: string, bitbucketRepo: BitbucketRepo): Repo {
    return {
      projectId,
      repoId: bitbucketRepo.slug.toLowerCase(),
      name: bitbucketRepo.name,
      links: {
        project: bitbucketRepo.project && bitbucketRepo.project.links && bitbucketRepo.project.links.self && bitbucketRepo.project.links.self[0] && bitbucketRepo.project.links.self[0].href,
        repo: bitbucketRepo.links && bitbucketRepo.links.self && bitbucketRepo.links.self[0] && bitbucketRepo.links.self[0].href,
      }
    };
  }

}
