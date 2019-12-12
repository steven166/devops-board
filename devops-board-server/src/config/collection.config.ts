import { CollectionFactory } from "@webscale/collection";
import { apiServer } from "@webscale/collection-express-api";
import { App, Module } from "@webscale/core";
import { BranchCollectionManager, branchCollectionOptions } from "../collections/branch.collection";
import { BuildCollectionManager } from "../collections/build.collection";
import {
  ProjectCollectionManager,
  projectCollectionOptions
} from "../collections/project.collection";
import { PullRequestCollectionManager, pullRequestCollectionOptions } from "../collections/pull-request.collection";
import { RepoCollectionManager, repoCollectionOptions } from "../collections/repo.collection";

export class CollectionConfig implements Module {

  public readonly name: string = "collection";

  public async load(app: App): Promise<void> {
    let collectionFactory = new CollectionFactory("/api");
    collectionFactory.datasource = app.attributes.datasource;

    app.attributes.api = collectionFactory;

    app.attributes.projectCollectionManager = new ProjectCollectionManager().init(app);
    app.attributes.repoCollectionManager = new RepoCollectionManager().init(app);
    app.attributes.branchCollectionManager = new BranchCollectionManager().init(app);
    app.attributes.pullRequestCollectionManager = new PullRequestCollectionManager().init(app);
    app.attributes.buildCollectionManager = new BuildCollectionManager().init(app);

    let apiServerFunc = apiServer.bind(collectionFactory);
    // console.info( app.attributes.webServer);
    let api = apiServerFunc({
      projects: {
        ...projectCollectionOptions,
        children: {
          repos: {
            ...repoCollectionOptions,
            children: {
              "branches": {
                ...branchCollectionOptions
              },
              "pull-requests": {
                ...pullRequestCollectionOptions
              }
            }
          }
        }
      }
    }, {
      apiDocs: true,
      collectionFactory,
      express: app.attributes.webServer
    });

  }

}
