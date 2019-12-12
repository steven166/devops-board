import { App, Logger, Module } from "@webscale/core";
import { json } from "body-parser";
import * as cors from "cors";
import * as express from "express";

const logger = Logger.create("@devops/web.config");

export class WebConfig implements Module {

  public readonly name: string = "web";

  public async load(app: App): Promise<void> {
    let webServer = express();
    webServer.use(json());
    webServer.use(cors());

    let port = app.config.app.server && app.config.app.server.port || 3000;
    logger.info(`Listen http server on port ${port}`);
    webServer.listen(port);
    app.attributes.webServer = webServer;
  }

}
