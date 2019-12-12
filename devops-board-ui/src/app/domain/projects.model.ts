import { Repo } from './repo.model';

export interface Project {

  projectId: string;
  name: string;
  description: string;
  repos?: Repo[];
}
