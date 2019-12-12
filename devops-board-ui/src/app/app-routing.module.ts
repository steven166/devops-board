import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { BuildsRouteComponent } from './components/builds.route/builds.route.component';
import { ReleasesRouteComponent } from './components/releases.route/releases.route.component';
import { PullRequestsRouteComponent } from "./components/pull-requests.route/pull-requests.route.component";

const routes: Routes = [
  { path: 'builds', component: BuildsRouteComponent },
  { path: 'builds/:projectId', component: BuildsRouteComponent },
  { path: 'pull-requests', component: PullRequestsRouteComponent },
  { path: 'pull-requests/:projectId', component: PullRequestsRouteComponent },
  { path: 'releases', component: ReleasesRouteComponent },
  {
    path: '', redirectTo: '/builds', pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
