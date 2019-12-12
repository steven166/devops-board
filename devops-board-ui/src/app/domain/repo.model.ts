import { Branch } from './branch.model';
import { PullRequest } from './pull-request.model';

export interface Repo {

  projectId: string;
  repoId: string;
  name: string;
  branches?: Branch[];
  'pull-requests'?: PullRequest[];
}
