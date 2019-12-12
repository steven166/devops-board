import { Component, OnDestroy, OnInit } from '@angular/core';
import { BackendService } from '../../services/backend.service';
import { Observable, Subject } from 'rxjs';
import { Project } from '../../domain/projects.model';
import { ActivatedRoute, Router } from '@angular/router';
import { Repo } from '../../domain/repo.model';
import { DataSource } from '@angular/cdk/table';
import { MatSelectionListChange, MatTableDataSource } from '@angular/material';
import { Branch } from '../../domain/branch.model';

@Component({
  selector: 'app-builds.route',
  templateUrl: './builds.route.component.html',
  styleUrls: ['./builds.route.component.scss']
})
export class BuildsRouteComponent implements OnInit, OnDestroy {

  private refreshProjectsLoop: any;
  private refreshReposLoop: any;
  projects: Project[];
  repos: Repo[];
  branches: Branch[];
  selectedProjectId: string;

  selectedBranchType = 'Develop';
  branchTypes: string[] = ['Develop'];
  branchTypeWeight = {
    Develop: 1,
    Release: 2,
    Master: 3,
    Feature: 4,
    Bugfix: 5,
    Hotfix: 6,
    OldRelease: 7,
    Other: 8
  };

  selectedRepos = '__all';

  displayedColumns: string[] = ['projectId', 'repoId', 'branchId', 'buildStatus', 'buildLinks'];

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
    this.refreshProjectsLoop = setInterval(() => this.refreshProjects(), 100000);
    this.refreshReposLoop = setInterval(() => this.refreshRepos(), 5000);
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
      this.backendService.getRepos(this.selectedProjectId, ['branches']).subscribe(repos => {
        this.repos = repos.sort((a, b) => {
          if (a.repoId < b.repoId) {
            return -1;
          } else if (a.repoId > b.repoId) {
            return 1;
          }
          return 0;
        });
        const branchTypes = [];
        const branches: Branch[] = [];
        repos.forEach(repo => {
          if (repo.branches) {
            repo.branches.forEach(branch => {
              if (branch.type && branchTypes.indexOf(branch.type) === -1) {
                branchTypes.push(branch.type);
              }
              branches.push(branch);
            });
          }
        });
        this.branchTypes = branchTypes.sort((a, b) => {
          const aWeigth = this.branchTypeWeight[a] || 9;
          const bWeigth = this.branchTypeWeight[b] || 9;
          return aWeigth - bWeigth;
        });
        if (!this.selectedBranchType && this.branchTypes.length > 0) {
          this.selectedBranchType = branchTypes[0];
        }
        this.branches = branches;
      });
    }
  }

  filterBranches(branches: Branch[]): DataSource<Branch> {
    branches = branches.filter(branch => {
      if (!this.selectedRepos || this.selectedRepos === '__all' || this.selectedRepos === branch.repoId) {
        if (branch.type === this.selectedBranchType) {
          return true;
        }
      }
      return false;
    });

    return new MatTableDataSource(branches);
  }

  changeProject() {
    this.router.navigateByUrl('builds/' + encodeURIComponent(this.selectedProjectId));
    this.refreshRepos();
  }

  retryBuild(branch: Branch): void {
    this.backendService.retryBranchBuild(branch.projectId, branch.repoId, branch.branchId).subscribe(newBranch => {
      const existingBranch = this.branches.find(b => b.projectId === newBranch.projectId &&
        b.repoId === newBranch.repoId && b.branchId === newBranch.branchId);
      if (existingBranch) {
        existingBranch.buildStatus = newBranch.buildStatus;
        existingBranch.buildId = newBranch.buildId;
        existingBranch.buildLinks = newBranch.buildLinks;
      }
    });
  }

}
