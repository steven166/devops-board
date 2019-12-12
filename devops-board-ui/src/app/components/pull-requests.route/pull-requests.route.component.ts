import { Component, OnDestroy, OnInit } from '@angular/core';
import { BackendService } from '../../services/backend.service';
import { Project } from '../../domain/projects.model';
import { ActivatedRoute, Router } from '@angular/router';
import { Repo } from '../../domain/repo.model';
import { DataSource } from '@angular/cdk/table';
import { MatTableDataSource } from '@angular/material';
import { PullRequest } from '../../domain/pull-request.model';

@Component({
  selector: 'app-builds.route',
  templateUrl: './pull-requests.route.component.html',
  styleUrls: ['./pull-requests.route.component.scss']
})
export class PullRequestsRouteComponent implements OnInit, OnDestroy {

  private refreshProjectsLoop: any;
  private refreshReposLoop: any;
  projects: Project[];
  repos: Repo[];
  pullRequests: PullRequest[];
  selectedProjectId: string;

  selectedPullRequestType = 'All';
  pullRequestTypes: string[] = ['All'];
  pullRequestTypeWeight = {
    All: 1,
    Feature: 2,
    Bugfix: 3,
    Hotfix: 4,
    Other: 8
  };

  selectedRepos = '__all';

  displayedColumns: string[] = ['repoId', 'title', 'fromBranch', 'toBranch', 'mergable', 'buildStatus'];

  constructor(private backendService: BackendService, private router: Router, private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.route.paramMap.subscribe(paramMap => {
      this.selectedProjectId = paramMap.get('projectId');
      if (this.selectedProjectId) {
        this.refreshRepos();
      }
    });
    clearInterval(this.refreshProjectsLoop);
    clearInterval(this.refreshReposLoop);
    // this.refreshProjectsLoop = setInterval(() => this.refreshProjects(), 100000);
    // this.refreshReposLoop = setInterval(() => this.refreshRepos(), 5000);
    this.refreshProjects();
  }

  ngOnDestroy(): void {
    clearInterval(this.refreshProjectsLoop);
    clearInterval(this.refreshReposLoop);
  }

  refreshProjects() {
    this.backendService.getProjects().subscribe(projects => {
      this.projects = projects;
      if (!this.selectedProjectId && projects.length > 0) {
        this.selectedProjectId = projects[0].projectId;
        this.changeProject();
      }
    });
  }

  refreshRepos() {
    if (this.selectedProjectId) {
      this.backendService.getRepos(this.selectedProjectId, ['pull-requests']).subscribe(repos => {
        this.repos = repos.sort((a, b) => {
          if (a.repoId < b.repoId) {
            return -1;
          } else if (a.repoId > b.repoId) {
            return 1;
          }
          return 0;
        });
        const pullRequestTypes = ['All'];
        const pullRequests: PullRequest[] = [];
        repos.forEach(repo => {
          if (repo['pull-requests']) {
            repo['pull-requests'].forEach(pullRequest => {
              if (pullRequest.type && pullRequestTypes.indexOf(pullRequest.type) === -1) {
                pullRequestTypes.push(pullRequest.type);
              }
              pullRequests.push(pullRequest);
            });
          }
        });
        this.pullRequestTypes = pullRequestTypes.sort((a, b) => {
          const aWeigth = this.pullRequestTypeWeight[a] || 9;
          const bWeigth = this.pullRequestTypeWeight[b] || 9;
          return aWeigth - bWeigth;
        });
        if (!this.selectedPullRequestType && this.pullRequestTypes.length > 0) {
          this.selectedPullRequestType = pullRequestTypes[0];
        }
        this.pullRequests = pullRequests;
      });
    }
  }

  filterPullRequests(pullRequests: PullRequest[]): DataSource<PullRequest> {
    pullRequests = pullRequests.filter(pullRequest => {
      if (!this.selectedRepos || this.selectedRepos === '__all' || this.selectedRepos === pullRequest.repoId) {
        if (this.selectedPullRequestType === 'All' || pullRequest.type === this.selectedPullRequestType) {
          return true;
        }
      }
      return false;
    });

    return new MatTableDataSource(pullRequests);
  }

  changeProject() {
    this.router.navigateByUrl('pull-requests/' + encodeURIComponent(this.selectedProjectId));
    this.refreshRepos();
  }

  retryBuild(pullRequest: PullRequest): void {
    this.backendService.retryPullRequestBuild(pullRequest.projectId, pullRequest.repoId, pullRequest.pullRequestId).subscribe(newPullRequest => {
      const existingPullRequest = this.pullRequests.find(b => b.projectId === newPullRequest.projectId &&
        b.repoId === newPullRequest.repoId && b.pullRequestId === newPullRequest.pullRequestId);
      if (existingPullRequest) {
        existingPullRequest.buildStatus = newPullRequest.buildStatus;
        existingPullRequest.buildId = newPullRequest.buildId;
        existingPullRequest.buildLinks = newPullRequest.buildLinks;
      }
    });
  }

}
