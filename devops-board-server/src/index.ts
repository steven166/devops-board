import { App, ConfigModule, Logger, LoggerModule } from "@webscale/core";
import { WebConfig } from "./config/web.config";
import { CollectionConfig } from "./config/collection.config";
import { DatabaseConfig } from "./config/database.config";
import { PropertySources } from "@webscale/core/config/property-sources";
import { ClientConfig } from "./config/client.config";
import { defaultSource } from "./config/options";

const logger = Logger.create("@devops");
const app = new App();
app.attributes = {};

// Load modules
app.load(new ConfigModule({
  sources: [
    PropertySources.fromFile(process.cwd() + "/application.yml"),
    PropertySources.fromEnv()]
}));
app.load(new LoggerModule());

app.load(new DatabaseConfig());
app.load(new ClientConfig());
app.load(new WebConfig());
app.load(new CollectionConfig());

// Startup app
app.startup().then(() => {
  // Started up
}).catch(e => {
  console.error(e);
  process.exit(1);
});

