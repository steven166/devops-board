import { Module, App } from "@webscale/core";
import { InMemoryConnection, SimpleDatasource } from "@webscale/collection";

export class DatabaseConfig implements Module {

  public readonly name: string = "database";

  public async load(app: App): Promise<void> {
    app.attributes.datasource = new SimpleDatasource("inmemory", new InMemoryConnection());
  }

}
