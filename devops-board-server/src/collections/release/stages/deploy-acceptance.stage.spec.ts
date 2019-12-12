import { Collection, CollectionFactory, InMemoryConnection, SimpleDatasource } from "@webscale/collection";
import { App, ConfigModule } from "@webscale/core";
import { BitbucketMockClient } from "../../../clients/bitbucket/bitbucket.mock.client";
import { JenkinsMockClient } from "../../../clients/jenkins/jenkins.mock.client";
import { defaultSource } from "../../../config/options";
import { Branch, BranchCollectionManager, branchCollectionOptions, BranchType } from "../../branch.collection";
import { BuildCollectionManager, BuildStatus } from "../../build.collection";
import { Project, ProjectCollectionManager, projectCollectionOptions } from "../../project.collection";
import { PullRequest, PullRequestCollectionManager, pullRequestCollectionOptions } from "../../pull-request.collection";
import { Repo, RepoCollectionManager, repoCollectionOptions } from "../../repo.collection";
import { ReleaseCollectionManager } from "../release.collection-manager";
import { Release } from "../release.model";
import { DeployAcceptanceStage } from "./deploy-acceptance.stage";
import { assert } from "chai";

describe("Deploy to Acceptance Stage", () => {

  let app: App;
  let projectsCollection: Collection<Project>;
  let reposCollection: Collection<Repo>;
  let branchesCollection: Collection<Branch>;
  let pullRequestCollection: Collection<PullRequest>;
  let releaseCollection: Collection<Release>;
  let releaseCollectionManager: ReleaseCollectionManager;
  let deployAcceptanceStage: DeployAcceptanceStage;

  beforeEach(async () => {
    app = new App();
    app.attributes = {};
    app.attributes.datasource = new SimpleDatasource("inmemory", new InMemoryConnection());
    app.attributes.bitbucketClient = new BitbucketMockClient();
    app.attributes.jenkinsClients = {
      mxts: new JenkinsMockClient()
    };
    app.load(new ConfigModule({ sources: [defaultSource()] }));
    app = await app.startup();

    let collectionFactory = new CollectionFactory("/api");
    collectionFactory.datasource = app.attributes.datasource;
    app.attributes.api = collectionFactory;

    app.attributes.projectCollectionManager = new ProjectCollectionManager().init(app);
    app.attributes.repoCollectionManager = new RepoCollectionManager().init(app);
    app.attributes.branchCollectionManager = new BranchCollectionManager().init(app);
    app.attributes.pullRequestCollectionManager = new PullRequestCollectionManager().init(app);
    app.attributes.buildCollectionManager = new BuildCollectionManager().init(app);

    releaseCollectionManager = new ReleaseCollectionManager().init(app);
    deployAcceptanceStage = new DeployAcceptanceStage().init(app);

    projectsCollection = collectionFactory.collection("projects");
    reposCollection = collectionFactory.collection("repos");
    branchesCollection = collectionFactory.collection("branches");
    pullRequestCollection = collectionFactory.collection("pull-requests");
    releaseCollection = collectionFactory.collection("releases");
  });

  afterEach(async () => {
    releaseCollectionManager.destroy();
  });

  it("Test Develop is Green", async () => {
    // Arrange
    await projectsCollection.saveItem({
      projectId: "mxts"
    });
    await reposCollection.saveItem({
      projectId: "mxts",
      repoId: "order-service"
    });
    await branchesCollection.saveItem({
      projectId: "mxts",
      repoId: "order-service",
      branchId: "develop",
      commit: "abcd",
      isDefault: true,
      type: BranchType.Develop,
      buildId: 1,
      buildStatus: BuildStatus.Succeed
    });
    let release: Release = {
      releaseId: "test1",
      name: "test1",
      repos: {
        mxts: ["order-service"]
      }
    };
    // Act
    await deployAcceptanceStage.loop(releaseCollectionManager, release);

    // Assert
    assert.deepEqual(release.status, {
      repos: [{
        projectId: "mxts",
        repoId: "order-service",
        subStage: 1,
        retried: 0,
        buildRestarted: 0
      }]
    });
  });
});
