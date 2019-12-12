import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Project } from '../domain/projects.model';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Repo } from '../domain/repo.model';
import { Branch } from '../domain/branch.model';
import { PullRequest } from "../domain/pull-request.model";

@Injectable({
  providedIn: 'root'
})
export class BackendService {

  constructor(private httpClient: HttpClient) {
  }

  public getProjects(includes?: string[]): Observable<Project[]> {
    const queryString = includes ? '?includes=' + includes.join(',') : '';
    return this.httpClient.get<Project[]>(
      `${environment.server.url}/api/v1/projects${queryString}`);
  }

  public getRepos(projectId: string, includes?: string[]): Observable<Repo[]> {
    const queryString = includes ? '?includes=' + includes.join(',') : '';
    return this.httpClient.get<Repo[]>(
      `${environment.server.url}/api/v1/projects/${encodeURIComponent(projectId)}/repos${queryString}`);
  }

  public retryBranchBuild(projectId: string, repoId: string, branchId: string): Observable<Branch> {
    return this.httpClient.post<Branch>(`${environment.server.url}/api/v1/projects/${encodeURIComponent(projectId)}/repos/${encodeURIComponent(repoId)}/branches/${encodeURIComponent(branchId)}/build`, {});
  }

  public retryPullRequestBuild(projectId: string, repoId: string, pullRequestId: string): Observable<PullRequest> {
    return this.httpClient.post<PullRequest>(`${environment.server.url}/api/v1/projects/${encodeURIComponent(projectId)}/repos/${encodeURIComponent(repoId)}/pull-requests/${encodeURIComponent(pullRequestId)}/build`, {});
  }
}
