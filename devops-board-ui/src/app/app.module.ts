import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import {
  MatButtonModule,
  MatIconModule,
  MatListModule, MatProgressSpinnerModule,
  MatSelectModule,
  MatSidenavModule, MatSortModule,
  MatTableModule,
  MatToolbarModule, MatTooltipModule
} from '@angular/material';
import { BuildsRouteComponent } from './components/builds.route/builds.route.component';
import { ReleasesRouteComponent } from './components/releases.route/releases.route.component';
import { HttpClientModule } from '@angular/common/http';
import { BuildStatusComponent } from './components/build-status/build-status.component';
import { PullRequestsRouteComponent } from "./components/pull-requests.route/pull-requests.route.component";

@NgModule({
  declarations: [
    AppComponent,
    BuildsRouteComponent,
    PullRequestsRouteComponent,
    ReleasesRouteComponent,
    BuildStatusComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatSelectModule,
    MatTableModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatToolbarModule,
    MatButtonModule,
    MatTooltipModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
